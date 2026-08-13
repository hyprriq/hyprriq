// BUG-1 root-cause fix (2026-07-15) — the founder's primary surface (admin dashboard) had NO path
// to a delivered case: the Case Queue drops a case the moment it is published (by design — it
// lists founder-queue statuses only), and the "Delivered" KPI tile was an unlinked div. From the
// dashboard, a delivered case was reachable only by typing /admin/cases/[id]/review — the exact
// reported symptom. The c5b634f View-link fix was verified holding at every other layer (list
// links, queries, data, sidebar); the dead-end was HERE. Fix: KPI tiles with a destination page
// link to it. Pure presenter (the finding-view pattern) so the destinations are unit-locked.
//
// DESIGN PASS 2026-08-13 (queue-first ruling): tiles reordered triage-first — the three counts
// that need the founder (Pending Review, Open Requests, Delivered) lead; the three business
// figures (MRR, Credits Sold, Cases Created) follow. Warn tones are STATEFUL like the ruled
// Running-low pattern on /admin/billing: a zero queue is calm ink, not a standing alarm. Open
// Requests now links to /admin/support (the page exists — the old "renders on the dashboard
// itself" note predates it). All values, labels, and BUG-1 destinations unchanged.

export interface KpiTile {
  label: string;
  value: string | number;
  sub: string;
  tone: "" | "warn" | "ok";
  href?: string; // absent = informational tile (no destination page exists; never a dead link)
  group: "triage" | "business";
}

export interface DashboardKpis {
  mrr: number;
  creditsSold: number;
  casesCreated: number;
  pendingReview: number;
  delivered: number;
  openRequests: number;
}

export function buildKpiTiles(kpis: DashboardKpis): KpiTile[] {
  return [
    { label: "Pending Review", value: kpis.pendingReview, sub: "awaiting founder", tone: kpis.pendingReview > 0 ? "warn" : "", href: "/admin/cases?filter=queue", group: "triage" },
    { label: "Open Requests", value: kpis.openRequests, sub: "support queue", tone: kpis.openRequests > 0 ? "warn" : "", href: "/admin/support", group: "triage" },
    // THE BUG-1 tile: publishing removes a case from the queue below it, so this tile is the
    // natural next click — it lands on the delivered list, whose View buttons open the review page.
    { label: "Delivered", value: kpis.delivered, sub: "reports", tone: "ok", href: "/admin/cases?filter=delivered", group: "triage" },
    { label: "MRR", value: `$${kpis.mrr.toLocaleString()}`, sub: "active subscriptions", tone: "", group: "business" },
    { label: "Credits Sold", value: kpis.creditsSold, sub: "charged to date", tone: "", group: "business" },
    { label: "Cases Created", value: kpis.casesCreated, sub: "all time", tone: "", href: "/admin/cases", group: "business" },
  ];
}
