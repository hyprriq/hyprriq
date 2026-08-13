import { describe, it, expect } from "vitest";
import { buildKpiTiles } from "./dashboard-tiles";

// ── BUG-1 root-cause lock (2026-07-15). Founder-confirmed symptom: delivered cases reachable only
// by direct URL. Root cause: the admin DASHBOARD (the founder's primary surface) had no path to a
// delivered case — publishing removes the case from the queue (by design), and the "Delivered" KPI
// tile was an unlinked div. The c5b634f View-link fix was verified holding at every other layer
// (list links, queries, data, sidebar); the dead-end was the dashboard tiles. These locks make the
// tile destinations structural. ──
// DESIGN PASS 2026-08-13: triage-first order + stateful warn tones + Open Requests → /admin/support
// (the page exists now). BUG-1 destinations unchanged and still locked below.
describe("admin dashboard KPI tiles (BUG-1: the dashboard must route to delivered cases)", () => {
  const kpis = { mrr: 279, creditsSold: 12, casesCreated: 36, pendingReview: 3, delivered: 4, openRequests: 1 };
  const tiles = () => buildKpiTiles(kpis);
  const tile = (label: string, k = kpis) => buildKpiTiles(k).find((t) => t.label === label)!;

  it("the Delivered tile links to the delivered list (whose View buttons open /admin/cases/[id]/review)", () => {
    expect(tile("Delivered").href).toBe("/admin/cases?filter=delivered");
  });

  it("Pending Review routes to the queue filter; Cases Created to the full list; Open Requests to support", () => {
    expect(tile("Pending Review").href).toBe("/admin/cases?filter=queue");
    expect(tile("Cases Created").href).toBe("/admin/cases");
    expect(tile("Open Requests").href).toBe("/admin/support");
  });

  it("tiles with no destination page stay informational (no dead links)", () => {
    expect(tile("MRR").href).toBeUndefined();
    expect(tile("Credits Sold").href).toBeUndefined();
  });

  it("values are preserved and warn tones are stateful — zero queues are calm, not a standing alarm", () => {
    expect(tile("MRR").value).toBe("$279");
    expect(tile("Delivered")).toMatchObject({ value: 4, tone: "ok", sub: "reports" });
    expect(tile("Pending Review").tone).toBe("warn");
    expect(tile("Open Requests").tone).toBe("warn");
    const calm = { ...kpis, pendingReview: 0, openRequests: 0 };
    expect(tile("Pending Review", calm).tone).toBe("");
    expect(tile("Open Requests", calm).tone).toBe("");
  });

  it("triage tiles lead (queue-first ruling 2026-08-13); business figures follow", () => {
    expect(tiles().map((t) => t.label)).toEqual(["Pending Review", "Open Requests", "Delivered", "MRR", "Credits Sold", "Cases Created"]);
    expect(tiles().map((t) => t.group)).toEqual(["triage", "triage", "triage", "business", "business", "business"]);
  });
});
