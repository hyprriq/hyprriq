import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalFlagBanner } from "@/components/admin/legal-flag-banner";

// ── TRACKER 4.11 — "Verify ⚖ LEGAL FLAG banner renders. Built, unverified." This is the render
// verification: the component goes through React's REAL renderer (renderToStaticMarkup), not a
// condition check on the source. Two-sided, per the fixture rule.

describe("the ⚖ LEGAL FLAG banner renders through React's real renderer", () => {
  it("a lawsuit disclosure produces the banner, naming the signal, with the loud styling", () => {
    const html = renderToStaticMarkup(
      <LegalFlagBanner notes="The vendor threatened a lawsuit after we disputed the invoice." />,
    );
    expect(html).toContain("⚖ LEGAL FLAG");
    expect(html).toContain("lawsuit");
    expect(html).toContain("No legal advice; review before any response.");
    expect(html).toMatch(/bg-deny-bg/);
    expect(html).toMatch(/text-deny-ink/);
  });

  it("multiple signals all appear, joined", () => {
    const html = renderToStaticMarkup(
      <LegalFlagBanner notes="Their attorney sent a cease and desist about our listings." />,
    );
    expect(html).toContain("⚖ LEGAL FLAG");
    expect(html.match(/attorney|cease and desist/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("innocent notes render NOTHING — not an empty banner", () => {
    expect(renderToStaticMarkup(<LegalFlagBanner notes="They say they ship from an EU warehouse; pricing feels low." />)).toBe("");
  });

  it("null/undefined notes render nothing", () => {
    expect(renderToStaticMarkup(<LegalFlagBanner notes={null} />)).toBe("");
    expect(renderToStaticMarkup(<LegalFlagBanner notes={undefined} />)).toBe("");
  });
});
