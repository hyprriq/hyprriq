import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Score = "pass" | "infer" | "flag" | "fail" | "na";
type DimInput = { index: number; score: Score; note?: string };

const VALID_VERDICTS = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"];
const CONFIDENCE_SCORE: Record<string, number> = { low: 5, medium: 10, high: 14 };
const CONFIDENCE_ENUM: Record<string, "low" | "moderate" | "high"> = { low: "low", medium: "moderate", high: "high" };
const SCORE_CERTAINTY: Record<Score, "verified" | "inferred" | "unknown"> = {
  pass: "verified",
  infer: "inferred",
  flag: "unknown",
  fail: "unknown",
  na: "unknown",
};

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("is_admin").eq("id", userId).maybeSingle();
  return !!data?.is_admin;
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
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

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

  if (action === "approve") {
    update.status = "delivered";
    update.delivered_at = new Date().toISOString();
  }

  const { error: caseErr } = await supabaseAdmin.from("cases").update(update).eq("id", id);
  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 });

  // Persist per-dimension findings (manual_override) so the client Evidence tab
  // populates. Replace any prior manual findings for idempotent re-review.
  if (dims.length > 0) {
    await supabaseAdmin.from("research_findings").delete().eq("case_id", id).eq("source_mode", "manual_override");
    const rows = dims
      .filter((d) => d.index >= 1 && d.index <= 5)
      .map((d) => ({
        case_id: id,
        track: `track_${d.index}`,
        source_mode: "manual_override" as const,
        finding_certainty: SCORE_CERTAINTY[d.score] ?? "unknown",
        confidence: CONFIDENCE_ENUM[confidence] ?? "moderate",
        manual_notes: d.note ?? null,
        compiled_findings_json: { score: d.score, summary: d.note ?? "" },
      }));
    if (rows.length > 0) await supabaseAdmin.from("research_findings").insert(rows);
  }

  return NextResponse.json({ ok: true, delivered: action === "approve" });
}
