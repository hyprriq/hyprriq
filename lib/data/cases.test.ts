import { describe, it, expect, vi, beforeEach } from "vitest";

// H5 — the findings data gate. Mock Clerk auth + the server supabase client (house pattern).
const { auth, maybeSingle, rowsResult, selectCalls } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const rowsResult = vi.fn().mockResolvedValue({ data: [] });
  const selectCalls: string[] = [];
  return { auth: vi.fn().mockResolvedValue({ userId: "user_1" }), maybeSingle, rowsResult, selectCalls };
});
vi.mock("@clerk/nextjs/server", () => ({ auth }));
// PROSE OVERRIDES — getCaseFindings loads them via supabaseAdmin (a different client from the
// mocked server one); default to none so the projection fixtures stay hermetic.
vi.mock("@/lib/data/proseOverrides", () => ({ getProseOverrides: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({
      select: (cols: string) => {
        selectCalls.push(cols);
        const chain: Record<string, unknown> = {};
        Object.assign(chain, {
          eq: () => chain, gte: () => chain, is: () => chain, neq: () => chain,
          order: () => ({ then: (r: (v: unknown) => void, j: (e: unknown) => void) => rowsResult().then(r, j) }),
          maybeSingle,
        });
        return chain;
      },
    }),
  }),
}));

import { getCaseFindings, getCaseById, projectSupplierIdentityForClient } from "./cases";
import type { SupplierIdentity } from "@/lib/research/contracts";
import { SOURCING_CLIENT_SUMMARY } from "@/lib/research/contracts";

beforeEach(() => {
  maybeSingle.mockReset();
  rowsResult.mockReset().mockResolvedValue({ data: [] });
  selectCalls.length = 0;
});

// ── PG-1 — the client-facing identity projection (the N4 class, closed for supplier_identity).
// The full SupplierIdentity (resolution_research + inner audits, resolution_notes, candidates,
// audit scores) is method data — it must never cross the RSC boundary to a client browser.
describe("PG-1 — supplier_identity is projected server-side for the client surface", () => {
  const fullIdentity = {
    original_input: { name: "TD Synexx", website: "tdsynnex.com" },
    resolved_name: "TD SYNNEX Corporation",
    resolved_domain: "tdsynnex.com",
    candidate_domains: ["tdsynnex.com"],
    registration_signals: [],
    identity_confidence: "high",
    identity_unconfirmed: false,
    resolution_method: "resolved_from_website",
    resolution_notes: "INTERNAL: comparator detail the client must never see",
    resolution_audit: { winner: "tdsynnex.com", score: 4, runner_up: null, runner_up_score: 0, matched_by: ["name_match"], warnings: [] },
    resolution_research: [{ subject: "tdsynnex.com", role: "website", sources: 14, llm_failed: false, audit: { winner: "tdsynnex.com", score: 4, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] } }],
    identity_discrepancy: { kind: "name_website_mismatch", entered_name: "TD Synexx", resolved_name: "TD SYNNEX Corporation", resolved_domain: "tdsynnex.com", client_note: "Identity clarification: the client-facing note." },
  } as SupplierIdentity;

  it("keeps ONLY the discrepancy kind + client_note — nothing else survives", () => {
    const p = projectSupplierIdentityForClient(fullIdentity);
    expect(p).toEqual({ identity_discrepancy: { kind: "name_website_mismatch", client_note: "Identity clarification: the client-facing note." } });
    expect(Object.keys(p as object)).toEqual(["identity_discrepancy"]);
    expect(Object.keys((p as { identity_discrepancy: object }).identity_discrepancy)).toEqual(["kind", "client_note"]);
  });

  it("null identity / null discrepancy → null (no empty husk crosses the boundary)", () => {
    expect(projectSupplierIdentityForClient(null)).toBeNull();
    expect(projectSupplierIdentityForClient({ ...fullIdentity, identity_discrepancy: null })).toBeNull();
  });

  it("getCaseById returns the PROJECTED identity — the full object never reaches the caller", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "awaiting_review", supplier_identity: fullIdentity } });
    const c = await getCaseById("c1");
    expect(c?.supplier_identity).toEqual({ identity_discrepancy: { kind: "name_website_mismatch", client_note: "Identity clarification: the client-facing note." } });
    expect(JSON.stringify(c)).not.toContain("resolution_research");
    expect(JSON.stringify(c)).not.toContain("INTERNAL");
    expect(JSON.stringify(c)).not.toContain("resolution_audit");
  });
});

