import { describe, it, expect } from "vitest";
import { buildTrack4Prompt, parseTrack4Output, DOC_REVIEW_KEYS } from "./track4.prompt";

const src = (id: string) => ({ source_id: id, url: "cases/c1/invoice.pdf", title: "invoice.pdf (invoice_pdf)", snippet: "INVOICE #123..." });

describe("Track 4 prompt (ruled law verbatim)", () => {
  const { system, user } = buildTrack4Prompt(
    { vendor_name: "Acme Corp", brands: ["Lenovo"], unreadable: [{ file_name: "scan.jpg", reason: "image-only" }] },
    [src("src_0")],
  );

  it("proposes ONLY the locked documentation_review keys (all 10)", () => {
    expect(DOC_REVIEW_KEYS).toHaveLength(10);
    for (const k of DOC_REVIEW_KEYS) expect(system).toContain(k);
  });

  it("carries the ruled veto law: observable manipulation, unprofessional carve-out, retail-receipt split, never-from-absence", () => {
    expect(system).toContain("OBSERVABLE manipulation signals");
    expect(system).toMatch(/looks unprofessional/i);
    expect(system).toContain("thin-but-genuine wholesale invoice");
    expect(system).toMatch(/NEVER propose either disqualifier from absence/i);
    expect(system).toMatch(/pixels is UNKNOWN/i); // text-only v1 honesty
  });

  it("carries the OQ-A4 guardrail: SAYS vs PROVES — no authorization conclusions from documents", () => {
    expect(system).toContain("SAYS vs PROVES");
    expect(system).toContain("Invoice acceptance is not brand authorization");
  });

  it("carries the LOA asymmetry: presence+valid fires; absence is neutral, never a deficiency", () => {
    expect(system).toContain("LOA ASYMMETRY");
    expect(system).toMatch(/ABSENCE of an LOA is NOT negative/i);
    expect(system).toMatch(/absence is neutral/i);
  });

  it("carries the submitter-standpoint law: never question who the client is on their own document", () => {
    expect(system).toContain("SUBMITTER STANDPOINT");
    expect(system).toMatch(/buyer named on them is normally the client/i);
    expect(system).toMatch(/NEVER emit an unknown, question, or concern about who the submitter is/i);
    expect(system).toMatch(/Describe a buyer entity factually and nothing more/i);
  });

  it("carries scope + label neutrality: pre-payment labels carry no weight; deal completion is out of scope", () => {
    expect(system).toContain("SCOPE AND LABEL NEUTRALITY");
    expect(system).toMatch(/purchase order, quotation, or invoice/i);
    expect(system).toMatch(/label carries no weight/i);
    expect(system).toMatch(/completed, paid, or shipped is OUTSIDE the scope/i);
    expect(system).toMatch(/client's purchase decision/i);
  });

  it("scope rule preserves legitimate unknowns (client-relevant, resolvable, assessment-changing)", () => {
    expect(system).toMatch(/unit price is wholesale-consistent\) STILL belong in/i);
    expect(system).toMatch(/removes only the two illegitimate classes/i);
  });

  it("demands per-document isolation + the analyst quartet + three-part finding", () => {
    expect(system).toContain("PER-DOCUMENT ISOLATION");
    for (const f of ["most_likely", "alternative", "what_would_change_my_mind"]) expect(system).toContain(f);
    expect(system).toContain("DOCUMENTATION_FINDING");
  });

  it("user block lists unreadable files as unknowns-to-report, never negatives", () => {
    expect(user).toContain("scan.jpg");
    expect(user).toContain("UNREADABLE");
  });
});

describe("parseTrack4Output (tolerant, H2 semantics)", () => {
  it("parses a valid payload", () => {
    const p = parseTrack4Output({
      evidence_items: [{ evidence_id: "e1", brand: "", statement: "s", proposed_weight_key: "invoice_full", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found", certainty: "verified", confidence: "high" }],
      documentation_finding: "three parts",
      analyst_reading: { most_likely: "a", alternative: "b", confidence: "medium", what_would_change_my_mind: "c" },
      questions_to_ask: [], reasoning_notes: "n", unknowns: [],
    });
    expect(p.parse_failed).toBeUndefined();
    expect(p.items[0].proposed_weight_key).toBe("invoice_full");
    expect(p.analyst_reading?.most_likely).toBe("a");
  });
  it("unparseable → parse_failed; missing analyst_reading tolerated", () => {
    expect(parseTrack4Output({ _parse_error: true }).parse_failed).toBe(true);
    expect(parseTrack4Output({ nope: 1 }).parse_failed).toBe(true);
    const p = parseTrack4Output({ evidence_items: [], documentation_finding: "", questions_to_ask: [], reasoning_notes: "", unknowns: [] });
    expect(p.parse_failed).toBeUndefined();
    expect(p.analyst_reading).toBeNull();
  });
});
