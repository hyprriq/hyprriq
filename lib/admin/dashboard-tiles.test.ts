import { describe, it, expect } from "vitest";
import { buildKpiTiles } from "./dashboard-tiles";

// ── BUG-1 root-cause lock (2026-07-15). Founder-confirmed symptom: delivered cases reachable only
// by direct URL. Root cause: the admin DASHBOARD (the founder's primary surface) had no path to a
// delivered case — publishing removes the case from the queue (by design), and the "Delivered" KPI
// tile was an unlinked div. The c5b634f View-link fix was verified holding at every other layer
// (list links, queries, data, sidebar); the dead-end was the dashboard tiles. These locks make the
// tile destinations structural. ──
describe("admin dashboard KPI tiles (BUG-1: the dashboard must route to delivered cases)", () => {
  const kpis = { mrr: 279, creditsSold: 12, casesCreated: 36, pendingReview: 3, delivered: 4, openRequests: 1 };
  const tiles = () => buildKpiTiles(kpis);
  const tile = (label: string) => tiles().find((t) => t.label === label)!;

  it("the Delivered tile links to the delivered list (whose View buttons open /admin/cases/[id]/review)", () => {
    expect(tile("Delivered").href).toBe("/admin/cases?filter=delivered");
  });

  it("Pending Review routes to the queue filter; Cases Created to the full list", () => {
    expect(tile("Pending Review").href).toBe("/admin/cases?filter=queue");
    expect(tile("Cases Created").href).toBe("/admin/cases");
  });

  it("tiles with no destination page stay informational (no dead links)", () => {
    expect(tile("MRR").href).toBeUndefined();
    expect(tile("Credits Sold").href).toBeUndefined();
    expect(tile("Open Requests").href).toBeUndefined(); // support queue renders on the dashboard itself
  });

  it("values and tones are preserved (the tiles render exactly as before, now clickable)", () => {
    expect(tile("MRR").value).toBe("$279");
    expect(tile("Delivered")).toMatchObject({ value: 4, tone: "ok", sub: "reports" });
    expect(tile("Pending Review").tone).toBe("warn");
    expect(tiles().map((t) => t.label)).toEqual(["MRR", "Credits Sold", "Cases Created", "Pending Review", "Delivered", "Open Requests"]);
  });
});
