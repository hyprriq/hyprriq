// ── VERIFIED / ASSESSED (founder-ruled 2026-08-07) — the client certainty derivation.
//
// WHY READ-SIDE: every finding_certainty WRITE site sits inside the frozen surface
// (pipeline.steps.ts ×6, categoryStep.ts ×1 — all hardcode "unknown"), so the stored column
// cannot be corrected outside a founder-run engine pass. The RULED derivation runs HERE, at
// the client-projection layer (a rendering concern, standing rule 9), over the STORED
// per-evidence certainty — which also makes already-delivered rows render correctly with no
// backfill.
//
// LOCKED derivation: a finding is VERIFIED when at least one attached piece of affirmative
// evidence carries per-evidence certainty === "verified" (the LLM-written EvidenceItem field).
// Everything else is ASSESSED. Two values only — "unknown"/"Unconfirmed" never reaches a
// client surface again.
//
// LOCKED prohibition: NEVER derive from confidence_band — it is score-derived and one of its
// values is literally named "verified" (a term collision, not a source of truth). Absence of
// verified evidence = ASSESSED; it must never read as doubt or a negative signal.

export type ClientCertainty = "verified" | "assessed";

export function deriveClientCertainty(
  evidenceItems: ReadonlyArray<{ certainty?: string | null }> | null | undefined,
): ClientCertainty {
  if (!evidenceItems || evidenceItems.length === 0) return "assessed";
  return evidenceItems.some((e) => e?.certainty === "verified") ? "verified" : "assessed";
}
