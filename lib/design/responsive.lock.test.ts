import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  scanAll, scanTapTargets, scanTables, appFiles, isOffender,
  contentBox, splitTracks, trackMin, TEST_WIDTHS, type GridSite,
} from "./responsiveScan";

const repo = path.resolve(__dirname, "../..");

// ── LOCK — THE RESPONSIVE FLOOR (founder-ruled 2026-08-25, BUILT BEFORE THE FIXES) ────────────
//
// ⚠ THE ORDER IS THE POINT, and it was the founder's ruling: this lock ships BEFORE the remediation,
// not after. "If it ships last, the fixes are verified by the same eye that missed these. If it
// ships first, every fix is verified by the lock as it lands."
//
// THE RULE:
//   A grid whose fixed tracks + gaps + padding exceed the content box at 360px must EITHER carry a
//   breakpoint gate that keeps it off a phone, OR its file must ship an alternative form. A <table>
//   must have a horizontal scroll container. A control on a client surface must reach 44px.
//
// HOW IT SHRINKS: everything currently broken is listed in KNOWN_OFFENDERS with its measured
// overflow. Two tests hold the line from both sides —
//   · "no NEW offender"  — anything not on the list fails immediately.
//   · "the list is not STALE" — every entry must STILL be found. Fix one and the lock fails until
//     you delete its row, so the list can only shrink and can never quietly describe a fixed world.
//
// The staleness test is also THE SELF-TEST THE FOUNDER REQUIRED. A scanner that silently matches
// nothing is the failure this project has now hit three times — the two backspace regexes (standing
// rule 11) and the three passes of the audit scanner that could not see /admin/support. Asserting
// that the detector still finds specific, named, measured offenders is the only way to know it is
// looking at anything at all.

/**
 * MEASURED 2026-08-25 in real 360px viewports (same-origin iframes of exact width, so sm:/md:/lg:
 * resolve as on a device). `over` is px past the content box at 360.
 * DELETE A ROW WHEN IT IS FIXED — the staleness test will tell you if you forget.
 */
const KNOWN_OFFENDERS: { file: string; over: number; note: string }[] = [
  { file: "app/(admin)/admin/support/page.tsx", over: 374, note: "worst in the codebase; the row contains NO <Link> at all, so nothing on it can be opened" },
  { file: "app/(admin)/admin/billing/page.tsx", over: 320, note: "only link measured 0px visible; elementFromPoint returns nothing" },
  { file: "app/(admin)/admin/dashboard/page.tsx", over: 166, note: "two lists; the cases row's only link measured 0px visible" },
  { file: "components/admin/users-manager.tsx", over: 196, note: "no wrapper at all → the document scrolls sideways 229px" },
  { file: "app/(admin)/admin/clients/page.tsx", over: 50, note: "the row IS a <Link>, so it still navigates; trailing column clipped" },
];

/** Files whose <table> has no horizontal scroll container. MEASURED 2026-08-25. */
const KNOWN_UNWRAPPED_TABLES: string[] = [
  "app/(admin)/admin/brands/page.tsx",
  "app/(admin)/admin/outcomes/page.tsx",
  "app/(admin)/admin/revenue/page.tsx",
  "app/(admin)/admin/suppliers/page.tsx",
  "app/(admin)/admin/clients/[id]/accounting/page.tsx",
  "components/admin/attempt-history.tsx",
  "components/admin/case-review.tsx",
];

/**
 * CLIENT-SURFACE controls under 44px. MEASURED 2026-08-25.
 * Scope matches mobile.lock.test.ts deliberately: admin is an operator console at a desk. The two
 * admin screens the founder narrowed the ruling for — /admin/cases and /admin/cases/[id]/review —
 * join this scope in the second remediation sitting, not before.
 */
const KNOWN_SMALL_TARGETS: string[] = [
  "components/portal/report-view.tsx",
  "components/portal/submit-form.tsx",
  "components/portal/onboarding-flow.tsx",
  "components/portal/cancel-subscription.tsx",
  "components/portal/change-request-form.tsx",
  "components/portal/settings-form.tsx",
  "components/portal/support-form.tsx",
  "components/portal/user-menu.tsx",
  "components/portal/grant-code-box.tsx",
  "components/portal/case-table.tsx",
  "components/portal/portal-shell.tsx",
  "components/auth/grant-code-entry.tsx",
  "app/(portal)/portal/dashboard/page.tsx",
  "app/(portal)/portal/cases/page.tsx",
  "app/(portal)/portal/cases/[id]/page.tsx",
  "app/(portal)/portal/cases/[id]/change/page.tsx",
  "app/(portal)/portal/help/page.tsx",
];

const CLIENT_SURFACES = /^(app\/\(portal\)|app\/\(auth\)|components\/portal|components\/auth)/;

const sites = scanAll(repo);
const offenders = sites.filter(isOffender);

