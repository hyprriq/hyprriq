import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Dispute/escalation re-run (founder-ruled 2026-07-13) — the no-advance path locks. ──
// Mock layout mirrors pipeline.steps.test.ts: cases update recorded, audit insert recorded; the
// judgment functions in the stability lock stay REAL (that determinism is what the lock protects).
const { casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert } = vi.hoisted(() => {
  const casesNot = vi.fn().mockResolvedValue({ error: null });
  type EqResult = { error: { message: string } | null };
  const casesEq = vi.fn((): { not: typeof casesNot; then: (resolve: (v: EqResult) => void) => void } => ({
    not: casesNot,
    then: (resolve: (v: EqResult) => void) => resolve({ error: null }),
  }));
  const casesUpdate = vi.fn(() => ({ eq: casesEq }));
  const statusMaybeSingle = vi.fn();
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return { casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert };
});
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) =>
      table === "audit_log"
        ? { insert: auditInsert }
        : { update: casesUpdate, select: () => ({ eq: () => ({ maybeSingle: statusMaybeSingle }) }) },
  },
}));

import { stageFinalize } from "./pipeline.steps";
import { rederiveStoredSignal } from "./rederive";
import { certifySynthesisForVerdict } from "./synthesisFirewall";
import { computeVerdict } from "./verdictEngine";
import type { EvidenceItem } from "./contracts";
import { applyVerdictCeiling } from "./verdictCeiling";
import { applyDocumentationNoOverride } from "./verdictNoOverride";
import type { TrackContext, TrackSignal, SynthesisOutput } from "./contracts";
import type { TrackKey } from "@/lib/constants/tracks";

const dctx: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
  attempt_number: 4, dispute_rerun: true,
};
const args = {
  included: new Set([1, 2, 3, 4, 5]), identityAcquisitionFailed: false,
  failedTracks: new Set<number>(), skippedTracks: new Set<number>(),
  verdict: "verify_before_purchase", confidence_0_15: 7,
};
const lastUpdate = () => (casesUpdate.mock.calls as unknown as Record<string, unknown>[][])[0][0];

beforeEach(() => {
  casesUpdate.mockClear(); casesEq.mockClear(); casesNot.mockClear(); auditInsert.mockClear();
  statusMaybeSingle.mockReset().mockResolvedValue({ data: { status: "awaiting_review", verdict: "source_clear" } });
});

describe("dispute re-run — stageFinalize NO-ADVANCE path (the AWI-2607-022 lesson, structural)", () => {
  it("on a NON-delivered case: ONLY reinvestigation_pending is written — no verdict, no status, no track statuses (no pointer advance, no auto-deliver)", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "awaiting_review", verdict: "source_clear" } });
    await stageFinalize(dctx, args);
    expect(lastUpdate()).toEqual({ reinvestigation_pending: true });
  });

  it("on a DELIVERED case: same — the delivered record stays byte-unchanged (H1)", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "delivered", verdict: "source_clear" } });
    await stageFinalize(dctx, args);
    expect(lastUpdate()).toEqual({ reinvestigation_pending: true });
  });

  it("a would-be verdict FLIP is surfaced in the audit log (verdict_stable=false), never adopted", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "delivered", verdict: "source_clear" } });
    await stageFinalize(dctx, { ...args, verdict: "do_not_rely" });
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      record_id: "c1",
      new_value: expect.objectContaining({
        dispute_rerun: true, attempt: 4,
        current_verdict: "source_clear", rerun_verdict: "do_not_rely", verdict_stable: false,
      }),
    }));
    expect(lastUpdate()).toEqual({ reinvestigation_pending: true }); // surfaced ≠ adopted
  });

  it("a stable verdict records verdict_stable=true (stability is the feature — on the record)", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "awaiting_review", verdict: "verify_before_purchase" } });
    await stageFinalize(dctx, args);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      new_value: expect.objectContaining({ dispute_rerun: true, verdict_stable: true }),
    }));
  });

  it("WITHOUT dispute_rerun the normal finalize behavior is unchanged (two-sided)", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "research_running" } });
    const normal: TrackContext = { ...dctx, attempt_number: 1 };
    delete (normal as unknown as Record<string, unknown>).dispute_rerun;
    await stageFinalize(normal, args);
    expect(lastUpdate()).toMatchObject({ status: "awaiting_review", verdict: "verify_before_purchase" });
  });
});

