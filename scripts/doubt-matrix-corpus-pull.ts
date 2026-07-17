/**
 * Doubt-matrix corpus pull (founder matrix-fill material, 2026-07-17) — READ-ONLY.
 * One row per stored (case, attempt) pair, raw axis inputs from the frozen records ONLY:
 *   AXIS 1: corroboration-gate rejection count (weight_validation, gate="corroboration")
 *           + accepted evidence items at certainty "verified" (M3 does not exist yet, so
 *           `unresolved` cannot be counted — accepted-verified is the honest proxy for S).
 *   AXIS 2 (OQ-S1 (a) inputs): track_3 signal + enforcement-class keys present ·
 *           validated veto-grade keys present (derived from weights, not remembered) ·
 *           brands at issue (cases.brands_submitted).
 * Zero writes, zero API calls. Missing field → "not stored". Nothing estimated, nothing
 * grouped, no thresholds — the founder places his own cases.
 *
 * Run (read-only): npx tsx --env-file=.env.local scripts/doubt-matrix-corpus-pull.ts
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { weightFor, weightKeysForTrack } from "@/lib/research/weights";
import type { TrackKey } from "@/lib/constants/tracks";
import type { EvidenceItem, WeightValidation } from "@/lib/research/contracts";

const SCORING_TRACKS: TrackKey[] = ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review"];
const VETO_KEYS = new Set(SCORING_TRACKS.flatMap((t) => weightKeysForTrack(t).filter((k) => weightFor(t, k)?.hard_fail)));
const ENFORCEMENT_KEYS = ["no_enforcement_found", "brand_enforcement_signals", "keepa_enforcement_cliff", "active_ip_complaints", "confirmed_amazon_restrictions", "cease_and_desist_distributed"];

type TrackRow = {
  case_id: string; attempt_number: number | null; track_key: string; track_number: number;
  track_verdict_signal: string | null; evidence_items: EvidenceItem[] | null;
  weight_validation: WeightValidation[] | null;
};
type CaseRow = {
  id: string; case_number: string | null; vendor_name: string | null; verdict: string | null;
  status: string | null; delivered_attempt: number | null; brands_submitted: string[] | null;
};

async function main() {
  const { data: cases, error: cErr } = await supabaseAdmin.from("cases")
    .select("id, case_number, vendor_name, verdict, status, delivered_attempt, brands_submitted");
  if (cErr) { console.error(`cases read failed: ${cErr.message}`); process.exit(1); }
  const { data: tracks, error: tErr } = await supabaseAdmin.from("case_track_results")
    .select("case_id, attempt_number, track_key, track_number, track_verdict_signal, evidence_items, weight_validation")
    .is("deleted_at", null);
  if (tErr) { console.error(`track rows read failed: ${tErr.message}`); process.exit(1); }

  const caseById = new Map((cases as CaseRow[]).map((c) => [c.id, c]));
  const byAttempt = new Map<string, TrackRow[]>();
  for (const r of (tracks as TrackRow[])) {
    const key = `${r.case_id}#${r.attempt_number ?? 1}`;
    if (!byAttempt.has(key)) byAttempt.set(key, []);
    byAttempt.get(key)!.push(r);
  }

  const rows: string[][] = [];
  const sortedKeys = [...byAttempt.keys()].sort((a, b) => {
    const [ca, aa] = a.split("#"); const [cb, ab] = b.split("#");
    const na = caseById.get(ca)?.case_number ?? ""; const nb = caseById.get(cb)?.case_number ?? "";
    return na === nb ? Number(aa) - Number(ab) : na.localeCompare(nb);
  });

  for (const key of sortedKeys) {
    const [caseId, attemptStr] = key.split("#");
    const attempt = Number(attemptStr);
    const c = caseById.get(caseId);
    const trs = byAttempt.get(key)!.filter((r) => r.track_number >= 1 && r.track_number <= 4);
    if (!trs.length) continue;

    // Stored verdict: per-attempt verdicts are NOT stored — cases.verdict belongs to the
    // delivered attempt (delivered cases) or the latest attempt (live pointer semantics).
    const latest = Math.max(...(byAttempt.keys() ? [...byAttempt.keys()] : [])
      .filter((k) => k.startsWith(`${caseId}#`)).map((k) => Number(k.split("#")[1])));
    const verdictAttempt = c?.delivered_attempt ?? latest;
    const verdict = attempt === verdictAttempt ? `${c?.verdict ?? "not stored"}${c?.delivered_attempt ? " (delivered)" : " (live ptr)"}` : "not stored (per-attempt verdicts are not persisted)";

    // AXIS 1
    const withVal = trs.filter((r) => Array.isArray(r.weight_validation));
    const corroRejections = withVal.flatMap((r) => r.weight_validation!).filter((v) => v.gate === "corroboration").length;
    const rejStr = withVal.length === 0 ? "not stored" : `${corroRejections}${withVal.length < trs.length ? ` (${trs.length - withVal.length}/${trs.length} tracks w/o stored validation)` : ""}`;
    const verified = trs.flatMap((r) => r.evidence_items ?? []).filter((e) => e.certainty === "verified").length;

    // AXIS 2
    const t3 = trs.find((r) => r.track_key === "brand_risk_assessment");
    const t3Keys = (t3?.evidence_items ?? []).map((e) => e.weight_key).filter(Boolean) as string[];
    const t3Enf = ENFORCEMENT_KEYS.filter((k) => t3Keys.includes(k));
    const t3Str = t3 ? `${t3.track_verdict_signal ?? "not stored"}${t3Enf.length ? ` [${t3Enf.join(", ")}]` : " [no enforcement-class keys]"}` : "not stored (track_3 not run)";
    const vetoes = [...new Set(trs.flatMap((r) => r.evidence_items ?? []).map((e) => e.weight_key).filter((k): k is string => !!k && VETO_KEYS.has(k)))];
    const brands = c?.brands_submitted ?? null;
    const brandsStr = brands === null ? "not stored" : `${brands.length}${brands.length ? ` (${brands.join(", ")})` : ""}`;

    rows.push([
      c?.case_number ?? caseId.slice(0, 8), String(attempt), c?.vendor_name ?? "not stored", verdict,
      rejStr, String(verified), t3Str, vetoes.length ? vetoes.join(", ") : "none", brandsStr,
    ]);
  }

  const header = ["case", "att", "vendor", "stored verdict", "A1: corro-gate rejections", "A1: accepted verified (S proxy)", "A2: track_3 signal [enforcement keys]", "A2: veto-grade keys validated", "A2: brands at issue"];
  console.log(`| ${header.join(" | ")} |`);
  console.log(`|${header.map(() => "---").join("|")}|`);
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
  console.log(`\n${rows.length} attempt rows. READ-ONLY — nothing written.`);
  console.log(`Veto-grade key set (derived from weights at run time): ${[...VETO_KEYS].join(", ")}`);
}
main();
