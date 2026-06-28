import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  brandCapForPlan,
  creditsRequired,
  PLAN_CATEGORY,
  type PlanType,
} from "@/lib/constants/plans";
import { runPipeline } from "@/lib/research/pipeline";

// The pipeline runs in the background via after() (below) so the client can redirect to
// the case page immediately instead of blocking on real Layer-1 research (WHOIS/Serper/LLM).
// 60s covers the current track set; raise as Tracks 2–5 make real external calls.
export const maxDuration = 60;

const ALLOWED_MARKETPLACES = ["amazon_us", "amazon_uk", "amazon_ca", "amazon_de", "amazon_au"];

function fileType(name: string): "invoice_pdf" | "invoice_image" | "other" {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf") return "invoice_pdf";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "invoice_image";
  return "other";
}

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
  const file = form.get("file");

  // ---- validation ----
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

  const cap = brandCapForPlan(plan);
  if (brands.length > cap) {
    return NextResponse.json(
      { error: "brand_cap", message: `Your plan allows up to ${cap} brands per credit.` },
      { status: 400 },
    );
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

  // ---- optional file upload (non-fatal) ----
  if (file && file instanceof Blob && file.size > 0) {
    try {
      const name = "name" in file ? String((file as File).name) : "upload";
      const path = `${userId}/${created.id}/${Date.now()}-${name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from("case-documents")
        .upload(path, buffer, { contentType: file.type || "application/octet-stream" });
      if (!upErr) {
        await supabaseAdmin.from("uploaded_files").insert({
          case_id: created.id,
          client_id: userId,
          file_name: name,
          file_type: fileType(name),
          storage_path: path,
          file_size_bytes: file.size,
        });
      }
    } catch {
      // file upload is best-effort; the case is already created and charged.
    }
  }

  // ---- run the Intelligence-OS pipeline in the BACKGROUND (after the response) ----
  // The case + charge already exist, so we respond immediately and let the client redirect to
  // the case page (which shows research-in-progress). after() keeps the function alive via
  // waitUntil until the pipeline finishes — decoupled from the request so real Layer-1 calls
  // (WHOIS/Serper/LLM) never block the redirect. Non-fatal + logged; Inngest durabilizes this later.
  after(async () => {
    try {
      const result = await runPipeline({
        case_id: created.id,
        vendor_name: vendorName,
        vendor_website: vendorWebsite,
        brands_submitted: brands,
        marketplace,
        plan_type: plan,
      });
      if (result.error) console.error("[submit] pipeline error:", result.error, { case_id: created.id });
    } catch (e) {
      console.error("[submit] pipeline threw:", e, { case_id: created.id });
    }
  });

  return NextResponse.json({
    ok: true,
    case_id: created.id,
    case_number: created.case_number,
    credits_charged: cost,
    remaining_balance: newBalance,
  });
}