// ── PG-1 pattern, second field (founder-ruled 2026-07-11, HIGH — before any Track-3 publish):
// the analyst_reading quartet is ADMIN-ONLY (OQ-D) and "leans harder than the veto-gated findings"
// (Track 3 AT-1 rider) — it must be structurally absent from the DELIVERED findings payload, not
// merely unrendered. brand_risk_finding stays (the Track-2-finding analog, HARD-scanned at delivery).
describe("Track 3 — analyst_reading is stripped from the delivered client findings payload", () => {
  it("delivered case: compiled_findings_json keeps brand_risk_finding, loses analyst_reading", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { id: "r1", track: "track_3", track_key: "brand_risk_assessment", attempt_number: 1,
        compiled_findings_json: { signal: "flag", brand_risk_finding: "three-part finding",
          analyst_reading: { most_likely: "INTERNAL working read", alternative: "a", confidence: "medium", what_would_change_my_mind: "w" } } },
    ]});
    const rows = await getCaseFindings("c1");
    expect(rows).toHaveLength(1);
    const json = rows[0].compiled_findings_json as Record<string, unknown>;
    expect(json.brand_risk_finding).toBe("three-part finding");
    expect(json).not.toHaveProperty("analyst_reading");
    expect(JSON.stringify(rows)).not.toContain("INTERNAL working read");
  });
});

// ── PG-1 pattern, third field (Track 5 sub-gate B, OQ-D rule pre-extended by the founder GO):
// the whole sourcing_logic block (contradiction narratives, coherence basis, flags) is internal
// arbitration reasoning for Module 4 — the analyst-quartet class. ADMIN-ONLY until the
// client-surface/PDF gate: structurally absent from the DELIVERED payload, not merely unrendered.
describe("Track 5 — the sourcing_logic block is stripped from the delivered client findings payload", () => {
  it("delivered case: track_5 row keeps its signal, loses the whole sourcing_logic block", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { id: "r5", track: "track_5", track_key: "sourcing_logic", attempt_number: 1,
        compiled_findings_json: { signal: "n_a", non_voting: true,
          sourcing_logic: { contract_version: "m4c-1.0.0", flags: ["b2b_only_archetype"],
            contradictions: [{ interpretation: "INTERNAL arbitration reasoning" }] } } },
    ]});
    const rows = await getCaseFindings("c1");
    expect(rows).toHaveLength(1);
    const json = rows[0].compiled_findings_json as Record<string, unknown>;
    expect(json).not.toHaveProperty("sourcing_logic");
    expect(json).not.toHaveProperty("signal"); // F2 — raw per-track signals are method exposure, dropped for ALL tracks
    expect(JSON.stringify(rows)).not.toContain("INTERNAL arbitration reasoning");
    expect(JSON.stringify(rows)).not.toContain("b2b_only_archetype");
  });

  // OQ-D summary rule (founder-ruled 2026-07-14, pre-freeze): the arbitration CONCLUSION is as
  // sensitive as the reasoning — even if a stored track_5 summary carried the descriptive line
  // (counts + coherence language), the client payload's summary must be the NEUTRAL constant.
  // Defense in depth: the write side already stores the neutral constant; this locks the read side.
  it("the neutral constant is the FOUNDER-RULED client string, verbatim (standing copy bar)", () => {
    expect(SOURCING_CLIENT_SUMMARY).toBe("Consistency check — informational; does not affect the verdict");
  });

  it("delivered case: the track_5 client-facing summary is the neutral constant — never counts or coherence language", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { id: "r5", track: "track_5", track_key: "sourcing_logic", attempt_number: 1,
        compiled_findings_json: { signal: "n_a", non_voting: true,
          summary: "sourcing-logic arbitration (non-voting): tension; 2 flag(s), 1 contradiction record(s) — derived from this attempt's stored track outputs only",
          sourcing_logic: { contract_version: "m4c-1.0.0", flags: ["b2b_only_archetype"],
            scenario_coherence: { assessment: "tension", basis: "x" }, contradictions: [] } } },
      { id: "r3", track: "track_3", track_key: "brand_risk_assessment", attempt_number: 1,
        compiled_findings_json: { signal: "flag", summary: "brand summary stays untouched" } },
    ]});
    const rows = await getCaseFindings("c1");
    const t5 = rows.find((r) => r.track_key === "sourcing_logic")!;
    const json = t5.compiled_findings_json as Record<string, unknown>;
    expect(json.summary).toBe(SOURCING_CLIENT_SUMMARY);
    expect(JSON.stringify(rows)).not.toMatch(/tension|flag\(s\)|contradiction record/);
    // other tracks' summaries are untouched (the neutralization is track_5-scoped)
    const t3 = rows.find((r) => r.track_key === "brand_risk_assessment")!;
    expect((t3.compiled_findings_json as Record<string, unknown>).summary).toBe("brand summary stays untouched");
  });
});

