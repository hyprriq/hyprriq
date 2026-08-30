import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import robots from "@/app/robots";
import { SEARCH_INDEXING_ENABLED } from "./site";
import { PUBLIC_ROUTES } from "@/lib/auth/public-routes";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/content/legal";

// ── LOCK — THE DOMAIN MOVE'S THREE CONDITIONS (founder-ruled 2026-08-24) ──────────────────────
//
// Recorded as TESTS rather than as a checklist, because a checklist is a thing someone remembers.
// All three come off deliberately, in the right order, and the build says so if one is wrong.
//
// ⚠ THE ROBOTS INVERSION — the single most counter-intuitive thing in the move, and the reason
// this file exists. The obvious way to keep a site out of Google is `robots.txt: Disallow: /`.
// THAT PRODUCES THE OPPOSITE OF THE INTENT. Disallow blocks CRAWLING, not INDEXING: Google can
// still index a URL it discovered from an inbound link and list it with no description, and
// because it is forbidden to fetch the page it will NEVER SEE a noindex tag. Blocking the crawler
// makes a bad listing MORE likely, not less.
//
// The correct shape is the inversion: leave robots.txt PERMISSIVE so the crawler is allowed in
// specifically to be told not to index, and carry the instruction in a meta tag. Both halves are
// asserted below — a future "tidy" that adds Disallow: / would look like a tightening and would
// quietly defeat the condition.

const repo = path.resolve(__dirname, "../..");

describe("LOCK — domain move condition 1: the site is not indexable until live Stripe", () => {
  it("emits a site-wide noindex while indexing is disabled", () => {
    const layout = fs.readFileSync(path.join(repo, "app/layout.tsx"), "utf8");
    expect(layout, "the root layout must derive `robots` from SEARCH_INDEXING_ENABLED")
      .toMatch(/robots:\s*SEARCH_INDEXING_ENABLED/);
    expect(layout).toMatch(/index:\s*false/);
    // The flag is the one control. It flips ON the day live Stripe is configured, not before.
    expect(
      SEARCH_INDEXING_ENABLED,
      "SEARCH_INDEXING_ENABLED is true — only correct once live Stripe keys are configured",
    ).toBe(false);
  });

  it("robots.txt stays PERMISSIVE so the crawler can be told not to index", () => {
    // THE INVERSION. If this ever reads Disallow: "/" the condition is defeated, however tidy the
    // change looked. The public pages must remain fetchable for the meta tag to be seen at all.
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    for (const rule of rules) {
      const disallow = rule?.disallow;
      const list = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
      expect(
        list,
        "robots.txt must not blanket-Disallow '/' — that blocks crawling, which PREVENTS the " +
          "noindex tag from ever being read, and leaves the URL indexable from inbound links",
      ).not.toContain("/");
      expect(rule?.allow, "the public surface must stay crawlable").toBe("/");
    }
  });

  it("robots.txt and sitemap.xml are actually REACHABLE by a crawler", () => {
    // CAUGHT IN PHASE 0 OF THE DOMAIN MOVE. Both routes were answering 307 → /sign-in, because the
    // middleware matcher's skip list covers html|css|js|images|fonts|csv|doc|xls|zip|webmanifest —
    // and contains NEITHER .txt NOR .xml. The previous note in public-routes.ts asserted the
    // opposite and said "verified live"; it was not.
    //
    // A permissive robots.txt is worthless if the crawler is redirected to a login page before it
    // can read it, and this would have surfaced only on the day indexing was switched on.
    const list = PUBLIC_ROUTES as readonly string[];
    expect(list, "robots.txt must be publicly reachable").toContain("/robots.txt");
    expect(list, "sitemap.xml must be publicly reachable").toContain("/sitemap.xml");
  });

  it("public/prototype DOES NOT EXIST — deleted, not managed", () => {
    // FOUND BY SWEEP, 2026-08-24, LIVE ON THE PRODUCTION DOMAIN. public/prototype/** answered 200
    // to anyone with the URL — internal admin mockups, client report mockups, the design-system
    // reference, company names and a real case ID among them. The proxy matcher deliberately skips
    // extensioned paths, so Clerk never saw a single .html under it.
    //
    // ⚠ THE GATE WAS THE FIRST FIX AND IT WAS NOT THE RIGHT ONE. Founder ruling 2026-08-25:
    // gated means ONE MATCHER EDIT FROM PUBLIC AGAIN, and that matcher has now failed twice in
    // OPPOSITE DIRECTIONS — hiding /robots.txt behind auth by omitting .txt, and exposing these by
    // including .html. A control that has been wrong in both directions is not a control to lean a
    // data-exposure risk on. Nothing rendered these files. DELETION REMOVES THE CLASS; GATING ONLY
    // MANAGES IT.
    //
    // They live in git history at c1b57ec~1 if ever needed. ⚠ AND THE NAMES REMAIN THERE — the
    // deletion does not clean the repo, only the deploy.
    expect(
      fs.existsSync(path.join(repo, "public/prototype")),
      "public/prototype is back. It carries company names and a real case ID, nothing renders it, " +
        "and everything under public/ is served to the open internet by default. Keep it out of " +
        "the repo, or out of public/ — never both back.",
    ).toBe(false);
  });

  it("and the matcher still gates the path, so a re-add is not instantly public", () => {
    // BELT AND BRACES, DELIBERATELY. The directory is gone, so this asserts nothing today — it is
    // here for the day someone restores it without reading the test above. Deletion is the control;
    // this is what stops the interval between a careless re-add and someone noticing.
    const proxy = fs.readFileSync(path.join(repo, "proxy.ts"), "utf8");
    expect(proxy, "the middleware matcher must cover /prototype regardless of file extension")
      .toMatch(/"\/prototype\/:path\*"/);
    expect(
      (PUBLIC_ROUTES as readonly string[]).some((r) => r.includes("prototype")),
      "/prototype must NOT be a public route",
    ).toBe(false);
  });

  it("still keeps the authenticated and API surfaces out of the crawler", () => {
    // Independent of the launch flag: these carry client data and never belong in an index.
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const disallowed = rules.flatMap((rule) => {
      const d = rule?.disallow;
      return Array.isArray(d) ? d : d ? [d] : [];
    });
    for (const p of ["/portal/", "/admin/", "/api/"]) expect(disallowed).toContain(p);
  });
});

describe("LOCK — domain move condition 3: the legal effective date", () => {
  it("is set, and is not a placeholder", () => {
    // While null the pages render "Effective on launch", which is why a wrong date could never
    // ship before. Now that it is set, THIS is the guard: it must be a real date string.
    expect(LEGAL_EFFECTIVE_DATE, "the legal effective date must be set for the domain move")
      .not.toBeNull();
    expect(
      LEGAL_EFFECTIVE_DATE,
      "expected a written date like 'August 24, 2026'",
    ).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });

  it("is not in the future — it records when the pages went live, not when they will", () => {
    const d = new Date(LEGAL_EFFECTIVE_DATE as string);
    expect(Number.isNaN(d.getTime()), "unparseable effective date").toBe(false);
    // A day of slack: the merge and this test can straddle a timezone boundary.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      d.getTime() <= tomorrow.getTime(),
      "the effective date is in the future — it must equal the day the pages go live",
    ).toBe(true);
  });
});
