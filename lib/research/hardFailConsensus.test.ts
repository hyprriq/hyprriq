import { it, expect, describe } from "vitest";
import { reconcileHardFailConsensus } from "./hardFailConsensus";

describe("reconcileHardFailConsensus (H7 SO-4 — two-pass agreement for veto keys)", () => {
  it("a hard-fail key proposed in BOTH passes survives", () => {
    const r = reconcileHardFailConsensus(["registration_fabricated"], ["registration_fabricated", "government_registration"]);
    expect(r).toEqual({ confirmed: ["registration_fabricated"], dropped: [], second_call_failed: false });
  });
  it("a pass-1-only hard-fail key is dropped (extraction variance made visible)", () => {
    const r = reconcileHardFailConsensus(["scam_reports_corroborated"], ["negative_reputation"]);
    expect(r).toEqual({ confirmed: [], dropped: ["scam_reports_corroborated"], second_call_failed: false });
  });
  it("mixed: confirmed and dropped keys are partitioned key-by-key", () => {
    const r = reconcileHardFailConsensus(["website_fraudulent", "registration_fabricated"], ["registration_fabricated"]);
    expect(r.confirmed).toEqual(["registration_fabricated"]);
    expect(r.dropped).toEqual(["website_fraudulent"]);
  });
  it("OQ-A: second call failed (null) → keys KEPT + second_call_failed flag (caller escalates)", () => {
    const r = reconcileHardFailConsensus(["website_fraudulent"], null);
    expect(r).toEqual({ confirmed: ["website_fraudulent"], dropped: [], second_call_failed: true });
  });
  it("no hard-fail keys → trivially empty, never failed", () => {
    expect(reconcileHardFailConsensus([], ["anything"])).toEqual({ confirmed: [], dropped: [], second_call_failed: false });
  });
});
