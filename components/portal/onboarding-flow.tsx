"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutButton } from "@/components/portal/checkout-button";
import type { ClientProfile } from "@/lib/data/client";
import { PRIMARY_MARKETPLACES, COUNTRIES } from "@/lib/constants/marketplaces";
import {
  PLAN_NAME,
  PLAN_PRICE_LABEL,
  PLAN_CADENCE,
  PLAN_CREDITS_PER_CYCLE,
  PLAN_BRAND_CAPS,
  CASE_SLA_HOURS,
  PLAN_ROLLOVER_LIMIT,
  PLANS_ON_SALE,
  type PlanType,
} from "@/lib/constants/plans";
import { requiredFindingTracks } from "@/lib/constants/tracks";
import { planAcceptsUploads } from "@/lib/constants/uploads";

// CLAIMS FIX (founder-ruled 2026-08-14): the research bullet derives from the plan's own track
// registry — never hardcoded. Client-facing area names, never "dimension". The old static
// "Full 5-dimension research" was false on the 3-area $99 tier.
const AREA_NAME: Record<number, string> = {
  1: "Supplier Legitimacy", 2: "Supply-Chain Relationship", 3: "Brand Risk",
  4: "Documentation Review", 5: "Sourcing Logic",
};

function researchBullet(plan: PlanType): string {
  const areas = requiredFindingTracks(plan);
  return areas.length >= 5
    ? "Research across all five assessment areas"
    : `Research across ${areas.length} assessment areas: ${areas.map((n) => AREA_NAME[n]).join(", ")}`;
}

