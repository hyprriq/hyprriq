import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { AREA_NAMES, AREA_DEFS } from "@/lib/content/reportCopy";

export const metadata: Metadata = {
  title: "Wholesale supplier verification for agencies & VAs — HyprrIQ",
  description:
    "Your clients buy inventory on your advice. HyprrIQ is how sourcing agencies, VAs and consultants check a wholesale supplier before recommending one — a researched verdict with the evidence behind it.",
};

// ── /PARTNERS (founder-ruled 2026-08-21) — the page the first clients come from: VAs, agencies
// and consultants who manage sourcing for Amazon sellers. Grant invite links LAND HERE (the
// /grant/[code] handler redirects with ?invited=1), so a partner arrives with context instead
// of a bare token screen. Copy rules held: "a full assessment", never a tier name, until $149
// and Scale open. Assessment-area copy is IMPORTED from the canonical modules, never re-typed.
// SEO: nobody targets "wholesale supplier verification for agencies" — this page does.

const PARTNER_AREAS = ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment"] as const;

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>;
}) {
  const { invited } = await searchParams;
  return (
    <>
      {invited === "1" && (
        <div className="border-b border-line bg-brand-tint/70">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 lg:px-8">
            <p className="text-[14px] text-ink">
              <b>Your free full assessment is attached to this link.</b> Create your account and it&rsquo;s
              applied automatically — nothing to type.
            </p>
            <Link href="/sign-up" className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:opacity-90">
              Create your account
            </Link>
          </div>
        </div>
      )}

      <section className="border-b border-line" style={{ background: "linear-gradient(180deg, #FAF9F7 0%, #FFFFFF 100%)" }}>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
            For sourcing agencies, VAs &amp; consultants
          </p>
          <h1 className="mt-3 text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold leading-[1.07] text-ink">
            Your clients buy inventory on your advice.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-2">
            HyprrIQ is how you check a wholesale supplier <i>before</i> you recommend one — independent
            research on the supplier, their connection to the brands, and the brands&rsquo; posture toward
            marketplace sellers, delivered as one verdict with the evidence behind it.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href="/sample-report" className="rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-surface hover:opacity-90">
              See a real report
            </Link>
            <Link href="/how-to-read" className="rounded-lg border border-line bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink-2 hover:bg-subtle">
              How to read one
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">The check that protects your recommendation</h2>
            <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
              When a supplier goes wrong, it&rsquo;s your client&rsquo;s money — and your name on the
              recommendation. A report answers the three questions that matter before anyone wires a deposit:
            </p>
            <dl className="mt-6 space-y-4">
              {PARTNER_AREAS.map((k) => (
                <div key={k} className="rounded-card border border-line bg-base p-5">
                  <dt className="text-[15px] font-bold text-ink">{AREA_NAMES[k]}</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{AREA_DEFS[k]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] text-muted">
              Reports state plainly what was verified, what was assessed, and what could not be established —
              you pass the evidence to your client, not just a yes or no.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-base">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">Try it on a real supplier, free</h2>
            <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
              We give sourcing professionals a <b>free full assessment</b> — every assessment area, one
              complete report on a supplier you&rsquo;re actually evaluating. No card, no subscription. If the
              report earns a place in your workflow, we should talk about referrals.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="mailto:hello@hyprriq.com?subject=Partner%20free%20assessment"
                className="rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-surface hover:opacity-90"
              >
                Request your free assessment
              </a>
              <p className="text-[13px] text-muted">Already have an invite link? It applies itself when you register.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
