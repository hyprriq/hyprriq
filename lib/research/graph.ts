import type { NormalizedEvidence } from "@/lib/research/contracts";

// Layer 2.5 — Evidence / Knowledge Graph (RESERVED SEAM). Sits between Normalization and
// Intelligence. A future IOS version introduces relationship-aware reasoning here (entity
// resolution, vendor↔brand links, cross-case patterns) WITHOUT touching the Intelligence
// layer. Today it is a strict identity passthrough — every pipeline run goes through this
// hook so the graph can be added later as a pure enrichment with no downstream changes.
export function enrichWithGraph(evidence: NormalizedEvidence): NormalizedEvidence {
  // Future: attach graph relationships / entity resolution / historical-pattern links.
  return evidence;
}
