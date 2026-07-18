import type { WidenedM1Record } from "@/lib/research/contracts";

// ── S-1c — Call A prompt + pinned schema + tolerant parser (the trackN.prompt.ts / H7 pattern).
// ONE call emits BOTH modules (the ruled four-call staging, SO-S1-2); M2 and M3 are then each
// code-certified in synthesisCallA.ts. The prompt PROPOSES; code decides the load-bearing fields.
// A7 (code half): the evidence is presented in a CANONICAL order (source_track, then evidence_id)
// so the prompt is byte-identical regardless of input order — position bias cannot vary between
// runs over the same frozen record (the live-order half rides the AT board). ──

export const CALL_A_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["claim_attributions", "assertions"],
  properties: {
    claim_attributions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidence_id", "claim", "claim_attributed_to", "attributed_party_benefits", "corroboration", "weight"],
        properties: {
          evidence_id: { type: "string" },
          claim: { type: "string" },
          claim_attributed_to: { type: "string" },
          attributed_party_benefits: { type: "boolean" },
          corroboration: { type: "string", enum: ["independent", "cross_source", "none_found"] },
          weight: { type: "string", enum: ["standalone", "low_until_corroborated"] },
        },
      },
    },
    assertions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["assertion_id", "assertion", "brand", "status", "supporting_evidence", "contradicting_evidence", "confidence"],
        properties: {
          assertion_id: { type: "string" },
          assertion: { type: "string" },
          brand: { type: "string" },
          status: { type: "string", enum: ["supported", "refuted", "unresolved"] },
          supporting_evidence: { type: "array", items: { type: "string" } },
          contradicting_evidence: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
  },
} as const;

const canonical = <T>(rows: T[], key: (r: T) => string): T[] => [...rows].sort((a, b) => key(a).localeCompare(key(b)));

export function buildCallAPrompt(record: WidenedM1Record, roster: string[]): { system: string; user: string } {
  const system = [
    "You are the claim-attribution and assertion layer of a vendor due-diligence reasoning engine (a PRE-PURCHASE tool).",
    "FIXED METHOD, two moves over the frozen evidence record — never invent evidence, never re-research:",
    "MOVE 1 — CLAIM ATTRIBUTION (M2): for each claim-bearing evidence item — who made the claim, whether the",
    "attributed party benefits from it being believed, and its corroboration status ACROSS the record.",
    "MOVE 2 — ASSERTIONS (M3): testable assertions about the vendor/brand relationships the record supports,",
    "each citing the evidence item ids that support or contradict it, with status and confidence.",
    "REJECTED CLAIMS: items listed under REJECTED were refused by the platform's validation layer — they are",
    "context about what was CLAIMED, never usable support. You may attribute them (Move 1); never cite them as",
    "supporting_evidence (Move 2). The platform enforces both — you PROPOSE; the platform validates and decides.",
    "BRAND SCOPE: every assertion carries `brand` = exactly one submitted brand it concerns, or \"\" for a",
    "genuinely vendor-level assertion. Never generalize one brand's finding to another; never write a brand",
    "that is not in the submitted list.",
    "LANGUAGE: attribute every claim to its source; absence of evidence is never evidence of wrongdoing.",
    "Return STRICT JSON: { claim_attributions: [{ evidence_id, claim, claim_attributed_to,",
    "attributed_party_benefits, corroboration, weight }], assertions: [{ assertion_id, assertion, brand,",
    "status, supporting_evidence, contradicting_evidence, confidence }] }.",
  ].join("\n");

  const accepted = canonical(record.accepted.items, (i) => `${i.source_track}|${i.evidence_id}`)
    .map((i) => `- [${i.evidence_id}] (${i.source_track}, ${i.certainty}, ${i.source_type}) ${i.statement}`);
  const rejected = canonical(record.extension.rejected_with_gate, (r) => `${r.source_track}|${r.evidence_id}`)
    .map((r) => `- [${r.evidence_id}] (${r.source_track}) proposed ${r.proposed_weight_key} — REJECTED${r.tag ? ` (${r.tag})` : ""}`);
  const unknowns = canonical(record.extension.unknowns, (u) => `${u.source_track}|${u.unknown}`)
    .map((u) => `- (${u.source_track}) ${u.unknown}`);

  const user = [
    `Submitted brands (the ONLY valid values for \`brand\`, plus "" for vendor-level): ${roster.length ? roster.join(", ") : "(none)"}`,
    "",
    "ACCEPTED EVIDENCE (the record; cite these ids):",
    ...(accepted.length ? accepted : ["(none)"]),
    "",
    "REJECTED CLAIMS (attribution context ONLY — never citable support):",
    ...(rejected.length ? rejected : ["(none)"]),
    "",
    "OPEN UNKNOWNS (context for assertion status):",
    ...(unknowns.length ? unknowns : ["(none)"]),
  ].join("\n");

  return { system, user };
}

// Tolerant parser (H7 pattern): typed field-by-field projection; unknown fields dropped; invalid
// enums coerce toward CAUTION (none_found / low_until_corroborated / unresolved / low) — a bad
// enum can weaken a claim, never strengthen one. Junk input → parse_failed, never a throw.
export interface RawM2Item {
  evidence_id: string; claim: string; claim_attributed_to: string; attributed_party_benefits: boolean;
  corroboration: "independent" | "cross_source" | "none_found"; weight: "standalone" | "low_until_corroborated";
}
export interface RawM3Item {
  assertion_id: string; assertion: string; brand: string; status: "supported" | "refuted" | "unresolved";
  supporting_evidence: string[]; contradicting_evidence: string[]; confidence: "high" | "medium" | "low";
}
export interface ParsedCallA { attributions: RawM2Item[]; assertions: RawM3Item[]; parse_failed: boolean }

const CORROBORATION = new Set(["independent", "cross_source", "none_found"]);
const WEIGHT = new Set(["standalone", "low_until_corroborated"]);
const STATUS = new Set(["supported", "refuted", "unresolved"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function parseCallAOutput(raw: unknown): ParsedCallA {
  if (!raw || typeof raw !== "object") return { attributions: [], assertions: [], parse_failed: true };
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.claim_attributions) && !Array.isArray(o.assertions)) {
    return { attributions: [], assertions: [], parse_failed: true };
  }
  const attributions: RawM2Item[] = (Array.isArray(o.claim_attributions) ? o.claim_attributions : [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      evidence_id: str(r.evidence_id),
      claim: str(r.claim),
      claim_attributed_to: str(r.claim_attributed_to),
      attributed_party_benefits: r.attributed_party_benefits === true,
      corroboration: (CORROBORATION.has(r.corroboration as string) ? r.corroboration : "none_found") as RawM2Item["corroboration"],
      weight: (WEIGHT.has(r.weight as string) ? r.weight : "low_until_corroborated") as RawM2Item["weight"],
    }));
  const assertions: RawM3Item[] = (Array.isArray(o.assertions) ? o.assertions : [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      assertion_id: str(r.assertion_id),
      assertion: str(r.assertion),
      brand: str(r.brand),
      status: (STATUS.has(r.status as string) ? r.status : "unresolved") as RawM3Item["status"],
      supporting_evidence: strArr(r.supporting_evidence),
      contradicting_evidence: strArr(r.contradicting_evidence),
      confidence: (CONFIDENCE.has(r.confidence as string) ? r.confidence : "low") as RawM3Item["confidence"],
    }));
  return { attributions, assertions, parse_failed: false };
}
