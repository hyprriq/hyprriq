import type { ClaimAttribution, SynthesisAssertion, WidenedM1Record } from "@/lib/research/contracts";
import { buildCallAPrompt, parseCallAOutput, CALL_A_OUTPUT_SCHEMA, type RawM2Item, type RawM3Item } from "@/lib/research/synthesisCallA.prompt";
import { runModel } from "@/lib/ai/runModel";

// ── S-1c — Call A (M2 + M3): the engine's first LLM boundary. ONE call per the ruled four-call
// staging (SO-S1-2); each module is then code-certified separately before anything consumes it.
// LLM proposes, CODE decides the load-bearing fields:
// - THE FIREWALL-WINS LAW (founder-ruled, the M2 law; the sitting's conscience): a rejected-with-
//   gate item arrives with its outcome ALREADY MEASURED — M2 never re-infers a decision the
//   firewall already made. Locked in the DANGEROUS direction only (LLM resurrecting a killed
//   claim as independent/cross_source ⇒ override to none_found + audit); the CONSERVATIVE
//   direction (LLM writing none_found on an accepted claim) is left alone — fails toward caution.
// - The pairing lock (frozen at S-1a): attributed_party_benefits && none_found ⇒ weight
//   low_until_corroborated, whatever the LLM wrote; every rejected item locked the same way.
// - M3: dangling evidence_ids drop the assertion + audit; THE ROSTER LOCK (unconditional,
//   founder-ruled): brand ∉ roster (and ≠ "") ⇒ dropped + audited — a hallucinated brand string
//   never reaches the record. ──

export interface CallAAudit { module: "m2" | "m3"; id: string; field: string; from: string; to: string; reason: string }

export interface CallAResult {
  attributions: ClaimAttribution[];
  assertions: SynthesisAssertion[];
  audits: CallAAudit[];
  schema_fallback: boolean; // R2 — persisted as the call_a flag when the stage is wired
  parse_failed: boolean;    // fail-open, never fail-silent: the caller decides H2 semantics
  cost_usd: number;
}

export type CallAModelFn = (input: { task: "synthesis"; system: string; user: string; temperature: number; schema: object }) =>
  Promise<{ json: unknown; schema_fallback?: boolean; cost_usd: number }>;

export function certifyM2(raw: RawM2Item[], record: WidenedM1Record): { attributions: ClaimAttribution[]; audits: CallAAudit[] } {
  const audits: CallAAudit[] = [];
  const acceptedIds = new Set(record.accepted.items.map((i) => i.evidence_id));
  const rejectedById = new Map(record.extension.rejected_with_gate.map((r) => [r.evidence_id, r]));

  const attributions: ClaimAttribution[] = [];
  for (const r of raw) {
    const rejected = rejectedById.get(r.evidence_id);
    if (!acceptedIds.has(r.evidence_id) && !rejected) {
      audits.push({ module: "m2", id: r.evidence_id, field: "evidence_id", from: r.evidence_id, to: "(dropped)", reason: "dangling evidence_id — resolves to neither accepted nor rejected M1" });
      continue;
    }
    let corroboration = r.corroboration;
    let weight = r.weight;
    // THE FIREWALL-WINS LAW — dangerous direction ONLY (the conscience test watched the naive
    // version fail here: the LLM resurrected a killed claim as "independent"). A rejected item's
    // outcome is ALREADY MEASURED; code overrides the resurrection and audits it by gate.
    if (rejected) {
      if (corroboration !== "none_found") {
        audits.push({ module: "m2", id: r.evidence_id, field: "corroboration", from: corroboration, to: "none_found", reason: `firewall wins: the ${rejected.gate ?? "validation"} gate already refused this claim — the stored record beats any LLM re-assessment` });
        corroboration = "none_found";
      }
      if (weight !== "low_until_corroborated") {
        audits.push({ module: "m2", id: r.evidence_id, field: "weight", from: weight, to: "low_until_corroborated", reason: "firewall wins: a rejected claim is locked from its stored tag — never independent evidence" });
        weight = "low_until_corroborated";
      }
    }
    if (r.attributed_party_benefits && corroboration === "none_found" && weight !== "low_until_corroborated") {
      audits.push({ module: "m2", id: r.evidence_id, field: "weight", from: weight, to: "low_until_corroborated", reason: "pairing lock: self-serving uncorroborated claim can never be independent evidence" });
      weight = "low_until_corroborated";
    }
    attributions.push({
      evidence_id: r.evidence_id,
      claim: r.claim,
      claim_attributed_to: r.claim_attributed_to,
      attributed_party_benefits: r.attributed_party_benefits,
      corroboration,
      weight,
    });
  }
  return { attributions, audits };
}

export function certifyM3(raw: RawM3Item[], record: WidenedM1Record, roster: string[]): { assertions: SynthesisAssertion[]; audits: CallAAudit[] } {
  const audits: CallAAudit[] = [];
  const acceptedIds = new Set(record.accepted.items.map((i) => i.evidence_id));
  const rosterSet = new Set(roster);

  const assertions: SynthesisAssertion[] = [];
  for (const r of raw) {
    const cited = [...r.supporting_evidence, ...r.contradicting_evidence];
    const dangling = cited.filter((id) => !acceptedIds.has(id));
    if (dangling.length > 0) {
      audits.push({ module: "m3", id: r.assertion_id, field: "evidence_ids", from: dangling.join(","), to: "(dropped)", reason: "dangling evidence_id — every cited id must resolve to an accepted M1 item" });
      continue;
    }
    if (r.brand !== "" && !rosterSet.has(r.brand)) {
      audits.push({ module: "m3", id: r.assertion_id, field: "brand", from: r.brand, to: "(dropped)", reason: "roster lock: brand not in cases.brands_submitted — an LLM brand tag is validated against the code-side roster, unconditionally" });
      continue;
    }
    assertions.push({
      assertion_id: r.assertion_id,
      assertion: r.assertion,
      brand: r.brand,
      status: r.status,
      supporting_evidence: r.supporting_evidence,
      contradicting_evidence: r.contradicting_evidence,
      confidence: r.confidence,
    });
  }
  return { assertions, audits };
}

export async function runCallA(input: { record: WidenedM1Record; roster: string[]; model?: CallAModelFn }): Promise<CallAResult> {
  const model = input.model ?? (runModel as CallAModelFn);
  const { system, user } = buildCallAPrompt(input.record, input.roster);
  let json: unknown = null;
  let schema_fallback = false;
  let cost_usd = 0;
  try {
    const res = await model({ task: "synthesis", system, user, temperature: 0, schema: CALL_A_OUTPUT_SCHEMA });
    json = res.json;
    schema_fallback = res.schema_fallback === true;
    cost_usd = res.cost_usd;
  } catch {
    return { attributions: [], assertions: [], audits: [], schema_fallback: false, parse_failed: true, cost_usd };
  }
  const parsed = parseCallAOutput(json);
  if (parsed.parse_failed) {
    return { attributions: [], assertions: [], audits: [], schema_fallback, parse_failed: true, cost_usd };
  }
  const m2 = certifyM2(parsed.attributions, input.record);
  const m3 = certifyM3(parsed.assertions, input.record, input.roster);
  return {
    attributions: m2.attributions,
    assertions: m3.assertions,
    audits: [...m2.audits, ...m3.audits],
    schema_fallback,
    parse_failed: false,
    cost_usd,
  };
}
