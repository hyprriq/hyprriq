"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  subscriptionPlans,
  oneTimePlans,
  creditExplainer,
  type Plan,
} from "@/lib/content/pricing";

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`flex h-full flex-col rounded-[var(--radius-card)] border bg-surface p-7 ${
        plan.popular ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-ink">{plan.name}</h3>
        {plan.popular && (
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-ink">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-ink">{plan.price}</span>
        <span className="text-ink-2">{plan.cadence}</span>
      </p>
      <p className="mt-1 text-sm text-ink-2">{plan.meta}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.points.map((pt) => (
          <li key={pt} className="flex gap-2.5 text-[15px] text-ink-2">
            <Check size={18} strokeWidth={2.25} className="mt-0.5 flex-none text-brand" aria-hidden="true" />
            {pt}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold transition-colors ${
          plan.popular
            ? "bg-brand text-white hover:bg-brand-hover"
            : "border border-line-strong bg-surface text-ink hover:bg-subtle"
        }`}
      >
        Get started
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PricingPlans() {
  const [mode, setMode] = useState<"subscription" | "one_time">("subscription");
  const plans = mode === "subscription" ? subscriptionPlans : oneTimePlans;

  return (
    <div>
      {/* Toggle */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-subtle p-1">
        {(
          [
            ["subscription", "Subscribe monthly"],
            ["one_time", "Buy a single report"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === value
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(26,25,23,0.08)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={`mx-auto mt-10 grid gap-5 ${
          mode === "subscription" ? "max-w-3xl sm:grid-cols-2" : "max-w-sm"
        }`}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {mode === "subscription" ? (
        <p className="mt-8 text-center text-[15px] text-ink-2">
          {creditExplainer}
        </p>
      ) : (
        <p className="mt-8 text-center text-[15px] text-ink-2">
          Sourcing regularly?{" "}
          <button
            type="button"
            onClick={() => setMode("subscription")}
            className="font-semibold text-brand hover:text-brand-hover"
          >
            Subscribe and save per report
          </button>
        </p>
      )}
    </div>
  );
}
