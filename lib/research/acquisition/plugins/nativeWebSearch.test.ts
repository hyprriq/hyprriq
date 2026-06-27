import { describe, it, expect } from "vitest";
import { nativeWebSearchPlugin, NATIVE_WEB_SEARCH_ENABLED } from "./nativeWebSearch";

describe("nativeWebSearchPlugin", () => {
  it("is disabled by default", () => {
    expect(NATIVE_WEB_SEARCH_ENABLED).toBe(false);
  });
  it("returns [] while disabled (fallback only)", async () => {
    const out = await nativeWebSearchPlugin.acquire({ question: "scam_reports", input: "x", case_id: "c1", track_key: "supplier_identity" });
    expect(out.sources).toEqual([]);
    expect(out.final_status).toBe("skipped");
  });
  it("declares broad fallback capabilities", () => {
    expect(nativeWebSearchPlugin.capabilities).toContain("scam_reports");
  });
});
