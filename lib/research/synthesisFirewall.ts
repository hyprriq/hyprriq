import type { SynthesisOutput } from "@/lib/research/contracts";

// ── S-0 — THE SYNTHESIS→VERDICT FIREWALL (founder-signed 2026-07-16; SO-S0-1..4). ──
// An LLM narrative can never reach the verdict uncertified. This is the ONLY door between
// Layer 3 (adaptive reasoning) and Layer 4 (deterministic judgment): every entry into the frozen
// computeVerdict receives certify(...).synthesis, never a raw synthesis object — applied at ALL
// sites (pipeline stageVerdict, admin buildVerdictViewModel, scripts/rejudge-case.ts, and the
// composition upstream of applyDocumentationNoOverride's recompute) — the ceiling pattern: one
// shared function at every site, or it doesn't ship. computeVerdict itself stays byte-identical.
//
// WHAT CERTIFICATION IS (all code, no trust):
// - The verdict input is REBUILT, not filtered: certified module_4 records carrying ONLY the two
//   fields the frozen engine reads ({risk_level, is_load_bearing}); every other module EMPTY.
//   Poisoned narratives, unknown fields, and prototype junk cannot ride along by construction.
// - Enum law (SO-S0-3): risk_level ∈ {low|medium|high|critical}; anything else clamps DOWN to
//   "low" + audit. Clamping is downward-only — certification can never escalate.
// - THE SPLIT (SO-S0-2 — the two conditions are deliberately NOT the same test):
//     · critical (locks do_not_rely): both assertion sides resolve evidence_ids to real Module-1
//       items, the resolving items span ≥2 DISTINCT tracks, and ≥1 resolving item is certainty
//       "verified". Fails → clamp "high" + audit. (Devastating single-track findings already
//       reach do_not_rely via track-level pure vetoes, certified at the right layer.)
//     · is_load_bearing (floors VBP at ≥2): both sides resolve evidence_ids — ONLY. No track-
//       diversity bar, no verified bar. Fails → coerce false + audit. A single-track
//       contradiction still counts as load-bearing and still floors.
// - THE m4c ORIGIN CAP (SO-S0-3 HARD RULE): a record merged from Track 5 (origin "track5_m4c")
//   can NEVER mint critical or is_load_bearing:true by copy-through — Track 5 is non-voting
//   (AT-B1) and the merge is the exact act that could un-freeze it. BOTH certified fields carry
//   the cap; m4c "high" stays exactly "high", never upward.
// - SO-S0-4 (freeze condition, tracker-recorded verbatim): module_7 doubt is structurally locked
//   out of the verdict — the rebuilt input carries an empty doubt object, always. Any future
//   doubt-as-verdict-input is its own founder-gated spec with its own certification. Never a
//   rider. Never a follow-on commit.

export const SYNTHESIS_CERT_VERSION = "s0-1.0.0";

const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);

export interface CertificationAudit {
  record_index: number;
  field: "risk_level" | "is_load_bearing" | "module_4_shape";
  from: string;
  to: string;
  reason: string;
}

export interface CertifiedSynthesisResult {
  synthesis: SynthesisOutput; // the verdict input: certified module_4 only, all else EMPTY
  audits: CertificationAudit[];
}

interface M1Ref { source_track: string | null; certainty: string | null }

function indexModule1(raw: unknown): Map<string, M1Ref> {
  const idx = new Map<string, M1Ref>();
  if (!Array.isArray(raw)) return idx;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.evidence_id !== "string" || !o.evidence_id) continue;
    idx.set(o.evidence_id, {
      source_track: typeof o.source_track === "string" ? o.source_track : null,
      certainty: typeof o.certainty === "string" ? o.certainty : null,
    });
  }
  return idx;
}

function citedIds(side: unknown): string[] {
  if (!side || typeof side !== "object") return [];
  const ids = (side as Record<string, unknown>).evidence_ids;
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
}

