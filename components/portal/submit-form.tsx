"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PLAN_NAME,
  brandCapForPlan,
  creditsRequired,
  type PlanType,
} from "@/lib/constants/plans";
import { brandHelper, brandHelperLearnMore, MARKETPLACES } from "@/lib/content/submit";

type Result = {
  case_id: string;
  case_number: string;
  credits_charged: number;
  remaining_balance: number;
};

export function SubmitForm({
  plan,
  creditsAvailable,
}: {
  plan: PlanType | null;
  creditsAvailable: number;
}) {
  const router = useRouter();
  const cap = brandCapForPlan(plan);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vendor, setVendor] = useState("");
  const [website, setWebsite] = useState("");
  const [marketplace, setMarketplace] = useState("amazon_us");
  const [brands, setBrands] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const cost = creditsRequired(brands.length || 1, plan);
  const remainingAfter = creditsAvailable - cost;
  const canSubmit = vendor.trim() !== "" && brands.length > 0 && remainingAfter >= 0;

  function addBrand() {
    const v = draft.trim();
    if (!v) return;
    if (brands.length >= cap) return;
    if (brands.some((b) => b.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    setBrands([...brands, v]);
    setDraft("");
  }

  function removeBrand(i: number) {
    setBrands(brands.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("vendor_name", vendor.trim());
      fd.set("vendor_website", website.trim());
      fd.set("marketplace", marketplace);
      fd.set("client_notes", notes.trim());
      fd.set("brands", JSON.stringify(brands));
      if (file) fd.set("file", file);

      const res = await fetch("/api/cases/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Submission failed.");
      }
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ---- success state (values come straight from the submit response — no
  // re-derivation, no race with a separate balance fetch) ----
  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-surface p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clear-bg text-xl text-clear-ink">✓</div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Research request submitted</h2>
        <p className="mt-1 text-sm text-ink-2">
          Case <span className="font-mono font-semibold">{result.case_number}</span> is in the queue.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Credit Deducted</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.credits_charged}</div>
          </div>
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Remaining Balance</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.remaining_balance}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/portal/cases/${result.case_id}`}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            View case →
          </Link>
          <Link
            href="/portal/dashboard"
            className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">New Research Request</h2>
      <p className="mt-1 text-sm text-ink-2">Tell us about the supplier and brands you want researched.</p>

      {/* stepper */}
      <div className="my-6 flex items-center gap-2">
        {[
          { n: 1, label: "Supplier" },
          { n: 2, label: "Brands & Docs" },
          { n: 3, label: "Confirm" },
        ].map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                step >= s.n ? "bg-brand text-white" : "bg-subtle text-muted"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </div>
            <span className={`text-[12px] font-semibold ${step >= s.n ? "text-ink" : "text-muted"}`}>{s.label}</span>
            {i < 2 && <span className={`h-px flex-1 ${step > s.n ? "bg-brand" : "bg-line"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-surface p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-ink">Step 1 — Supplier</div>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Supplier / vendor name <span className="text-deny-ink">*</span></span>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Universal Supply Co."
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Supplier website <span className="font-normal text-muted">(optional)</span></span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Marketplace</span>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
              >
                {MARKETPLACES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="text-sm font-bold text-ink">Step 2 — Brands & Document Upload</div>
            <div>
              <span className="text-[13px] font-medium text-ink">Brand names <span className="text-deny-ink">*</span></span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-base p-2">
                {brands.map((b, i) => (
                  <span key={b} className="flex items-center gap-1 rounded-md bg-brand-tint px-2 py-1 text-[12px] font-medium text-brand-ink">
                    {b}
                    <button type="button" onClick={() => removeBrand(i)} className="text-brand-ink/60 hover:text-brand-ink" aria-label={`Remove ${b}`}>
                      ×
                    </button>
                  </span>
                ))}
                {brands.length < cap && (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addBrand();
                      }
                    }}
                    onBlur={addBrand}
                    placeholder="Add brand…"
                    className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-muted"
                  />
                )}
              </div>
              <div className="mt-1.5 text-[12px] text-muted">
                {brands.length} of {cap} brands added ({plan ? `${PLAN_NAME[plan]} plan` : "plan"}: up to {cap} brands per credit)
              </div>
              {/* vendor-brand vetting expectation-setter (content file) */}
              <p className="mt-2 text-[12px] text-ink-2">
                {brandHelper}{" "}
                <a
                  href={brandHelperLearnMore.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand hover:text-brand-hover"
                >
                  {brandHelperLearnMore.label}
                </a>
              </p>
            </div>

            <label className="block">
              <span className="text-[13px] font-medium text-ink">Upload supplier invoice or LOA <span className="font-normal text-muted">(optional but recommended)</span></span>
              <div className="mt-1 rounded-lg border border-dashed border-line-strong bg-base p-5 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-[12px] text-ink-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white hover:file:bg-brand-hover"
                />
                <div className="mt-2 text-[11.5px] text-muted">{file ? file.name : "PDF, JPG, or PNG — max 10MB"}</div>
              </div>
            </label>

            <label className="block">
              <span className="text-[13px] font-medium text-ink">Additional notes <span className="font-normal text-muted">(optional)</span></span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any specific concerns or context you want us to know…"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </label>

            <CreditImpact brands={brands.length} cost={cost} remainingAfter={remainingAfter} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-ink">Step 3 — Review & Confirm</div>
            <dl className="divide-y divide-line rounded-lg border border-line">
              <Row label="Supplier" value={vendor || "—"} />
              {website && <Row label="Website" value={website} />}
              <Row label="Marketplace" value={MARKETPLACES.find((m) => m.value === marketplace)?.label ?? marketplace} />
              <Row label="Brands" value={brands.join(", ") || "—"} />
              {file && <Row label="Document" value={file.name} />}
              {notes && <Row label="Notes" value={notes} />}
            </dl>
            <CreditImpact brands={brands.length} cost={cost} remainingAfter={remainingAfter} />
            {remainingAfter < 0 && (
              <p className="text-[13px] text-deny-ink">
                Not enough credits. <Link href="/portal/billing" className="font-semibold underline">Add credits →</Link>
              </p>
            )}
            {error && <p className="text-[13px] text-deny-ink">{error}</p>}
          </div>
        )}
      </div>

      {/* nav */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 1 ? router.push("/portal/dashboard") : setStep((step - 1) as 1 | 2))}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
        >
          ← {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 3 ? (
          <button
            type="button"
            disabled={(step === 1 && vendor.trim() === "") || (step === 2 && brands.length === 0)}
            onClick={() => setStep((step + 1) as 2 | 3)}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {step === 1 ? "Next →" : "Review & Confirm →"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={submit}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit research request"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-28 shrink-0 text-[12px] font-medium text-muted">{label}</dt>
      <dd className="text-[13px] text-ink">{value}</dd>
    </div>
  );
}

function CreditImpact({
  brands,
  cost,
  remainingAfter,
}: {
  brands: number;
  cost: number;
  remainingAfter: number;
}) {
  return (
    <div className="rounded-lg border border-brand/30 bg-brand-tint p-4">
      <div className="text-[12px] font-bold uppercase tracking-wide text-brand-ink">Research Cost</div>
      <div className="mt-1.5 flex items-center justify-between text-[13px]">
        <span className="text-ink-2">
          {brands} {brands === 1 ? "Brand" : "Brands"} → {cost} {cost === 1 ? "Credit" : "Credits"}
        </span>
        <span className="font-display text-lg font-extrabold text-brand-ink">
          {cost} {cost === 1 ? "credit" : "credits"}
        </span>
      </div>
      <div className={`mt-1 text-[12px] ${remainingAfter < 0 ? "text-deny-ink" : "text-ink-2"}`}>
        Credits Remaining After Submission: <span className="font-semibold">{remainingAfter}</span>
      </div>
    </div>
  );
}
