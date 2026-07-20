import type { IosVersion } from "@/lib/research/contracts";

// Intelligence Operating System version vector (enhancements #5/#6). Every case_synthesis row
// stores this so reports are replayable: "Produced by HyprrIQ IOS v0.1". Bump as the engine evolves.
export const IOS = {
  prompt_version: "0.0.0",
  rubric_version: "0.0.0",
  // S-1 FREEZE (S-1f Step 4): the synthesis engine ships. Leaves the inert "0.0.0" placeholder —
  // the FORWARD pins in rerun-batch.ts and dispute-rerun.ts move in this SAME commit (S-2 law).
  synthesis_version: "g005-1.0.0",
  corpus_version: "0.0.0",
  configuration_version: "0.0.0",
  ios_version: "HyprrIQ IOS v0.1-skeleton",
} as const;

export function assembleIosVersion(
  evidence_hash: string,
  model_provider: string,
  model_version: string,
): IosVersion {
  return { ...IOS, evidence_hash, model_provider, model_version };
}