// ── F2 (founder-approved 2026-07-14) — the delivered findings payload is an ALLOWLIST projection
// (the PG-1 pattern on findings): every compiled_findings_json key not client-purposed — including
// any FUTURE field — is private BY DEFAULT. The structural close of the secondary-path leak class
// before the Synthesis gate multiplies narrative fields. signal/score deliberately excluded
// (founder-signed: verdict is case-level; raw per-track signals are method exposure).
describe("F2 — delivered findings are an allowlist projection; method data cannot survive", () => {
  it("only allowlisted keys survive; internal + unknown future fields drop", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { id: "r3", track: "track_3", track_key: "brand_risk_assessment", attempt_number: 1,
        compiled_findings_json: {
          signal: "hard_fail", score: 2, summary: "legacy summary", brand_risk_finding: "Petzl: no enforcement found.",
          auth_level: "C", auth_level_reasoning: "INTERNAL AUTH REASONING",
          research_name: "INTERNAL RESEARCH NAME", research_alias: "INTERNAL ALIAS",
          hard_fail_consensus: { checked: ["INTERNAL CONSENSUS KEY"], dropped: [], second_call_failed: false },
          source_diversity: { capped: true, cap_reason: "INTERNAL CAP REASON", distinct_sources: 1 },
          b2b_only_detected: true, b2b_only_brands: ["INTERNAL B2B BRAND"],
          evidence_count: 3,
          future_internal_field: "FUTURE SENSITIVE THING", // a field nobody has written yet — private by default
        } },
    ]});
    const rows = await getCaseFindings("c1");
    const json = rows[0].compiled_findings_json as Record<string, unknown>;
    const ALLOWLIST = ["title", "heading", "summary", "detail", "brand_relationship_finding", "brand_risk_finding",
      "documentation_finding", "identity_scope_note", "authorization_scope_note", "marketplace_eligibility_disclaimer", "evidence_count"];
    for (const k of Object.keys(json)) expect(ALLOWLIST, `non-allowlisted key shipped to client: ${k}`).toContain(k);
    expect(json.brand_risk_finding).toBe("Petzl: no enforcement found.");
    expect(json.evidence_count).toBe(3);
    const s = JSON.stringify(rows);
    for (const sentinel of ["INTERNAL AUTH REASONING", "INTERNAL RESEARCH NAME", "INTERNAL ALIAS",
      "INTERNAL CONSENSUS KEY", "INTERNAL CAP REASON", "INTERNAL B2B BRAND", "FUTURE SENSITIVE THING", "hard_fail"]) {
      expect(s.includes(sentinel), `client payload must not contain: ${sentinel}`).toBe(false);
    }
  });
});

describe("H5 — getCaseFindings is server-gated by status (the N4 payload leak)", () => {
  it("returns [] for a NON-delivered case without even querying the findings table", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "awaiting_review", delivered_attempt: null } });
    const rows = await getCaseFindings("c1");
    expect(rows).toEqual([]);
    // only the ownership/status query ran — findings never left the DB
    expect(selectCalls).toHaveLength(1);
  });

  it("returns findings for a delivered case, pinned to delivered_attempt, WITHOUT ai_output_json or manual_notes", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { track: "track_1", attempt_number: 1, evidence_items: [{ certainty: "verified" }], compiled_findings_json: { signal: "pass" } },
      { track: "track_1", attempt_number: 2, evidence_items: [], compiled_findings_json: { signal: "flag" } },
    ]});
    const rows = await getCaseFindings("c1");
    expect(rows).toHaveLength(1);
    // The delivered pin (H1): only the attempt-1 row survives — provable by its derived
    // certainty (attempt 1 carries a verified evidence item; attempt 2 does not).
    expect(rows[0].finding_certainty).toBe("verified");
    // The tightened projection returns the exact client Finding shape — internal fields
    // (attempt_number, evidence_items) never cross the RSC boundary.
    expect("attempt_number" in rows[0]).toBe(false);
    expect("evidence_items" in rows[0]).toBe(false);
    const findingsSelect = selectCalls[1];
    expect(findingsSelect).not.toContain("ai_output_json");
    expect(findingsSelect).not.toContain("manual_notes");
    expect(findingsSelect).toContain("compiled_findings_json");
    expect(findingsSelect).toContain("questions_to_ask");
  });

  it("returns [] when the case is not owned by the caller", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getCaseFindings("c1")).toEqual([]);
  });
});
