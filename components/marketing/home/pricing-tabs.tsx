"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { oneTimePlans, subscriptionPlans, COMING_SOON_LABEL, type Plan } from "@/lib/content/pricing";
import { factsForPlan } from "@/lib/content/planFacts";
import type { PlanType } from "@/lib/constants/plans";

// Homepage pricing, from hyprriq_flow_v2.html §5. Two tabs, two cards each.
//
// EVERY NUMBER ON THESE CARDS IS DERIVED (lib/content/planFacts.ts) — credits, brand caps,
// assessment areas and delivery all come from the ruled registries. The spec hand-typed them and
// they happened to be right; a correct hardcoded number is still a defect, because it goes wrong
// silently at the next ruling and no test catches a value that is merely stale.
//
// COMING-SOON CARDS CARRY NO BUY PATH. single_149 and scale_499 are off sale while KEEPA_LIVE is
// false; the checkout route refuses them server-side with a 403. That refusal is the control — but
// a card that LOOKS buyable is a broken promise even when the server says no, so the CTA is
// replaced by an honest note rather than a disabled-looking button. `comingSoon` derives from
// PLANS_ON_SALE; it is never set by hand here.

const TABS = [
  { id: "single", label: "Single reports", plans: oneTimePlans },
  { id: "monthly", label: "Monthly plans", plans: subscriptionPlans },
] as const;

function PlanCard({ plan }: { plan: Plan }) {
  const facts = factsForPlan(plan.id as PlanType);
  const soon = plan.comingSoon;

  return (
    <div
      className={`grid rounded-card-lg p-5 sm:p-[26px] ${
        soon
          ? "border border-dashed border-line-strong bg-subtle"
          : "border border-action bg-surface shadow-[0_0_0_1px_var(--color-action)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] ${
            soon ? "text-muted" : "text-action"
          }`}
        >
          {plan.name}
        </span>
        {soon && (
          <span className="rounded-chip bg-cyan-tint px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-cyan">
            {COMING_SOON_LABEL}
          </span>
        )}
        {plan.popular && !soon && (
          <span className="rounded-chip bg-brand-tint px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-anchor">
            Most popular
          </span>
        )}
      </div>

      <div
        className={`mt-2.5 font-display text-[34px] font-medium tracking-[-0.035em] sm:text-[44px] ${
          soon ? "text-ink-2" : "text-ink"
        }`}
      >
        {plan.price}
        <span className="font-sans text-[15px] font-normal tracking-normal text-muted">
          {" "}
          {plan.cadence === "one-time" ? "once" : plan.cadence}
        </span>
      </div>
      <p className="mt-1 text-[14px] text-muted sm:text-[15px]">{plan.meta}</p>

      <ul className="mt-5">
        {facts.map((f) => (
          <li
            key={f.label}
            className="flex justify-between gap-3 border-b border-line py-2 text-[14.5px] last:border-b-0 sm:py-2.5 sm:text-[15.5px]"
          >
            <span className="text-muted">{f.label}</span>
            <span className="text-right font-semibold text-ink">{f.value}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 self-end">
        {soon ? (
          <p className="rounded-control border border-dashed border-line-strong p-3 text-center text-[13px] text-muted sm:text-[14px]">
            Opens when category compliance research goes live
          </p>
        ) : (
          <Link
            href="/pricing"
            className="flex min-h-11 w-full items-center justify-center rounded-control bg-action px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-anchor"
          >
            {plan.id === "single_99" ? "Vet a supplier" : `Start with ${plan.name}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export function PricingTabs() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("single");
  const base = useId();

  return (
    <>
      <div
        role="tablist"
        aria-label="Pricing"
        className="mb-6 inline-flex w-full rounded-card border border-line bg-subtle p-1 sm:mb-7 sm:w-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`${base}-${t.id}-tab`}
            aria-selected={active === t.id}
            aria-controls={`${base}-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`min-h-11 flex-1 rounded-control px-5 text-[14px] font-semibold transition-colors sm:flex-none sm:text-[15px] ${
              active === t.id ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,61,72,.12)]" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-${t.id}`}
          aria-labelledby={`${base}-${t.id}-tab`}
          hidden={active !== t.id}
          className="grid gap-3.5 sm:gap-5 md:grid-cols-2"
        >
          {t.plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      ))}
    </>
  );
}
