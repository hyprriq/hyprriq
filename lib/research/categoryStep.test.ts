import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrackContext } from "@/lib/research/contracts";

// ── Track 6 WIRING (2026-07-23, post-core-freeze; the orchestration-fork ruling) — the OWN-STEP
// dispatch OUTSIDE the registry. The registry is itself a synthesis input, so category must never
// appear in it: this step is plan-gated IN THE STEP (Track-0.5 precedent), persists the sibling
// block on the track's own row, and is FAIL-LOUD-NON-FATAL end to end — an advisory assessment
// must never kill or delay the vendor case (H2 OQ-2 pattern).
// DEGRADED-HONEST LAUNCH MODE: the live gather adapter awaits the STOP-1 ruling (ResearchQuestion
// union), so the default gather returns zero sources — brand-keyed flags still fire (they need no
// research); everything else is could_not_determine, stated as absence of research. ──

const { upsert, auditInsert } = vi.hoisted(() => ({
  upsert: vi.fn().mockResolvedValue({ error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult: upsert }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn((t: string) => ({ insert: t === "audit_log" ? auditInsert : vi.fn() })) },
}));

import { stageCategoryCompliance, CATEGORY_CLIENT_SUMMARY } from "@/lib/research/categoryStep";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "case-1", vendor_name: "Acme", vendor_website: null, marketplace: "amazon_us",
  brands_submitted: ["Lenovo"], plan_type: "scale_499", attempt_number: 2, ...over,
});

const modelDep = vi.fn().mockResolvedValue({ json: { per_brand: [] }, cost_usd: 0.01 });

beforeEach(() => { upsert.mockClear().mockResolvedValue({ error: null }); auditInsert.mockClear(); modelDep.mockClear(); });

describe("Track 6 wiring — the own-step dispatch (outside the registry, plan-gated in the step)", () => {
  it("PLAN GATE: single_99 and growth_279 never run it — no research, no persist, ran:false", async () => {
    for (const plan of ["single_99", "growth_279"] as const) {
      const r = await stageCategoryCompliance(ctx({ plan_type: plan }), { model: modelDep });
      expect(r.ran).toBe(false);
      expect(r.reason).toBe("plan_excluded");
    }
    expect(upsert).not.toHaveBeenCalled();
    expect(modelDep).not.toHaveBeenCalled();
  });

  it("scale_499 runs it and persists the NON-VOTING row: track_6 / category_compliance / n_a / approved / the sibling block / this attempt", async () => {
    const r = await stageCategoryCompliance(ctx(), { model: modelDep });
    expect(r.ran).toBe(true);
    expect(r.persisted).toBe(true);
    const row = upsert.mock.calls[0][0];
    expect(row).toMatchObject({
      case_id: "case-1", track: "track_6", track_key: "category_compliance", track_number: 6,
      attempt_number: 2, source_mode: "ai_generated",
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: false, founder_review_status: "approved",
      evidence_items: [], unknowns: [],
    });
    expect(row.compiled_findings_json.non_voting).toBe(true);
    expect(row.compiled_findings_json.category_compliance.contract_version).toBe("cc-1.0.0");
  });

  it("DEGRADED-HONEST MODE (gather pending STOP-1): zero sources by default — the brand-keyed electronics flag STILL fires; the pending state is audited on the record", async () => {
    const r = await stageCategoryCompliance(ctx(), { model: modelDep });
    const cc = upsert.mock.calls[0][0].compiled_findings_json.category_compliance;
    expect(cc.category_verdict).toBe("requirements_identified"); // Lenovo — brand-keyed, no research needed
    expect(cc.per_brand[0].categories_found[0].flags[0].matched_via).toBe("brand_keyed");
    expect(cc.audits.some((a: { reason: string }) => /gather.*pending|pending.*gather/i.test(a.reason))).toBe(true);
    expect(modelDep).not.toHaveBeenCalled(); // zero sources ⇒ the model is never asked to invent
    expect(r.cost_usd).toBe(0);
  });

  it("non-electronics brand + pending gather ⇒ could_not_determine (absence of research, never clearance)", async () => {
    await stageCategoryCompliance(ctx({ brands_submitted: ["Optimum Nutrition"] }), { model: modelDep });
    const cc = upsert.mock.calls[0][0].compiled_findings_json.category_compliance;
    expect(cc.category_verdict).toBe("could_not_determine");
  });

  it("FAIL-LOUD-NON-FATAL persist (the un-run migration's CHECK will reject the new track values): audit-logged, persisted:false, NEVER throws", async () => {
    upsert.mockResolvedValue({ error: 'new row violates check constraint "case_track_results_track_check"' });
    const r = await stageCategoryCompliance(ctx(), { model: modelDep });
    expect(r.ran).toBe(true);
    expect(r.persisted).toBe(false);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      table_name: "case_track_results", actor_type: "system",
      new_value: expect.objectContaining({ category_compliance_dropped: true }),
    }));
  });

  it("a throwing dependency is contained: audit-logged, ran:true/persisted:false — the advisory track can never kill the vendor case", async () => {
    const boom = vi.fn().mockRejectedValue(new Error("model down"));
    const gather = vi.fn().mockResolvedValue({ pack: { sources: [{ url: "https://x" }] }, metrics: [] });
    const r = await stageCategoryCompliance(ctx({ brands_submitted: ["Optimum Nutrition"] }), { model: boom, gather });
    expect(r.ran).toBe(true);
    expect(r.persisted).toBe(false);
    expect(auditInsert).toHaveBeenCalled();
  });

  it("CONDITION 3 + client strip: the write-side summary is the neutral constant — no 'verdict' word, and it passes both banned-language tiers", async () => {
    const { scanHard, scanAssertion } = await import("@/lib/utils/banned-language");
    expect(CATEGORY_CLIENT_SUMMARY.toLowerCase()).not.toContain("verdict");
    expect(scanHard(CATEGORY_CLIENT_SUMMARY)).toEqual([]);
    expect(scanAssertion(CATEGORY_CLIENT_SUMMARY)).toEqual([]);
    await stageCategoryCompliance(ctx(), { model: modelDep });
    expect(upsert.mock.calls[0][0].compiled_findings_json.summary).toBe(CATEGORY_CLIENT_SUMMARY);
  });
});

describe("Track 6 wiring — the orchestrators carry the step (source-scan locks)", () => {
  it("BOTH orchestrators dispatch stageCategoryCompliance (the own-step ruling: dev route + Inngest, one behavior)", () => {
    for (const f of ["lib/research/pipeline.ts", "lib/inngest/functions/pipeline.ts"]) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src.includes("stageCategoryCompliance"), `${f} must dispatch the category step`).toBe(true);
    }
  });

  it("THE FORK RULING'S LOCK: category_compliance appears in NEITHER the registry NOR pipeline.steps (the registry is a synthesis input; the step lives outside)", () => {
    for (const f of ["lib/research/pipeline.registry.ts", "lib/research/pipeline.steps.ts", "lib/constants/tracks.ts"]) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src.includes("category_compliance"), `${f} must NOT know the category track exists`).toBe(false);
    }
  });
});
