"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutButton } from "@/components/portal/checkout-button";
import {
  PLAN_NAME,
  PLAN_PRICE_LABEL,
  PLAN_CADENCE,
  PLAN_CREDITS_PER_CYCLE,
  PLAN_BRAND_CAPS,
  PLAN_SLA_DAYS,
  PLAN_ROLLOVER_LIMIT,
  PLAN_TYPES,
  type PlanType,
} from "@/lib/constants/plans";

function planBullets(plan: PlanType): string[] {
  const credits = PLAN_CREDITS_PER_CYCLE[plan];
  const sub = plan !== "single_99";
  return [
    sub ? `${credits} research reports per month` : `${credits} complete report`,
    `Up to ${PLAN_BRAND_CAPS[plan]} brands per report`,
    "Full 5-dimension research",
    "14-field document review if uploaded",
    `${PLAN_SLA_DAYS[plan]} business day delivery`,
    ...(PLAN_ROLLOVER_LIMIT[plan] > 0
      ? [`Up to ${PLAN_ROLLOVER_LIMIT[plan]} credits roll over each month`]
      : []),
  ];
}

const STEPS = [1, 2, 3] as const;

export function OnboardingFlow({
  fullName,
  companyName,
  plan,
  initialStep = 1,
  justCheckedOut = false,
}: {
  fullName: string;
  companyName: string;
  plan: PlanType | null;
  initialStep?: 1 | 2 | 3;
  justCheckedOut?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [name, setName] = useState(fullName);
  const [company, setCompany] = useState(companyName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(dest: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, company_name: company }),
      });
      if (!res.ok) throw new Error("Could not save. Please try again.");
      router.push(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-base px-5 py-10">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-7 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                s <= step ? "bg-brand" : "bg-line"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">
              Welcome to HyprrIQ
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              Let&rsquo;s confirm your details
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              We&rsquo;ll use these to address your reports correctly.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[14px] font-medium text-ink">Your name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="text-[14px] font-medium text-ink">
                  Company name{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Agarwal Trading LLC"
                  className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Continue →
            </button>
            <button
              type="button"
              onClick={() => finish("/portal/dashboard")}
              disabled={busy}
              className="mt-3 w-full text-center text-[14px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              {plan ? `You're on the ${PLAN_NAME[plan]} Plan` : "Choose your plan"}
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              {plan
                ? "Here's what's included — you're all set to continue."
                : "Pick a plan to start vetting suppliers. You can change or cancel anytime."}
            </p>

            {plan ? (
              <>
                <div className="mt-5 rounded-card border border-line bg-base p-5">
                  <div className="font-display text-lg font-extrabold text-brand">{PLAN_NAME[plan]} Plan</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {PLAN_PRICE_LABEL[plan]} {PLAN_CADENCE[plan]}
                    {plan !== "single_99" ? " • renews monthly" : ""}
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {planBullets(plan).map((b) => (
                      <li key={b} className="flex items-start gap-2 text-[14px] text-ink-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-[14px] font-medium text-muted hover:text-ink">
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    Continue →
                  </button>
                </div>
              </>
            ) : justCheckedOut ? (
              <div className="mt-5">
                <div className="rounded-card border border-clear-ink/30 bg-clear-bg p-5 text-center">
                  <div className="text-sm font-semibold text-clear-ink">Payment received — finalizing your plan…</div>
                  <p className="mt-1 text-[13px] text-ink-2">This takes a few seconds. Refresh to continue.</p>
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Refresh
                  </button>
                </div>
                <button type="button" onClick={() => setStep(1)} className="mt-4 text-[14px] font-medium text-muted hover:text-ink">
                  ← Back
                </button>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3">
                  {PLAN_TYPES.map((p) => (
                    <div key={p} className="flex items-center justify-between gap-3 rounded-card border border-line bg-base p-4">
                      <div>
                        <div className="font-display text-base font-extrabold text-brand">{PLAN_NAME[p]}</div>
                        <div className="text-[13px] text-muted">
                          {PLAN_PRICE_LABEL[p]} {PLAN_CADENCE[p]} • {PLAN_CREDITS_PER_CYCLE[p]}{" "}
                          {p === "single_99" ? "report" : "credits/mo"}
                        </div>
                      </div>
                      <CheckoutButton
                        plan={p}
                        redirect="onboarding"
                        className="shrink-0 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover"
                      >
                        Choose →
                      </CheckoutButton>
                    </div>
                  ))}
                </div>
                {/* Hard gate: no "Continue" without a plan. Skip is explicit + separate. */}
                <div className="mt-6 flex items-center justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-[14px] font-medium text-muted hover:text-ink">
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => finish("/portal/dashboard")}
                    disabled={busy}
                    className="text-[14px] font-medium text-muted hover:text-ink disabled:opacity-50"
                  >
                    Skip for now →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              You&rsquo;re ready to go
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Submit your first request and receive a structured verdict on your
              supplier within {plan ? PLAN_SLA_DAYS[plan] : 5} business days.
            </p>
            <div className="mt-5 rounded-card border border-line bg-base p-5">
              <div className="text-[14px] font-semibold text-ink">
                What happens when you submit
              </div>
              <ol className="mt-3 space-y-3">
                {[
                  "Tell us the supplier, website, and the brands you're sourcing",
                  "Upload an invoice or LOA if you have one — improves accuracy",
                  "We research across 5 dimensions, your report goes through quality review, and you receive your verdict",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-ink-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-[12px] font-bold text-brand-ink">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
            {error && <p className="mt-4 text-[14px] text-deny-ink">{error}</p>}
            <button
              type="button"
              onClick={() => finish("/portal/submit")}
              disabled={busy}
              className="mt-6 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? "Setting up…" : "Submit my first research request →"}
            </button>
            <button
              type="button"
              onClick={() => finish("/portal/dashboard")}
              disabled={busy}
              className="mt-3 w-full text-center text-[14px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Explore the portal first
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={busy}
              className="mt-3 w-full text-center text-[14px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
