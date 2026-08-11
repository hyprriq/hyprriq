import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, can } from "@/lib/auth/permissions";
import { runOperatorCase, type OperatorRunDocument } from "@/lib/data/operatorCase";
import { PLAN_CATEGORY, type PlanType } from "@/lib/constants/plans";
import { fileCountError, planAcceptsUploads, MAX_FILE_BYTES, FILE_SIZE_MESSAGE, FILE_TYPE_MESSAGE } from "@/lib/constants/uploads";
import { sniffFileType } from "@/lib/utils/fileSniff";

// ── ADMIN BATCH — "run a case" (permission: run_case). The operator-run intake path: the normal
// pipeline, no credit deducted, provenance origin='operator', audited. STRUCTURALLY separate from
// the client submit route — this is the ONLY caller of runOperatorCase.
// ⛔ STOP-2 PENDING: plan_type is an explicit per-run choice with no default until the founder
// rules operator-case tier behavior.
// ADMIN CLOSE-OUT (2026-08-11): now multipart — operators attach the client's documents under the
// SAME server-side rules as client submit (cap, zero on single_99, size, magic-byte sniff via
// fileSniff — never reimplemented). Without this, Documentation Review silently took its
// no-documents branch on every operator-run case. ──

const VALID_PLANS = Object.keys(PLAN_CATEGORY) as PlanType[];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!can(op, "run_case")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const planRaw = String(form.get("plan_type") ?? "");
  if (!planRaw || !VALID_PLANS.includes(planRaw as PlanType)) {
    return NextResponse.json({ error: "plan_type required (explicit — operator-case tier behavior pends the STOP-2 ruling)" }, { status: 400 });
  }
  const plan = planRaw as PlanType;
  let brands: string[] = [];
  try {
    const raw = JSON.parse(String(form.get("brands") ?? "[]"));
    if (Array.isArray(raw)) brands = raw.map((b) => String(b).trim()).filter(Boolean);
  } catch { /* invalid -> empty; runOperatorCase rejects empty */ }

  // ── documents: SAME rules as the client submit route (2026-08-07 upload security) — count cap,
  // $99 takes none, server-side size, magic-byte content sniff. All BEFORE the case exists. ──
  const files = form.getAll("file").filter((f): f is File => f instanceof Blob && f.size > 0);
  const countErr = fileCountError(files.length);
  if (countErr) return NextResponse.json({ error: countErr }, { status: 400 });
  if (files.length > 0 && !planAcceptsUploads(plan)) {
    return NextResponse.json({ error: "single_99 accepts no documents — Documentation Review does not run on that tier" }, { status: 400 });
  }
  const documents: OperatorRunDocument[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return NextResponse.json({ error: "file_too_large", message: FILE_SIZE_MESSAGE }, { status: 400 });
    const buffer = Buffer.from(await f.arrayBuffer());
    const sniffed = sniffFileType(new Uint8Array(buffer));
    if (!sniffed) return NextResponse.json({ error: "file_type_not_accepted", message: FILE_TYPE_MESSAGE }, { status: 400 });
    documents.push({ name: "name" in f ? String((f as File).name) : "upload", buffer, mime: sniffed.mime, kind: sniffed.kind === "pdf" ? "pdf" : "image", size: f.size });
  }

  const r = await runOperatorCase({
    operator_id: userId,
    plan_type: plan,
    vendor_name: String(form.get("vendor_name") ?? "").trim(),
    vendor_website: String(form.get("vendor_website") ?? "").trim() || null,
    brands,
    marketplace: String(form.get("marketplace") ?? "").trim() || "amazon_us",
    notes: String(form.get("notes") ?? "").trim() || null,
    client_name: String(form.get("client_name") ?? "").trim() || null,
    company_name: String(form.get("company_name") ?? "").trim() || null,
  }, documents);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.error.includes("not seeded") ? 503 : 400 });
  return NextResponse.json({ ok: true, case_id: r.case_id, case_number: r.case_number });
}