describe("LOCK — the scanner can actually see (self-test, founder-required)", () => {
  it("finds grids at all", () => {
    // The floor beneath every other assertion here. A scanner returning [] passes every test below
    // it while policing nothing — the exact shape of standing rule 11.
    expect(sites.length, "the grid scanner found NOTHING — it is broken, not the codebase")
      .toBeGreaterThan(15);
  });

  it("resolves grids declared in a CONSTANT, not just inline (the /admin/support blind spot)", () => {
    // `const COLS = "grid grid-cols-[…] gap-3"` rendered via className={`${COLS} …`}. The className
    // string never contains "grid", and the widest grid in the codebase was invisible for it.
    const support = sites.filter((s) => s.file === "app/(admin)/admin/support/page.tsx");
    expect(support.length, "the constant-declared grid on /admin/support is invisible again").toBeGreaterThan(0);
    expect(
      Math.round(Math.max(...support.map((s) => s.minWidth))),
      "the gap and padding from the CONSTANT must be merged into the render site",
    ).toBeGreaterThanOrEqual(700);
  });

  it("sees a wrapper gate above an inner .map return (the case-table blind spot)", () => {
    // components/portal/case-table.tsx is CORRECT: its grid sits inside `hidden … md:block` with a
    // `md:hidden` card list beside it. A scanner that reads only the grid's own classes calls this a
    // defect; one that stops climbing at the inner `return (` never reaches the wrapper.
    const ct = sites.filter((s) => s.file === "components/portal/case-table.tsx");
    expect(ct.length, "case-table's grids are not being found").toBeGreaterThan(0);
    for (const s of ct) {
      expect(s.gate, `case-table.tsx:${s.line} — the md:block wrapper gate was not seen`).not.toBeNull();
    }
    expect(
      ct.some(isOffender),
      "case-table.tsx is being reported as an offender again. It is not one — it ships a md:hidden " +
        "card list. This is the false positive that made the first three scanner passes untrustworthy.",
    ).toBe(false);
  });

  it("still finds every offender the audit measured — the list is not stale", () => {
    // ⚠ THIS IS THE TEST THAT MAKES THE LIST SHRINK. When a fix lands, this fails until its row is
    // deleted from KNOWN_OFFENDERS. It is impossible for the list to describe a world that no longer
    // exists, and impossible for the scanner to go blind without saying so.
    const found = new Set(offenders.map((o) => o.file));
    const missing = KNOWN_OFFENDERS.filter((k) => !found.has(k.file));
    expect(
      missing.map((m) => m.file),
      "these were measured as broken and the scanner no longer sees them. EITHER you fixed them — " +
        "delete their rows from KNOWN_OFFENDERS — OR the scanner has gone blind, which is worse " +
        "than the bug. Do not delete a row without opening the file.",
    ).toEqual([]);
  });

  it("names the three the founder ruled BROKEN, explicitly", () => {
    // Ordered priority for the remediation: /admin/support first.
    const found = new Set(offenders.map((o) => o.file));
    for (const f of [
      "app/(admin)/admin/support/page.tsx",
      "app/(admin)/admin/billing/page.tsx",
      "app/(admin)/admin/dashboard/page.tsx",
    ]) {
      expect(found.has(f), `${f} is one of the three BROKEN routes and the scanner cannot see it`).toBe(true);
    }
  });
});

describe("LOCK — no grid overflows a phone without an alternative form", () => {
  it("no NEW offender", () => {
    const known = new Set(KNOWN_OFFENDERS.map((k) => k.file));
    const fresh = offenders
      .filter((o) => !known.has(o.file))
      .map((o) => {
        const over = Math.round(o.minWidth - contentBox(360, o.surface));
        return `${o.file}:${o.line} — grid-cols-[${o.spec}] needs ${Math.round(o.minWidth)}px, ` +
          `overflows the ${contentBox(360, o.surface)}px content box by ${over}px (wrapper: ${o.overflow})`;
      });
    expect(
      fresh,
      "a fixed-track grid renders at 360px and does not fit. Give it a breakpoint gate and a card " +
        `form below it — components/portal/case-table.tsx is the pattern:\n${fresh.join("\n")}`,
    ).toEqual([]);
  });

  it("every offender is a CLIPPED or unwrapped one — none is silently scrollable", () => {
    // Documenting the actual harm: `overflow-hidden` means the excess cannot be reached at all,
    // which is why /admin/cases read as "the link does nothing" rather than "the table is wide".
    for (const o of offenders) {
      expect(["clipped", "none"]).toContain(o.overflow);
    }
  });

  it("client surfaces have NO offender, at any of the four widths", () => {
    // THE BAR THAT DOES NOT BEND (founder, 2026-08-25): a client who buys on a phone must be able to
    // submit, watch and read a report. Admin may be dense; this may not.
    const bad: string[] = [];
    for (const s of sites) {
      if (!CLIENT_SURFACES.test(s.file)) continue;
      for (const w of TEST_WIDTHS) {
        if (s.gate !== null && s.gate > w) continue;
        const over = Math.round(s.minWidth - contentBox(w, s.surface));
        if (over > 0) bad.push(`${s.file}:${s.line} at ${w}px → +${over}px`);
      }
    }
    expect(bad, `a CLIENT surface overflows:\n${bad.join("\n")}`).toEqual([]);
  });
});

