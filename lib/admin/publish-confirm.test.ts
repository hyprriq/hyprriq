import { describe, it, expect } from "vitest";
import { buildPublishConfirm, buildDeliveredToast } from "./publish-confirm";

describe("buildPublishConfirm — names the case before an irreversible delivery", () => {
  it("publish: names case_number + vendor and warns it cannot be undone", () => {
    const msg = buildPublishConfirm("publish", "AWI-2607-021", "TD Synnex");
    expect(msg).toContain("AWI-2607-021");
    expect(msg).toContain("TD Synnex");
    expect(msg).toMatch(/cannot be undone/i);
  });
  it("override: same identity + the override verb", () => {
    const msg = buildPublishConfirm("override", "AWI-2607-021", "TD Synnex");
    expect(msg).toContain("AWI-2607-021");
    expect(msg).toMatch(/override/i);
  });
  it("tolerates a missing vendor name (case number still shown)", () => {
    const msg = buildPublishConfirm("publish", "AWI-1", null);
    expect(msg).toContain("AWI-1");
    expect(msg).not.toContain("()");
  });
  it("request_investigation is non-destructive → no confirm dialog", () => {
    expect(buildPublishConfirm("request_investigation", "AWI-1", "X")).toBeNull();
  });
});

describe("buildDeliveredToast — success names the case (never a bare 'Report delivered.')", () => {
  it("publish toast names the case number", () => {
    expect(buildDeliveredToast("publish", "AWI-2607-021")).toBe("Report AWI-2607-021 delivered.");
  });
  it("override toast names the case number", () => {
    expect(buildDeliveredToast("override", "AWI-2607-021")).toContain("AWI-2607-021");
  });
  it("request_investigation toast is unchanged", () => {
    expect(buildDeliveredToast("request_investigation", "AWI-1")).toBe("Sent back for further investigation.");
  });
});
