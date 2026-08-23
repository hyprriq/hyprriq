import { describe, it, expect } from "vitest";
import { newFindings } from "@/lib/inngest/functions/integritySweep";
import { CHECKS, CHECK_BY_ID, INTERNAL_CONTENT_PATTERNS } from "@/lib/integrity/checks";
import { hoursSince } from "@/lib/integrity/latest";
import type { SweepResult } from "@/lib/integrity/sweep";

// ── THE ALERTING CONTRACT (founder-locked 2026-08-22, item 3a) ───────────────────────────────
// "One alert per new finding, never a daily digest of the same thing — an alarm that fires every
// day is an alarm I will learn to ignore." These fixtures are what make that a fact.

const sweep = (findings: { checkId: string; keys: string[] }[]): SweepResult => ({
  ran_at: "2026-08-22T06:20:00.000Z",
  cases_total: 45,
  checks: findings.map((f) => ({
    checkId: f.checkId,
    findings: f.keys.map((k) => ({ key: k, case_number: k.split(":")[1] ?? "AWI-X", detail: k })),
    casesScanned: 45,
    notEvaluated: [],
  })),
});

describe("newFindings — the founder is paged ONCE, for what is new", () => {
  it("first run ever (no previous) pages for everything it finds", () => {
    const cur = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:a->b"] }]);
    expect(newFindings(cur, null)).toHaveLength(1);
  });

  it("THE CORE GUARANTEE: a finding already reported does NOT page again", () => {
    const prev = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:a->b"] }]);
    const cur = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:a->b"] }]);
    expect(newFindings(cur, prev)).toEqual([]);
  });

  it("a genuinely new finding pages, while the known one stays silent", () => {
    const prev = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:a->b"] }]);
    const cur = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:a->b", "divergence:AWI-2608-050:c->d"] }]);
    const fresh = newFindings(cur, prev);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].case_number).toBe("AWI-2608-050");
  });

  it("a finding that CHANGES (different verdict transition) is new — the key carries the transition", () => {
    const prev = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:verify->usable"] }]);
    const cur = sweep([{ checkId: "verdict_replay_divergence", keys: ["divergence:AWI-2607-022:verify->do_not_rely"] }]);
    expect(newFindings(cur, prev)).toHaveLength(1);
  });

  it("a finding that DISAPPEARS pages nobody — silence is the correct response to a fix", () => {
    const prev = sweep([{ checkId: "internal_markers", keys: ["marker:AWI-1:A-NN:A10:report"] }]);
    expect(newFindings(sweep([{ checkId: "internal_markers", keys: [] }]), prev)).toEqual([]);
  });

  it("dedup is per-finding, not per-check: a new finding in a check that already had one still pages", () => {
    const prev = sweep([{ checkId: "internal_markers", keys: ["marker:AWI-1:A-NN:A10:report"] }]);
    const cur = sweep([{ checkId: "internal_markers", keys: ["marker:AWI-1:A-NN:A10:report", "marker:AWI-2:RG-NN:RG02:report"] }]);
    expect(newFindings(cur, prev).map((f) => f.case_number)).toEqual(["AWI-2"]);
  });

  it("keys are compared across the WHOLE previous run, not just the same check slot", () => {
    const prev = sweep([
      { checkId: "internal_markers", keys: ["k1"] },
      { checkId: "internal_content", keys: ["k2"] },
    ]);
    expect(newFindings(sweep([{ checkId: "internal_content", keys: ["k1", "k2"] }]), prev)).toEqual([]);
  });
});

describe("the registry is legible and complete", () => {
  it("every check declares a shape, a plain-English title, a meaning, and its measurement", () => {
    for (const c of CHECKS) {
      expect(c.shapes.length, c.id).toBeGreaterThan(0);
      expect(c.title.length, c.id).toBeGreaterThan(10);
      expect(c.meaning.length, c.id).toBeGreaterThan(30);
      expect(c.measured.length, c.id).toBeGreaterThan(10);
      expect(CHECK_BY_ID.get(c.id)).toBe(c);
    }
  });

  it("every census this week became a standing check — none was left as a one-off", () => {
    const ids = CHECKS.map((c) => c.id).sort();
    expect(ids).toEqual([
      "delivered_without_verdict",
      "internal_content",
      "internal_markers",
      "live_case_ids_on_surfaces",
      "verdict_replay_divergence",
    ]);
  });

  it("the 1e content patterns fire on internal vocabulary and NOT on the measured collisions", () => {
    const fires = (s: string) => INTERNAL_CONTENT_PATTERNS.some((p) => new RegExp(p.re.source, p.re.flags.replace("g", "")).test(s));
    for (const bad of ["restricted ASINs (brand_risk)", "the documentation_review area", "signal was soft_fail", "[leading hypothesis]", "Module 4 found", "Track 3 says"]) {
      expect(fires(bad), bad).toBe(true);
    }
    for (const good of ["active SEC filings (S-1, S-3, 10-K)", "SKUs beyond B007EARF3O", "Brand Risk is covered", "Documentation Review was not assessed", "the EV-2000 charger"]) {
      expect(fires(good), good).toBe(false);
    }
  });
});

describe("staleness — green must mean MEASURED green", () => {
  it("hoursSince measures age so the page can refuse to call a stale record healthy", () => {
    const now = new Date("2026-08-22T12:00:00Z").getTime();
    expect(hoursSince("2026-08-22T11:00:00Z", now)).toBeCloseTo(1, 5);
    expect(hoursSince("2026-08-20T12:00:00Z", now)).toBeCloseTo(48, 5);
    expect(hoursSince("2026-08-23T12:00:00Z", now)).toBe(0); // future clock skew never reads as stale
  });
});
