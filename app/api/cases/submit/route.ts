import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  brandCapForPlan,
  creditsRequired,
  PLAN_CATEGORY,
  type PlanType,
} from "@/lib/constants/plans";
import { inngest } from "@/lib/inngest/client";
import { findLegalSignals } from "@/lib/research/legalSignals";
import { sendAdminAlert } from "@/lib/email/notify";
import { fileCountError, planAcceptsUploads, MAX_FILE_BYTES, FILE_SIZE_MESSAGE, FILE_TYPE_MESSAGE } from "@/lib/constants/uploads";
import { PLAN_PRICE_LABEL } from "@/lib/constants/plans";
import { sniffFileType, type SniffedFile } from "@/lib/utils/fileSniff";
import { validateBrandAsins } from "@/lib/portal/asinIntake";
import type { TrackContextWithIntake } from "@/lib/research/intakeExtras";

const ALLOWED_MARKETPLACES = ["amazon_us", "amazon_uk", "amazon_ca", "amazon_de", "amazon_au"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const vendorName = String(form.get("vendor_name") ?? "").trim();
  const vendorWebsite = String(form.get("vendor_website") ?? "").trim() || null;
  const marketplace = String(form.get("marketplace") ?? "amazon_us");
  const notes = String(form.get("client_notes") ?? "").trim() || null;
  let brands: string[] = [];
  try {
    const raw = JSON.parse(String(form.get("brands") ?? "[]"));
    if (Array.isArray(raw)) brands = raw.map((b) => String(b).trim()).filter(Boolean);
  } catch {
    /* invalid -> empty */
  }
  // Multi-document intake (founder-ruled 2026-07-12): up to MAX_CASE_DOCUMENTS files, optional as
  // ever. The cap is validated HERE, pre-charge — never a post-charge truncation.
  const files = form.getAll("file").filter((f): f is File => f instanceof Blob && f.size > 0);

  // ---- validation ----
  const countErr = fileCountError(files.length);
  if (countErr) {
    return NextResponse.json({ error: countErr }, { status: 400 });
  }
  // ── UPLOAD SECURITY (founder-ruled 2026-08-07) — SERVER-SIDE size + content-sniffed type,
  // rejected BEFORE any storage write and BEFORE charge. The client's extension filter and
  // claimed contentType are UX, never the rule; the sniffed MIME is what storage receives. ──
  const vetted: { file: File; name: string; buffer: Buffer; sniffed: SniffedFile }[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "file_too_large", message: FILE_SIZE_MESSAGE }, { status: 400 });
    }
    const buffer = Buffer.from(await f.arrayBuffer());
    const sniffed = sniffFileType(new Uint8Array(buffer));
    if (!sniffed) {
      return NextResponse.json({ error: "file_type_not_accepted", message: FILE_TYPE_MESSAGE }, { status: 400 });
    }
    vetted.push({ file: f, name: "name" in f ? String((f as File).name) : "upload", buffer, sniffed });
  }
  if (!vendorName) {
    return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });
  }
  if (brands.length === 0) {
    return NextResponse.json({ error: "Add at least one brand." }, { status: 400 });
  }
  if (!ALLOWED_MARKETPLACES.includes(marketplace)) {
    return NextResponse.json({ error: "Invalid marketplace." }, { status: 400 });
  }

  const supa = createServerClient();
  const { data: client } = await supa
    .from("clients")
    .select("plan_type, credits_available")
    .eq("id", userId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  const plan = client.plan_type as PlanType | null;
  if (!plan) {
    return NextResponse.json(
      { error: "no_plan", message: "You need an active plan to submit research." },
      { status: 402 },
    );
  }

  // ── $99 takes no uploads (founder-ruled 2026-08-07): Documentation Review never runs on
  // single_99, so accepting files would falsely imply review. SERVER-SIDE rule (the form's
  // disabled field is presentation) — rejected pre-charge. ──
  if (files.length > 0 && !planAcceptsUploads(plan)) {
    return NextResponse.json(
      { error: "uploads_not_included", message: `Document upload is not part of the ${PLAN_PRICE_LABEL.single_99} report — document review is included from the ${PLAN_PRICE_LABEL.single_149} report up.` },
      { status: 400 },
    );
  }

  const cap = brandCapForPlan(plan);
  if (brands.length > cap) {
    return NextResponse.json(
      { error: "brand_cap", message: `Your plan allows up to ${cap} brands per credit.` },
      { status: 400 },
    );
  }
  // ── ASIN intake (tracker §1.3) — the CODE GUARD, pre-charge: one ASIN per brand, max the
  // plan brand cap, valid format, Scale-only. The form hides the field on other tiers; this
  // is the rule the form merely reflects. ──
  let brandAsins: Record<string, string> | null = null;
  try {
    const rawAsins = JSON.parse(String(form.get("brand_asins") ?? "null"));
    const check = validateBrandAsins(plan, brands, rawAsins);
    if (!check.ok) {
      return NextResponse.json({ error: check.error, message: check.message }, { status: 400 });
    }
    brandAsins = check.clean;
  } catch {
    /* invalid JSON -> treated as none provided */
  }
  const cost = creditsRequired(brands.length, plan);

  // ---- atomic credit deduction ----
  const { data: newBalance, error: deductErr } = await supa.rpc("deduct_client_credits", {
    p_client_id: userId,
    p_amount: cost,
  });
  if (deductErr) {
    return NextResponse.json({ error: deductErr.message }, { status: 500 });
  }
  if (newBalance === null) {
    return NextResponse.json(
      { error: "insufficient_credits", message: "You don't have enough credits." },
      { status: 402 },
    );
  }

  // ---- create the case ----
  const { data: created, error: caseErr } = await supa
    .from("cases")
    .insert({
      client_id: userId,
      plan_type: plan,
      plan_category: PLAN_CATEGORY[plan],
      submission_type: "full_review",
      vendor_name: vendorName,
      vendor_website: vendorWebsite,
      brands_submitted: brands,
      marketplace,
      client_notes: notes,
      credits_required: cost,
      credits_charged: cost,
      status: "pending_intake",
    })
    .select("id, case_number")
    .single();

  if (caseErr || !created) {
    // refund — credit was already spent
    await supa.rpc("refund_client_credits", { p_client_id: userId, p_amount: cost });
    return NextResponse.json(
      { error: caseErr?.message ?? "Could not create case." },
      { status: 500 },
    );
  }

  // ── ASIN persistence — SEPARATE from the insert on purpose, loud-but-non-fatal (the H2
  // OQ-2 pattern, same as persistSynthesisExtension pre-migration): the brand_asins column
  // lands with a founder-run migration; until it runs, this update fails LOUDLY in the log
  // while the submission proceeds — the ASINs still reach the pipeline via the enqueue
  // payload below, so nothing downstream is lost. ──
  if (brandAsins) {
    const { error: asinErr } = await supabaseAdmin
      .from("cases")
      .update({ brand_asins: brandAsins })
      .eq("id", created.id);
    if (asinErr) {
      console.error("[submit] brand_asins persist failed (migration pending?):", asinErr.message, { case_id: created.id });
    }
  }

  // ---- TRIGGER 9 (BL fix gate, BL3 founder-ruled): legal/IP-notice detection in CLIENT INPUT.
  // FLAG, NEVER BLOCK — the client must never be prevented from disclosing something important;
  // the submission proceeds unconditionally. A hit alerts the admin inbox (non-fatal, key-safe);
  // the review page re-derives the same scan at render (zero storage, no stale flag). ----
  const legalSignals = findLegalSignals(notes);
  if (legalSignals.length > 0) {
    try {
      await sendAdminAlert(
        `legal signal in client notes — case ${created.case_number}`,
        `<p>Trigger 9: the client's notes on case ${created.case_number} mention: ${legalSignals.join(", ")}. Review before research reaches conclusions.</p>`,
      );
    } catch { /* the alert is a pager, never a gate — submission continues regardless */ }
  }

  // ---- optional file uploads (non-fatal, per file; count/size/type all vetted pre-charge) ----
  for (const [idx, v] of vetted.entries()) {
    try {
      // idx in the path keeps same-millisecond uploads collision-free. contentType is the
      // SNIFFED mime — never the client-claimed one (upload security, 2026-08-07).
      const path = `${userId}/${created.id}/${Date.now()}-${idx}-${v.name}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("case-documents")
        .upload(path, v.buffer, { contentType: v.sniffed.mime });
      if (!upErr) {
        await supabaseAdmin.from("uploaded_files").insert({
          case_id: created.id,
          client_id: userId,
          file_name: v.name,
          file_type: v.sniffed.kind === "pdf" ? "invoice_pdf" : "invoice_image",
          storage_path: path,
          file_size_bytes: v.file.size,
        });
      }
    } catch {
      // each file upload is best-effort; the case is already created and charged.
    }
  }

  // ---- enqueue the durable Intelligence-OS pipeline (Inngest) ----
  // Credits are deducted + the case exists, so we respond immediately; research runs as a durable
  // Inngest workflow (pipeline/run-case) outside this request — not bound by the serverless 60s cap.
  // H2 — an enqueue failure is told to the client TRUTHFULLY: credit refunded, case marked
  // submission_failed (excluded from the client's case list), audit-logged. Pre-H2 this returned
  // ok:true and left a charged case wedged in pending_intake.
  try {
    // Typed as TrackContextWithIntake: brand_asins rides the payload into pipelineHandler's
    // `...event.data` spread (frozen contracts.ts untouched — see lib/research/intakeExtras.ts).
    const payload: TrackContextWithIntake = {
      case_id: created.id,
      vendor_name: vendorName,
      vendor_website: vendorWebsite,
      brands_submitted: brands,
      marketplace,
      plan_type: plan,
      ...(brandAsins ? { brand_asins: brandAsins } : {}),
    };
    await inngest.send({ name: "pipeline/run-case", data: payload });
  } catch (e) {
    console.error("[submit] inngest enqueue failed:", e, { case_id: created.id });
    await supa.rpc("refund_client_credits", { p_client_id: userId, p_amount: cost });
    await supabaseAdmin.from("cases").update({ status: "submission_failed" }).eq("id", created.id);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: created.id, action: "UPDATE",
      actor_id: "system", actor_type: "system",
      new_value: { submission_failed: true, credit_refunded: cost, error: e instanceof Error ? e.message : "enqueue failed" },
    });
    return NextResponse.json(
      { error: "enqueue_failed", message: "Submission could not start — your credit was refunded. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    case_id: created.id,
    case_number: created.case_number,
    credits_charged: cost,
    remaining_balance: newBalance,
  });
}
