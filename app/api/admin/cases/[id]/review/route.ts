import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackByNumber } from "@/lib/constants/tracks";
import { legacyConfidenceToBand } from "@/lib/research/confidence";
import { upsertTrackResult, getCaseTrackResults } from "@/lib/data/track-results";
import { isCaseReadyForReport } from "@/lib/research/founder-review";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import type { PlanType } from "@/lib/constants/plans";

type Score = "pass" | "infer" | "flag" | "fail" | "na";
type DimInput = { index: number; score: Score; note?: string };

const VALID_VERDICTS = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"];
const CONFIDENCE_SCORE: Record<string, number> = { low: 5, medium: 10, high: 14 };
const SCORE_CERTAINTY: Record<Score, "verified" | "inferred" | "unknown"> = {
  pass: "verified",
  infer: "inferred",
  flag: "unknown",
  fail: "unknown",
  na: "unknown",
};

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { action?: "draft" | "approve"; verdict?: string; confidence?: string; dimensions?: DimInput[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const action = body.action === "approve" ? "approve" : "draft";
  const verdict = body.verdict;
  const confidence = body.confidence ?? "medium";
  const dims = Array.isArray(body.dimensions) ? body.dimensions : [];

  if (action === "approve" && (!verdict || !VALID_VERDICTS.includes(verdict))) {
    return NextResponse.json({ error: "Select a verdict before approving." }, { status: 400 });
  }

  const { data: c } = await supabaseAdmin
    .from("cases")
    .select("id, status, plan_type")
    .eq("id", id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!c.plan_type) return NextResponse.json({ error: "case_not_configured" }, { status: 409 });
  const plan = c.plan_type as PlanType;

  // 1) Persist per-dimension findings to case_track_results (ADR-G001, authoritative).
  //    Founder-entered = manual_override + 'edited'. Upsert on (case_id, track,
  //    attempt_number=1) so the orchestrator's manual_required rows become these findings.
  const band = legacyConfidenceToBand(confidence as "low" | "medium" | "high");
  for (const d of dims) {
    if (d.index < 1 || d.index > 5) continue;
    const def = trackByNumber(d.index);
    await upsertTrackResult({
      case_id: id, track: def.track, track_key: def.track_key, track_number: d.index,
      source_mode: "manual_override",
      compiled_findings_json: { score: d.score, summary: d.note ?? "" },
      confidence_band: band,
      finding_certainty: SCORE_CERTAINTY[d.score] ?? "unknown",
      founder_review_status: "edited",
      manual_review_required: false,
      manual_notes: d.note ?? null,
    });
  }

  // Build the case update.
  const update: Record<string, unknown> = {
    internal_notes: JSON.stringify({ scoring: dims, confidence, verdict, reviewed_by: userId, at: new Date().toISOString() }),
  };
  if (verdict && VALID_VERDICTS.includes(verdict)) update.verdict = verdict;
  if (confidence in CONFIDENCE_SCORE) update.confidence_score = CONFIDENCE_SCORE[confidence];

  // Mark scored dimensions complete (N/A -> skipped) so the client Overview reflects progress.
  for (const d of dims) {
    if (d.index >= 1 && d.index <= 5) {
      update[`track_${d.index}_status`] = d.score === "na" ? "skipped" : "complete";
    }
  }

  // 2) Gate delivery (ADR-G002 + banned-language). Only after findings are written.
  if (action === "approve") {
    if (!(await isCaseReadyForReport(id, plan))) {
      return NextResponse.json(
        { error: "not_ready", message: "All required tracks must be completed before delivery." },
        { status: 409 },
      );
    }
    const rows = await getCaseTrackResults(id);
    const violations = [...new Set(rows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json)))];
    if (violations.length > 0) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "case_track_results", record_id: id, action: "UPDATE",
        actor_id: userId, actor_type: "admin",
        new_value: { blocked: "banned_language", violations },
      });
      return NextResponse.json({ error: "banned_language", violations }, { status: 422 });
    }
    update.status = "delivered";
    update.delivered_at = new Date().toISOString();
  }

  const { error: caseErr } = await supabaseAdmin.from("cases").update(update).eq("id", id);
  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, delivered: action === "approve" });
}
