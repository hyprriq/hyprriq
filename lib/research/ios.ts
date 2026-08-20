import type { IosVersion } from "@/lib/research/contracts";

// Intelligence Operating System version vector (enhancements #5/#6). Every case_synthesis row
// stores this so reports are replayable: "Produced by HyprrIQ IOS v0.1". Bump as the engine evolves.
export const IOS = {
  // ENGINE-PROSE PASS (founder-ruled 2026-08-17): the confirms→supports vocabulary rule landed in
  // Tracks 2/3/4 + synthesis Call C, so prompt_version leaves the inert "0.0.0" placeholder. The
  // ios_version below moves in the SAME edit — it is the memoization key
  // (getSynthesisByEvidenceHash matches on it), so stored synthesis from the OLD prompts can never
  // be reused under the new ones. p001 = the first prompt-version bump.
  // client_summary PASS (founder-ruled 2026-08-19): the four finding tracks now return a
  // client-facing field and `compiled_findings_json.summary` is written FROM IT rather than from
  // reasoning_notes. That changes what a client reads on every new attempt, so it is a prompt
  // version bump — p002. The ios_version below moves in the SAME edit for the same reason as p001:
  // it is the memoization key (getSynthesisByEvidenceHash matches on it), so synthesis stored
  // under the OLD prompts can never be reused under the new ones.
  // WORD-RULE HARDENING (2026-08-20, measured on AWI-2608-039 attempt 2 — the first p002 run to
  // reach the publish gate): 'Amazon approved/approval' and corroboration vocabulary banned by
  // word, in every client-readable field, across Call C and the shared track surface rule. The
  // ios_version moves in the SAME edit (memoization key — old-prompt synthesis never reused).
  // RESOLVED BRANDS (founder-ruled 2026-08-20): Track 3 emits { submitted, resolved } per brand
  // token → cases.brands_confirmed → the PDF cover. Changes what a client reads → prompt bump;
  // ios moves in the same edit, as always.
  prompt_version: "p002-1.2.0",
  rubric_version: "0.0.0",
  // S-1 FREEZE (S-1f Step 4): the synthesis engine ships. Leaves the inert "0.0.0" placeholder —
  // the FORWARD pins in rerun-batch.ts and dispute-rerun.ts move in this SAME commit (S-2 law).
  synthesis_version: "g005-1.0.0",
  corpus_version: "0.0.0",
  configuration_version: "0.0.0",
  ios_version: "HyprrIQ IOS v0.3.2-resolved-brands",
} as const;

export function assembleIosVersion(
  evidence_hash: string,
  model_provider: string,
  model_version: string,
): IosVersion {
  return { ...IOS, evidence_hash, model_provider, model_version };
}
