import type { Finding } from "@/lib/data/cases";

// Phase 5.1c (ADR-T2-002) — pure presenters for a case finding's Evidence card. Extracted from
// case-detail-view so the field-selection logic is unit-tested. Track 2 now carries a scoped
// brand_relationship_finding + three code-templated boundary notes in compiled_findings_json; older
// tracks only carry a summary. Prefer the structured finding; fall back to the legacy summary.

const NOTE_FIELDS: { key: string; label: string }[] = [
  { key: "identity_scope_note", label: "Identity scope" },
  { key: "authorization_scope_note", label: "Authorization scope" },
  { key: "marketplace_eligibility_disclaimer", label: "Marketplace eligibility" },
];

// ── json-based helpers (shared by the portal Evidence tab AND the admin review view) ──
// The scoped Track 2 conclusion, or "" when absent (older tracks carry only a summary).
export function brandFindingFrom(json: Record<string, unknown> | null | undefined): string {
  return json && typeof json.brand_relationship_finding === "string" ? json.brand_relationship_finding : "";
}

// Pre-Synthesis sweep F1 (founder-approved 2026-07-14) — the per-track PURPOSE-BUILT narrative
// (Track 2 / 3 / 4; a row carries at most one). These are the decisive, positives-first,
// HARD-scanned findings the engine produces for clients; before this helper, Tracks 3/4 fell
// through to summary = raw reasoning_notes (internal, conclusion-leaning — the secondary-path
// leak class). Never fall back to reasoning here — findingText owns the legacy-summary fallback.
const NARRATIVE_FIELDS = ["brand_relationship_finding", "brand_risk_finding", "documentation_finding"] as const;
export function narrativeFrom(json: Record<string, unknown> | null | undefined): string {
  if (!json) return "";
  for (const f of NARRATIVE_FIELDS) {
    if (typeof json[f] === "string" && (json[f] as string).trim()) return json[f] as string;
  }
  return "";
}

// The Track 2 boundary notes (identity ↑ / authorization = this lane / marketplace ↓), in order,
// present only when set. Empty for tracks/rows that don't emit them.
export function boundaryNotesFrom(json: Record<string, unknown> | null | undefined): { label: string; text: string }[] {
  const j = json ?? {};
  return NOTE_FIELDS
    .map(({ key, label }) => ({ label, text: typeof j[key] === "string" ? (j[key] as string) : "" }))
    .filter((n) => n.text.trim().length > 0);
}

// ── Finding-based presenters (portal Evidence tab) ──
// H5 — compiled findings ONLY: the client Finding type no longer carries raw model output
// (ai_output_json) or internal reviewer notes (manual_notes). Verified against the one delivered
// case (Morendelli): its manual_notes were empty strings, so no rendered content changes.
export function findingText(f: Finding): { title: string; detail: string } {
  const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
  const title =
    (typeof j.title === "string" && j.title) ||
    (typeof j.heading === "string" && j.heading) ||
    f.track.replace("track_", "Dimension ");
  const detail =
    narrativeFrom(j) || // F1 — prefer the purpose-built per-track narrative (Track 2/3/4) over the legacy summary
    (typeof j.summary === "string" && j.summary) ||
    (typeof j.detail === "string" && j.detail) ||
    "";
  return { title, detail };
}

export function findingNotes(f: Finding): { label: string; text: string }[] {
  return boundaryNotesFrom(f.compiled_findings_json);
}