function planBullets(plan: PlanType): string[] {
  const credits = PLAN_CREDITS_PER_CYCLE[plan];
  const sub = plan !== "single_99";
  return [
    sub ? `${credits} research reports per month` : `${credits} complete report`,
    `Up to ${PLAN_BRAND_CAPS[plan]} brands per report`,
    researchBullet(plan),
    // $99 takes no uploads (planAcceptsUploads is the server rule) — the bullet only renders
    // where document review can actually happen (claims ruling 2026-08-14).
    ...(planAcceptsUploads(plan) ? ["Document review when you upload paperwork"] : []),
    `Delivered within ${CASE_SLA_HOURS} hours`,
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
  profile,
}: {
  fullName: string;
  companyName: string;
  plan: PlanType | null;
  initialStep?: 1 | 2 | 3;
  justCheckedOut?: boolean;
  profile?: ClientProfile | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [name, setName] = useState(fullName);
  const [company, setCompany] = useState(companyName);
  // Item 1 business-profile fields (required ones gate Step 1; rest optional).
  const [contactName, setContactName] = useState(profile?.contact_name ?? fullName ?? "");
  const [contactPhone, setContactPhone] = useState(profile?.contact_phone ?? "");
  const [marketplace, setMarketplace] = useState(profile?.primary_marketplace ?? "");
  const [marketplaceOther, setMarketplaceOther] = useState(profile?.marketplace_other_name ?? "");
  const [country, setCountry] = useState(profile?.billing_country ?? "");
  const [showMore, setShowMore] = useState(false);
  const [sellsAmazon, setSellsAmazon] = useState(!!profile?.sells_on_amazon);
  const [sellsWalmart, setSellsWalmart] = useState(!!profile?.sells_on_walmart);
  const [amazonStore, setAmazonStore] = useState(profile?.amazon_store_name ?? "");
  const [walmartStore, setWalmartStore] = useState(profile?.walmart_store_name ?? "");
  const [addr1, setAddr1] = useState(profile?.billing_address_line1 ?? "");
  const [addr2, setAddr2] = useState(profile?.billing_address_line2 ?? "");
  const [city, setCity] = useState(profile?.billing_city ?? "");
  const [stateRegion, setStateRegion] = useState(profile?.billing_state ?? "");
  const [zip, setZip] = useState(profile?.billing_zip ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 hard gate — required fields per spec Item 1.
  const step1Valid =
    company.trim() !== "" &&
    contactName.trim() !== "" &&
    contactPhone.trim() !== "" &&
    marketplace !== "" &&
    country !== "" &&
    (marketplace !== "other" || marketplaceOther.trim() !== "");

  // Persist the business profile WITHOUT completing onboarding. Called when
  // leaving Step 1 (so data survives the Stripe checkout redirect, which unmounts
  // this component) and again on finish.
  async function saveProfile(): Promise<boolean> {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: name,
        company_name: company,
        contact_name: contactName,
        contact_phone: contactPhone,
        primary_marketplace: marketplace || null,
        marketplace_other_name: marketplace === "other" ? marketplaceOther : null,
        billing_country: country,
        sells_on_amazon: sellsAmazon,
        sells_on_walmart: sellsWalmart,
        amazon_store_name: sellsAmazon ? amazonStore : null,
        walmart_store_name: sellsWalmart ? walmartStore : null,
        billing_address_line1: addr1,
        billing_address_line2: addr2,
        billing_city: city,
        billing_state: stateRegion,
        billing_zip: zip,
      }),
    });
    return res.ok;
  }

  async function continueFromStep1() {
    if (busy || !step1Valid) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await saveProfile();
      if (!ok) throw new Error("Could not save your details. Please try again.");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(dest: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Persist profile too (covers the "Skip for now" path straight from Step 1).
      await saveProfile();
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
    <div className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
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
              Tell us about your business
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              We&rsquo;ll use these to address your reports and invoices correctly.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[14px] font-medium text-ink">Your name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="text-[14px] font-medium text-ink">Company name</span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Agarwal Trading LLC"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Contact name</span>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Contact phone</span>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[14px] font-medium text-ink">Primary marketplace</span>
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {PRIMARY_MARKETPLACES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              {marketplace === "other" && (
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Please specify</span>
                  <input
                    type="text"
                    value={marketplaceOther}
                    onChange={(e) => setMarketplaceOther(e.target.value)}
                    placeholder="e.g. Etsy, Wayfair"
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-[14px] font-medium text-ink">Country</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              {/* Optional expandable */}
              <button
                type="button"
                onClick={() => setShowMore((s) => !s)}
                className="text-[13px] font-medium text-brand hover:text-brand-hover"
              >
                {showMore ? "− Hide additional details" : "+ Add billing address & other marketplaces (optional)"}
              </button>
              {showMore && (
                <div className="space-y-4 rounded-lg border border-line bg-canvas/50 p-3">
                  <div>
                    <span className="text-[13px] font-medium text-ink">I also sell on</span>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-[14px] text-ink-2">
                        <input type="checkbox" checked={sellsAmazon} onChange={(e) => setSellsAmazon(e.target.checked)} className="h-4 w-4 accent-brand" />
                        Amazon
                      </label>
                      <label className="flex items-center gap-2 text-[14px] text-ink-2">
                        <input type="checkbox" checked={sellsWalmart} onChange={(e) => setSellsWalmart(e.target.checked)} className="h-4 w-4 accent-brand" />
                        Walmart
                      </label>
                    </div>
                  </div>
                  {sellsAmazon && (
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink">Amazon store name</span>
                      <input type="text" value={amazonStore} onChange={(e) => setAmazonStore(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                    </label>
                  )}
                  {sellsWalmart && (
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink">Walmart store name</span>
                      <input type="text" value={walmartStore} onChange={(e) => setWalmartStore(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-[13px] font-medium text-ink">Billing address line 1</span>
                    <input type="text" value={addr1} onChange={(e) => setAddr1(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-medium text-ink">Billing address line 2</span>
                    <input type="text" value={addr2} onChange={(e) => setAddr2(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink">City</span>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink">State</span>
                      <input type="text" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink">ZIP</span>
                      <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-[14px] text-deny-ink">{error}</p>}
            <button
              type="button"
              onClick={continueFromStep1}
              disabled={busy || !step1Valid}
              className="mt-6 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Continue →"}
            </button>
            {!step1Valid && (
              <p className="mt-2 text-center text-[12px] text-muted">
                Company, contact name, phone, marketplace and country are required.
              </p>
            )}
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
                <div className="mt-5 rounded-card border border-line bg-canvas p-5">
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
                    className="min-h-11 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
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
                    className="min-h-11 inline-flex items-center justify-center mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover"
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
                  {/* On-sale plans only (founder-locked 2026-08-22) — the checkout route
                      refuses off-sale tiers regardless; this picker simply tells the truth. */}
                  {PLANS_ON_SALE.map((p) => (
                    <div key={p} className="flex items-center justify-between gap-3 rounded-card border border-line bg-canvas p-4">
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
              supplier within {CASE_SLA_HOURS} hours.
            </p>
            <div className="mt-5 rounded-card border border-line bg-canvas p-5">
              <div className="text-[14px] font-semibold text-ink">
                What happens when you submit
              </div>
              <ol className="mt-3 space-y-3">
                {[
                  "Tell us the supplier, website, and the brands you're sourcing",
                  "Upload an invoice or LOA if you have one — improves accuracy",
                  "We research across the assessment areas your plan includes, your report goes through quality review, and you receive your verdict",
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
