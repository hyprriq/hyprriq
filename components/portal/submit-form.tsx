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
import { brandHelper, brandHelperLearnMore, MARKETPLACES, estimatedCompletionLabel } from "@/lib/content/submit";

type Result = {
  case_id: string;
  case_number: string;
  credits_charged: number;
  remaining_balance: number;
};

import { fileCountError } from "@/lib/constants/uploads";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Shared validation for both the button and drag-drop paths.
function validateFile(f: File): string | null {
  if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return "Only PDF, JPG, or PNG files are accepted.";
  if (f.size > MAX_FILE_BYTES) return "File must be 10MB or smaller.";
  return null;
}

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
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const cost = creditsRequired(brands.length || 1, plan);
  const remainingAfter = creditsAvailable - cost;
  // When no document is uploaded, the typed notes are the ONLY evidence we have,
  // so they become required (conditional requirement).
  const notesRequired = files.length === 0;
  const notesOk = files.length > 0 ? true : notes.trim().length > 0;
  const canSubmit = vendor.trim() !== "" && brands.length > 0 && notesOk && remainingAfter >= 0;

  // Multi-document intake (founder-ruled 2026-07-12): the framing stays optional with NO "up to N"
  // hints — the limit is a silent guardrail that surfaces only when a sixth file is attempted,
  // quietly (fileCountError: one shared constant + message with the submit route).
  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming || incoming.length === 0) return;
    const additions: File[] = [];
    for (const f of Array.from(incoming)) {
      const err = validateFile(f);
      if (err) {
        setFileError(err);
        return;
      }
      additions.push(f);
    }
    const next = [...files, ...additions];
    const countErr = fileCountError(next.length);
    if (countErr) {
      setFileError(countErr);
      return;
    }
    setFileError(null);
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

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
      for (const f of files) fd.append("file", f);

      const res = await fetch("/api/cases/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Submission failed.");
      }
      // The case exists; research runs in the background. Show the confirmation receipt
      // (credit spent, what's left, what we're researching, ETA) and let the client choose
      // View case / Submit another — instead of dropping them onto a half-empty case page.
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // "Submit another" — clear the receipt and the form back to a fresh Step 1.
  function resetForm() {
    setResult(null);
    setStep(1);
    setVendor("");
    setWebsite("");
    setMarketplace("amazon_us");
    setBrands([]);
    setDraft("");
    setNotes("");
    setFiles([]);
    setFileError(null);
    setError(null);
  }

  // ---- confirmation receipt (shown after a successful submit; values from the submit
  // response + the just-submitted form state). Research already runs in the background. ----
  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-surface p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clear-bg text-xl text-clear-ink">✓</div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Research request submitted</h2>
        <p className="mt-1 text-sm text-ink-2">
          Case <span className="font-mono font-semibold">{result.case_number}</span> is in the queue.
        </p>

        {/* what we're researching */}
        <dl className="mt-5 divide-y divide-line rounded-lg border border-line text-left">
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="w-32 shrink-0 text-[13px] font-medium text-muted">Supplier</dt>
            <dd className="text-[14px] text-ink">{vendor.trim() || "—"}</dd>
          </div>
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="w-32 shrink-0 text-[13px] font-medium text-muted">{brands.length === 1 ? "Brand" : "Brands"}</dt>
            <dd className="text-[14px] text-ink">{brands.join(", ") || "—"}</dd>
          </div>
          <div className="flex gap-4 px-4 py-2.5">
            <dt className="w-32 shrink-0 text-[13px] font-medium text-muted">Est. completion</dt>
            <dd className="text-[14px] text-ink">{estimatedCompletionLabel(plan)}</dd>
          </div>
        </dl>

        {/* the transaction */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[12px] uppercase tracking-wide text-muted">Credits Used</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.credits_charged}</div>
          </div>
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[12px] uppercase tracking-wide text-muted">Remaining Balance</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.remaining_balance}</div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/portal/cases/${result.case_id}`}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            View case →
          </Link>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
            >
              Submit another
            </button>
            <Link
              href="/portal/cases"
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
            >
              My cases
            </Link>
          </div>
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
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                step >= s.n ? "bg-brand text-white" : "bg-subtle text-muted"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </div>
            <span className={`text-[13px] font-semibold ${step >= s.n ? "text-ink" : "text-muted"}`}>{s.label}</span>
            {i < 2 && <span className={`h-px flex-1 ${step > s.n ? "bg-brand" : "bg-line"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-surface p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-ink">Step 1 — Supplier</div>
            <label className="block">
              <span className="text-[14px] font-medium text-ink">Supplier / vendor name <span className="text-deny-ink">*</span></span>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Universal Supply Co."
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-ink">Supplier website <span className="font-normal text-muted">(optional)</span></span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-medium text-ink">Marketplace</span>
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
              <span className="text-[14px] font-medium text-ink">Brand names <span className="text-deny-ink">*</span></span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-base p-2">
                {brands.map((b, i) => (
                  <span key={b} className="flex items-center gap-1 rounded-md bg-brand-tint px-2 py-1 text-[13px] font-medium text-brand-ink">
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
              <div className="mt-1.5 text-[13px] text-muted">
                {brands.length} of {cap} brands added ({plan ? `${PLAN_NAME[plan]} plan` : "plan"}: up to {cap} brands per credit)
              </div>
              {/* vendor-brand vetting expectation-setter (content file) */}
              <p className="mt-2 text-[13px] text-ink-2">
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

            <div>
              <span className="text-[14px] font-medium text-ink">Upload supplier invoice or LOA <span className="font-normal text-muted">(optional but recommended)</span></span>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files ?? null);
                }}
                className={`mt-1 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 transition-colors ${
                  dragOver ? "border-brand bg-brand-tint" : "border-line-strong bg-base"
                }`}
              >
                <input
                  id="case-file"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  className="sr-only"
                />
                <label
                  htmlFor="case-file"
                  className="cursor-pointer rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover"
                >
                  {files.length ? "Add file" : "Choose file"}
                </label>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
                  {files.length === 0 && "or drag & drop here — PDF, JPG, PNG · max 10MB"}
                </span>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-3 text-[13px] text-ink-2">
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="font-semibold text-muted hover:text-ink">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && <p className="mt-1 text-[13px] text-deny-ink">{fileError}</p>}
            </div>

            <label className="block">
              <span className="text-[14px] font-medium text-ink">
                Additional notes{" "}
                {notesRequired ? (
                  <span className="text-deny-ink">*</span>
                ) : (
                  <span className="font-normal text-muted">(optional)</span>
                )}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={notesRequired ? 5 : 3}
                placeholder="Any specific concerns or context you want us to know…"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
              />
              {notesRequired && (
                <p className="mt-1 text-[13px] text-ink-2">
                  No document uploaded — please describe what you know about this vendor and brand
                  relationship in as much detail as possible. This is the only evidence we&rsquo;ll
                  have to work from.
                </p>
              )}
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
              {files.length > 0 && <Row label={files.length === 1 ? "Document" : "Documents"} value={files.map((f) => f.name).join(", ")} />}
              {notes && <Row label="Notes" value={notes} />}
            </dl>
            <CreditImpact brands={brands.length} cost={cost} remainingAfter={remainingAfter} />
            {remainingAfter < 0 && (
              <p className="text-[14px] text-deny-ink">
                Not enough credits. <Link href="/portal/billing" className="font-semibold underline">Add credits →</Link>
              </p>
            )}
            {error && <p className="text-[14px] text-deny-ink">{error}</p>}
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
            disabled={(step === 1 && vendor.trim() === "") || (step === 2 && (brands.length === 0 || !notesOk))}
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
      <dt className="w-28 shrink-0 text-[13px] font-medium text-muted">{label}</dt>
      <dd className="text-[14px] text-ink">{value}</dd>
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
      <div className="text-[13px] font-bold uppercase tracking-wide text-brand-ink">Research Cost</div>
      <div className="mt-1.5 flex items-center justify-between text-[14px]">
        <span className="text-ink-2">
          {brands} {brands === 1 ? "Brand" : "Brands"} → {cost} {cost === 1 ? "Credit" : "Credits"}
        </span>
        <span className="font-display text-lg font-extrabold text-brand-ink">
          {cost} {cost === 1 ? "credit" : "credits"}
        </span>
      </div>
      <div className={`mt-1 text-[13px] ${remainingAfter < 0 ? "text-deny-ink" : "text-ink-2"}`}>
        Credits Remaining After Submission: <span className="font-semibold">{remainingAfter}</span>
      </div>
    </div>
  );
}