// ── Stability lock — same frozen evidence through the same code = same verdict. A dispute re-run
// exists to DEMONSTRATE this property; the lock guards the judgment path (deriveTrackSignal →
// computeVerdict → no-override → ceiling, all frozen) against any future nondeterminism. ──
describe("dispute re-run — verdict stability lock (rejudge-on-same-frozen-evidence)", () => {
  const EMPTY_SYNTH: SynthesisOutput = {
    module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
    module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
    module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "stability lock" },
    module_8_vendor_questions: [],
    module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
  };
  // F4 (founder-approved 2026-07-14): the lock re-derives via the SHARED composition
  // (rederiveStoredSignal = dedupe → signal → source-diversity cap) — the exact pipeline path —
  // instead of re-composing steps locally (the pre-F4 version omitted the cap and could not have
  // caught the rejudge divergence the sweep found).
  const fitem = (id: string, key: string, url: string): EvidenceItem => ({
    evidence_id: id, weight_key: key, statement: "", certainty: "verified", source_type: "government_record",
    source_url: url, claimant: "independent_registry", claimant_benefits: false, supports: "supplier_identity",
  });
  const FROZEN_ITEMS: Partial<Record<TrackKey, EvidenceItem[]>> = {
    // pass-by-score but SINGLE-SOURCE — the pipeline caps this to infer; the lock must too.
    supplier_identity: [
      fitem("e1", "government_registration", "https://www.reg.gov/x/"),
      fitem("e2", "domain_age_5_plus", "http://reg.gov/x"),
      fitem("e3", "address_verifiable", "https://reg.gov/x?utm_source=a"),
    ],
    supply_chain_relationship: [],
    brand_risk_assessment: [],
    documentation_review: [fitem("d1", "invoice_full", "cases/c1/invoice.pdf")],
  };
  const judge = () => {
    const signals: Partial<Record<TrackKey, TrackSignal>> = {};
    for (const [k, items] of Object.entries(FROZEN_ITEMS)) {
      signals[k as TrackKey] = rederiveStoredSignal(k as TrackKey, items as EvidenceItem[]);
    }
    // S-0 — the lock mirrors the full pipeline composition: certify → compute → no-override → ceiling.
    const certified = certifySynthesisForVerdict(EMPTY_SYNTH);
    const raw = computeVerdict(signals, certified.synthesis);
    const noOverride = applyDocumentationNoOverride(raw, signals, certified.synthesis);
    return { signals, ...raw, ...applyVerdictCeiling({ verdict: noOverride.verdict }, signals) };
  };
  it("re-judging identical frozen evidence twice yields a byte-identical verdict — through the PIPELINE composition (cap included)", () => {
    const first = judge();
    expect(first.signals.supplier_identity).toBe("infer"); // cap parity: single-source pass capped, exactly as stored
    expect(JSON.stringify(first)).toBe(JSON.stringify(judge()));
  });
});

// ── The founder-run script — friction against routine use + the no-recharge lock. ──
describe("dispute-rerun founder script (scripts/dispute-rerun.ts)", () => {
  const scriptPath = join(process.cwd(), "scripts", "dispute-rerun.ts");
  const src = () => readFileSync(scriptPath, "utf8");

  it("exists (founder-run; Claude never executes it on a case)", () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("carries the re-run vs request-further-investigation distinction in its header", () => {
    expect(src()).toMatch(/request further investigation/i);
    expect(src()).toMatch(/same facts/i);
  });

  it("demands a mandatory --reason and defaults to DRY (--run to fire) — the design discourages casual use", () => {
    expect(src()).toContain("--reason");
    expect(src()).toContain("--run");
  });

  it("drives the pipeline in dispute mode and verifies the live pointer + credit balance afterward", () => {
    expect(src()).toMatch(/dispute_rerun:\s*true/);
    expect(src()).toContain("credits_available"); // read-only balance check: proves no re-charge on the live run
    expect(src()).toContain("delivered_attempt"); // pointer snapshot: proves no advance on the live run
  });

  it("the entire re-run path contains ZERO credit mutations (re-runs an existing PAID case)", () => {
    const files = ["scripts/dispute-rerun.ts", "lib/research/pipeline.ts", "lib/research/pipeline.steps.ts"];
    const bannedRpcs = ["deduct_client_credits", "add_client_credits", "rollover_client_credits"];
    for (const file of files) {
      const s = readFileSync(join(process.cwd(), file), "utf8");
      for (const banned of bannedRpcs) {
        expect(s.includes(banned), `${file} must not reference ${banned}`).toBe(false);
      }
    }
  });
});
