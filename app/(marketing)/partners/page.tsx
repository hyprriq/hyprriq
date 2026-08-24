import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { PartnerRequestForm } from "@/components/marketing/partner-request-form";
import { INVITE_LINK_INACTIVE_COPY } from "@/lib/content/partnerRequest";
import { checkGrantCode, logGrantCheckFailOpen } from "@/lib/data/grantCheck";
import { PageSection, Prose, RelatedLinks } from "@/components/marketing/page-shell";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

export const metadata: Metadata = {
  title: "For VAs and Sourcing Agencies | HyprrIQ",
  description:
    "Your clients buy on your recommendation. Check the supplier before you make it, and hand over a report with your reasoning already written down.",
  alternates: { canonical: "/partners" },
};

// ── /PARTNERS — REBUILT 2026-08-24 under founder ruling 2 ─────────────────────────────────────
//
// The page BODY is rebuilt from HyprrIQ_CONTENT_FINAL.md. Two things are DELIBERATELY UNTOUCHED,
// because the founder's ruling scoped this page's rebuild away from them:
//
//   1. THE INVITE BANNERS (both states) are carried over verbatim — markup, copy and logic. They
//      are the invite LANDING, which is queued separately. They are also load-bearing in a way a
//      restyle could quietly break: the banner CHECKS the grant code before it promises anything
//      (item 1b, 2026-08-22), because this render was once the last point that trusted a query
//      param — /partners?invited=1 typed by hand showed "your assessment is attached" unverified.
//   2. THE REQUEST FORM and its surrounding copy, which is MUST_PASS-locked.
//
// ⚠ FLAGGED: both now sit inside a page built on the new system, so they read a step older than
// everything around them — the banner CTA is still on the pre-ruling `rounded-lg bg-ink`. That is
// the cost of the scoping and it is visible; say the word and they get the same 20 minutes.
//
// Grant invite links LAND HERE (/grant/[code] redirects with ?invited=1), so a partner arrives with
// context instead of a bare token screen.

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; invite?: string; code?: string }>;
}) {
  const { invited, invite, code } = await searchParams;
  const safeCode = code && code.length <= 64 ? code : null;

  // ── THE BANNER CHECKS BEFORE IT PROMISES (item 1b, 2026-08-22): invited=1 without a code renders
  // the plain page (nothing to verify → no promise), and invited=1 with a code re-checks it through
  // the ONE shared validity path. Fail-open on lookup error (1c, founder-accepted) — and never
  // silently: logged to console + audit_log. ──
  let inviteState: "banner" | "inactive" | "none" = "none";
  if (invite === "inactive") inviteState = "inactive";
  else if (invited === "1" && safeCode) {
    const check = await checkGrantCode(safeCode);
    if (check.outcome === "unavailable") {
      await logGrantCheckFailOpen("partners_banner", safeCode, check.error);
      inviteState = "banner";
    } else {
      inviteState = check.outcome === "open" ? "banner" : "inactive";
    }
  }

  return (
    <>
      {/* Click-time honesty (2026-08-22): a revoked/expired/used/garbage invite link lands here
          instead of the banner — the promise is never made, and the request form stays open. */}
      {inviteState === "inactive" && (
        <div className="border-b border-line bg-subtle">
          <div className="mx-auto max-w-3xl px-5 py-3.5 lg:px-8">
            <p className="text-[14px] text-ink-2">{INVITE_LINK_INACTIVE_COPY}</p>
          </div>
        </div>
      )}
      {inviteState === "banner" && (
        <div className="border-b border-line bg-brand-tint/70">
          <div className="mx-auto max-w-3xl px-5 py-3.5 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-ink">
                <b>Your free full assessment is attached to this link.</b> Create your account in this
                browser and it&rsquo;s applied automatically — nothing to type.
              </p>
              <Link href="/sign-up" className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:opacity-90">
                Create your account
              </Link>
            </div>
            {/* Cross-device carrier (grant rework, 2026-08-21): the cookie only survives THIS
                browser — a phone-click / laptop-register path needs the code in hand. */}
            {safeCode && (
              <p className="mt-2 text-[13px] text-ink-2">
                Registering on a different device? Open this same link there, or enter your access code{" "}
                <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-ink">{safeCode}</span>{" "}
                on your Billing page after you sign up.
              </p>
            )}
          </div>
        </div>
      )}

      <header className="border-b border-line bg-sand">
        <div className="mx-auto max-w-[1180px] px-5 py-12 sm:py-20 lg:px-10">
          <h1 className="max-w-[20ch] text-ink">For VAs and sourcing agencies</h1>
          <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.55] text-ink-2 sm:mt-5 sm:text-[19px] sm:leading-[1.58]">
            Your risk is not the same as your client&rsquo;s. They lose money on a bad supplier. You
            lose the client — and then you lose the next three, because this industry talks.
          </p>
        </div>
      </header>

      <PageSection tone="surface">
        <h2 className="text-ink">The recommendation is the product</h2>
        <Prose className="mt-3">
          <p>
            When you hand a client a supplier, you are lending them your judgement. If it goes wrong,
            the post-mortem is not about the distributor. It is about why you recommended them.
          </p>
          <p>
            That conversation is much easier when you can show what was checked, what came back, and
            what could not be established at the time you made the call. Not because it proves you
            were right — nobody can promise that — but because it shows the recommendation was made
            on evidence rather than on a good feeling about a price list.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">What a report gives you to hand over</h2>
        <Prose className="mt-3">
          <p>
            One verdict, in {CASE_SLA_HOURS} hours. The findings and every source behind them. What
            could not be confirmed, stated plainly. And a set of questions written for that specific
            supplier, which your client can send themselves.
          </p>
          <p>
            That last part tends to be the one clients remember. You gave them something to do, not
            just an opinion.
          </p>
        </Prose>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/sample-report"
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-action px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-anchor"
          >
            See a real report
          </Link>
          <Link
            href="/how-to-read"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-control-border bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-subtle"
          >
            How to read one
          </Link>
        </div>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">The same questions, every time</h2>
        <Prose className="mt-3">
          <p>The value to you is consistency more than depth.</p>
          <p>
            You assess suppliers on good weeks and bad ones. A method that does not vary means the
            supplier you check when you are busy gets the same treatment as the one you check when
            you are curious — and your client gets the same standard either way.
          </p>
          <p>
            Two reports on the same evidence reach the same verdict. That is what makes a report
            something you can put your name next to.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="pale">
        <h2 className="text-ink">What we won&rsquo;t do for you</h2>
        <Prose className="mt-3">
          <p>
            We will not tell your client a supplier is authorized, that they will get ungated, or
            that their account is safe. We will not do it for you either.
          </p>
          <p>
            If a report is going to sit under your recommendation, it is worth knowing that it will
            not overstate anything to make your recommendation look better. That is the point of it.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "See a real report", href: "/sample-report" },
            { label: "Contact us", href: "/contact" },
          ]}
        />
      </PageSection>

      {/* ⛔ UNTOUCHED — the request form and its copy are queued separately (founder ruling 2). */}
      {inviteState !== "banner" && (
        <section className="border-t border-line bg-base">
          <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold text-ink">Try it on a real supplier, free</h2>
              <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
                We give sourcing professionals a <b>free full assessment</b> — every assessment area, one
                complete report on a supplier you&rsquo;re actually evaluating. No card, no subscription. If the
                report earns a place in your workflow, we should talk about referrals.
              </p>
              <div className="mt-6">
                <PartnerRequestForm />
              </div>
              <p className="mt-3 text-[13px] text-muted">Already have an invite link? It applies itself when you register.</p>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
