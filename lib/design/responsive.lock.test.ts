import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  scanAll, scanTapTargets, scanControls, scanTables, appFiles, isOffender,
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
  // ✅ /admin/support MIGRATED to <ListTable> 2026-08-25 — was 374px over. Row deleted, as the
  //    staleness test demands. It is now asserted FIXED in the BROKEN-three test below.
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
  // EMPTY, 2026-08-25 — all 36 client-surface controls were raised to the 44px floor in the same
  // sitting the lock was built. The staleness test below keeps it empty: if a control drops under
  // 44px again it lands in "no NEW control", not quietly in this list.
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

  it("resolves grids declared in a CONSTANT, not just inline", () => {
    // ⚠ THIS TEST WAS ITSELF A RULE-14 VIOLATION AND IT BIT WITHIN THE HOUR. Its specimen used to be
    // /admin/support's `const COLS = "grid grid-cols-[…] gap-3"` — the blind spot that hid the widest
    // grid in the codebase from three scanner passes. Then /admin/support was MIGRATED, the constant
    // was deleted, and the test failed: not because the scanner had regressed, but because THE
    // DEFECT IT USED AS PROOF OF LIFE WAS FIXED. A capability test anchored to a specific defect
    // expires the moment you succeed.
    //
    // It now anchors on components/portal/case-table.tsx, which declares its tracks in a TERNARY
    // constant — a persistent specimen, and the harder case, because one initialiser yields TWO
    // specs. If that file is ever migrated too, move this to a fixture rather than deleting it.
    const ct = sites.filter((s) => s.file === "components/portal/case-table.tsx");
    expect(
      ct.length,
      "a grid declared in a constant is invisible again — the className string never contains the " +
        "word `grid`, which is how /admin/support hid",
    ).toBeGreaterThanOrEqual(2);
    expect(
      new Set(ct.map((s) => Math.round(s.minWidth))).size,
      "a ternary constant declares TWO track lists; both must be resolved, not just the first",
    ).toBeGreaterThanOrEqual(2);
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

  it("tracks the founder's three BROKEN routes — one fixed, two to go", () => {
    // The remediation order was /admin/support, then billing, then dashboard. This test moves with
    // it rather than going stale: the fixed one is asserted ABSENT, the rest asserted PRESENT. Move
    // a route from one list to the other only when you have actually migrated it.
    const found = new Set(offenders.map((o) => o.file));
    expect(
      found.has("app/(admin)/admin/support/page.tsx"),
      "/admin/support was migrated to <ListTable> and must no longer overflow. If this fails, the " +
        "migration regressed — or the scanner stopped seeing the file, which is worse.",
    ).toBe(false);
    for (const f of [
      "app/(admin)/admin/billing/page.tsx",
      "app/(admin)/admin/dashboard/page.tsx",
    ]) {
      expect(found.has(f), `${f} is still BROKEN and the scanner cannot see it`).toBe(true);
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
    .flatMap((f) => scanTapTargets(repo, f))
    // A control gated to >=768px never renders on a phone — it is a MOUSE target, not a touch one.
    // Holding a desk-density table row to 44px would inflate it for no accessibility gain.
    .filter((t) => t.gate === null || t.gate < 768);

  it("the tap-target scanner sees controls at all", () => {
    // ⚠ THIS ASSERTION USED TO CALL scanTapTargets AND COUNT THE OFFENDERS — which meant it FAILED
    // the moment the last offender was fixed, and the only way to green it again would have been to
    // weaken it. The self-test had the exact bug it exists to prevent. It now counts every control
    // EXAMINED, because "did it find something broken" and "did it look at anything" are different
    // questions and only the second is proof of life.
    const examined = appFiles(repo).filter((f) => CLIENT_SURFACES.test(f))
      .flatMap((f) => scanControls(repo, f));
    expect(
      examined.length,
      "the tap-target scanner examined NO controls on any client surface — it is blind",
    ).toBeGreaterThan(40);
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

describe("LOCK — the <ListTable> primitive is safe by construction", () => {
  // ⚠ WHY THIS BLOCK EXISTS, and it is standing rule 14 in a new place. ListTable builds its dense
  // grid from an INLINE `gridTemplateColumns`, because the tracks come from the caller's column
  // list. The width scanner reads Tailwind class strings and therefore CANNOT SEE IT. Migrating six
  // lists into a primitive the lock is blind to would have turned the offender list green while
  // deleting the coverage — a detector going quiet exactly as you start trusting it.
  //
  // So the primitive is policed STRUCTURALLY instead: gate the dense grid, ship a card form. Any
  // consumer is then safe by construction, and a page that hand-rolls its own grid still trips the
  // width scanner exactly as before.
  const LIST = fs.readFileSync(path.join(repo, "components/admin/list-table.tsx"), "utf8");
  const code = LIST.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  it("the dense grid never renders below md", () => {
    expect(
      code,
      "the dense table must sit behind `hidden … md:block`, or it reaches a phone at full track width",
    ).toMatch(/hidden[^"]*md:block/);
  });

  it("a card form exists for the widths the dense grid does not cover", () => {
    expect(code, "there must be a md:hidden card list").toMatch(/md:hidden/);
  });

  it("the inline template is only ever used inside the gated half", () => {
    // Both the header row and the body rows carry it; neither may escape the md:block wrapper.
    const gateAt = code.indexOf("md:block");
    const templates = [...code.matchAll(/gridTemplateColumns/g)].map((m) => m.index ?? 0);
    expect(templates.length, "the dense grid should set its template on the header and the rows")
      .toBeGreaterThanOrEqual(2);
    expect(
      templates.every((i) => i > gateAt),
      "a gridTemplateColumns is set OUTSIDE the md:block wrapper — that is an ungated fixed grid " +
        "the width scanner cannot see",
    ).toBe(true);
  });

  it("a row's destination is the WHOLE card, never a button in a clipped column", () => {
    // The /admin/cases defect: the row's only link was a 62x23px button in the last column, clipped
    // to zero visible pixels. A card-sized target cannot be clipped out of existence the same way.
    expect(code).toMatch(/<Link[\s\S]{0,200}className=\{shell\}/);
  });

  it("a column with no card slot still APPEARS on a phone", () => {
    // Default `meta`, not `hide`. A column added without thinking must show up somewhere rather than
    // silently vanish on mobile — the failure direction has to be "too much", never "missing".
    expect(code, "the card-slot default must be `meta`").toMatch(/c\.card \?\? "meta"/);
  });
});
