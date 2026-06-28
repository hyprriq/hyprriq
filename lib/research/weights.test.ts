import { describe, it, expect } from "vitest";
import { weightKeyExistsInAnyTrack } from "./weights";

describe("weightKeyExistsInAnyTrack", () => {
  it("is true for a key in any track's registry", () => {
    expect(weightKeyExistsInAnyTrack("government_registration")).toBe(true); // supplier_identity
    expect(weightKeyExistsInAnyTrack("dealer_page_listed")).toBe(true);      // supply_chain_relationship
  });
  it("is false for a key in no registry", () => {
    expect(weightKeyExistsInAnyTrack("totally_made_up_key")).toBe(false);
  });
});