describe("LOCK — tables can be reached", () => {
  const tables = appFiles(repo).flatMap((f) => scanTables(repo, f));

  it("finds tables at all", () => {
    expect(tables.length, "the table scanner found nothing").toBeGreaterThan(8);
  });

  it("no NEW table without a horizontal scroll container", () => {
    const known = new Set(KNOWN_UNWRAPPED_TABLES);
    const fresh = tables
      .filter((t) => t.overflow !== "scrolls" && !known.has(t.file))
      .map((t) => `${t.file}:${t.line}`);
    expect(
      fresh,
      `a <table> has no overflow-x-auto ancestor, so its columns squeeze instead of scrolling:\n${fresh.join("\n")}`,
    ).toEqual([]);
  });

  it("the unwrapped-table list is not stale", () => {
    const unwrapped = new Set(tables.filter((t) => t.overflow !== "scrolls").map((t) => t.file));
    const fixed = KNOWN_UNWRAPPED_TABLES.filter((f) => !unwrapped.has(f));
    expect(fixed, "wrapped now — delete these rows from KNOWN_UNWRAPPED_TABLES").toEqual([]);
  });
});

describe("LOCK — 44px tap targets on client surfaces", () => {
  const targets = appFiles(repo)
    .filter((f) => CLIENT_SURFACES.test(f))
    .flatMap((f) => scanTapTargets(repo, f));

  it("the tap-target scanner sees controls at all", () => {
    // Same self-test discipline: prove it is looking before trusting a clean sheet.
    const all = appFiles(repo).filter((f) => CLIENT_SURFACES.test(f))
      .flatMap((f) => scanTapTargets(repo, f));
    expect(all.length, "the tap-target scanner found nothing on any client surface").toBeGreaterThan(10);
  });

  it("no NEW control under 44px on a client surface", () => {
    // WCAG 2.5.5 / platform guidance. INLINE LINKS ARE EXEMPT and fall out for free: only elements
    // carrying an EXPLICIT size class are measured, and a link inside a paragraph carries none.
    const known = new Set(KNOWN_SMALL_TARGETS);
    const fresh = targets
      .filter((t) => !known.has(t.file))
      .map((t) => `${t.file}:${t.line} <${t.element}> ≈${t.height}px (${t.from})`);
    expect(
      fresh,
      `a control on a client surface is under 44px. Add min-h-11:\n${fresh.join("\n")}`,
    ).toEqual([]);
  });

  it("the small-target list is not stale", () => {
    const still = new Set(targets.map((t) => t.file));
    const fixed = KNOWN_SMALL_TARGETS.filter((f) => !still.has(f));
    expect(fixed, "these reach 44px now — delete their rows from KNOWN_SMALL_TARGETS").toEqual([]);
  });
});

describe("LOCK — the content-box arithmetic itself", () => {
  it("1024px buys almost nothing over 768px — the sidebar eats the gain", () => {
    // ⚠ CORRECTED 2026-08-25. I first wrote this as "1024 is the TIGHTEST width in the system" and
    // THIS ASSERTION CAUGHT ME: 728 is not less than 720. The real relationship is worse in a more
    // useful way, and it is why these screens were built and verified in good faith:
    //
    //   768px  → 720px of content   (sidebar is an off-canvas drawer)
    //   1024px → 728px of content   (sidebar becomes a STATIC 248px column and eats 248 of the 256
    //                                extra pixels, so crossing the lg breakpoint gains EIGHT PIXELS)
    //   1280px → 984px of content
    //
    // So 1024 is effectively tablet-portrait width, and a 1280 window hands you 256px MORE than a
    // real 1024 laptop. "Works on my laptop" is measured at the one width that flatters the layout.
    expect(contentBox(768, "admin")).toBe(720);
    expect(contentBox(1024, "admin")).toBe(728);
    expect(
      contentBox(1024, "admin") - contentBox(768, "admin"),
      "crossing lg must gain almost nothing — if this grows, the sidebar stopped being static and " +
        "the whole premise of the 1024 test width has changed",
    ).toBe(8);
    expect(
      contentBox(1280, "admin") - contentBox(1024, "admin"),
      "how much a 1280 window flatters you over a real 1024 laptop",
    ).toBe(256);
    expect(contentBox(360, "admin")).toBe(328);
  });

  it("track arithmetic matches the measured browser values", () => {
    // /admin/cases, measured at 604px of grid + the row's own padding = the 620px this computes.
    const tracks = splitTracks("96px_1fr_90px_130px_140px_72px");
    const min = tracks.reduce((a, t) => a + trackMin(t), 0);
    expect(min).toBe(528);
    expect(min + 12 * (tracks.length - 1) + 16 * 2).toBe(620);
    expect(trackMin("minmax(200px,1.6fr)"), "minmax floors at its first argument").toBe(200);
    expect(trackMin("1fr"), "fr collapses to zero").toBe(0);
  });
});