const emptyVerdictInput = (): SynthesisOutput => ({
  module_1_normalized_evidence: [],
  module_2_claim_attributions: [],
  module_3_assertions: [],
  module_4_contradictions: [],
  module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [],
  module_7_doubt_calibration: { doubt_level: "", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
});

export function certifySynthesisForVerdict(raw: SynthesisOutput | null | undefined): CertifiedSynthesisResult {
  const audits: CertificationAudit[] = [];
  const out = emptyVerdictInput();
  const source = (raw ?? {}) as Partial<SynthesisOutput>;

  const rawRecords: unknown = source.module_4_contradictions;
  if (rawRecords != null && !Array.isArray(rawRecords)) {
    audits.push({ record_index: -1, field: "module_4_shape", from: typeof rawRecords, to: "[]", reason: "module_4_contradictions was not an array" });
    return { synthesis: out, audits };
  }

  const m1 = indexModule1(source.module_1_normalized_evidence);

  (rawRecords as unknown[] | undefined)?.forEach((rec, i) => {
    if (!rec || typeof rec !== "object") {
      audits.push({ record_index: i, field: "module_4_shape", from: String(rec), to: "(dropped)", reason: "record was not an object" });
      return;
    }
    const r = rec as Record<string, unknown>;
    const isTrack5 = r.origin === "track5_m4c";

    // ── risk_level: enum law, then structural earning, then the origin cap. Downward only. ──
    let risk = typeof r.risk_level === "string" && RISK_LEVELS.has(r.risk_level) ? r.risk_level : null;
    if (risk === null) {
      audits.push({ record_index: i, field: "risk_level", from: String(r.risk_level), to: "low", reason: "uncertified risk_level (not in the enum)" });
      risk = "low";
    }

    const aIds = citedIds(r.assertion_a);
    const bIds = citedIds(r.assertion_b);
    const aResolved = aIds.filter((id) => m1.has(id));
    const bResolved = bIds.filter((id) => m1.has(id));
    const sidesResolve = aResolved.length > 0 && bResolved.length > 0;
    const resolvedRefs = [...aResolved, ...bResolved].map((id) => m1.get(id) as M1Ref);
    const distinctTracks = new Set(resolvedRefs.map((x) => x.source_track).filter((t): t is string => !!t)).size;
    const anyVerified = resolvedRefs.some((x) => x.certainty === "verified");

    if (risk === "critical") {
      if (isTrack5) {
        audits.push({ record_index: i, field: "risk_level", from: "critical", to: "high", reason: "track5_m4c origin cap — a merged Track 5 record can never carry critical (non-voting preserved through the merge)" });
        risk = "high";
      } else if (!(sidesResolve && distinctTracks >= 2 && anyVerified)) {
        audits.push({ record_index: i, field: "risk_level", from: "critical", to: "high", reason: "critical not structurally earned (requires resolving evidence_ids on both sides + ≥2 distinct tracks + ≥1 verified item)" });
        risk = "high";
      }
    }

    // ── is_load_bearing: resolving ids ONLY (the SPLIT — no diversity bar), plus the origin cap. ──
    let loadBearing = r.is_load_bearing === true;
    if (r.is_load_bearing != null && typeof r.is_load_bearing !== "boolean") {
      audits.push({ record_index: i, field: "is_load_bearing", from: String(r.is_load_bearing), to: "false", reason: "non-boolean is_load_bearing" });
      loadBearing = false;
    }
    if (loadBearing && isTrack5) {
      audits.push({ record_index: i, field: "is_load_bearing", from: "true", to: "false", reason: "track5_m4c origin cap — a merged Track 5 record can never be load-bearing by copy-through" });
      loadBearing = false;
    } else if (loadBearing && !sidesResolve) {
      audits.push({ record_index: i, field: "is_load_bearing", from: "true", to: "false", reason: "load-bearing not structurally earned (requires resolving evidence_ids on both sides)" });
      loadBearing = false;
    }

    // The certified record carries ONLY what the frozen engine reads — nothing else can ride.
    out.module_4_contradictions.push({ is_load_bearing: loadBearing, risk_level: risk });
  });

  return { synthesis: out, audits };
}
