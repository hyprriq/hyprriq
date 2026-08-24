"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  brandCapForPlan,
  creditsRequired,
  PLAN_PRICE_LABEL,
  type PlanType,
} from "@/lib/constants/plans";
import { brandHelper, brandHelperLearnMore, MARKETPLACES, estimatedCompletionLabel } from "@/lib/content/submit";
import { planCollectsAsins, normalizeAsin, ASIN_RE, brandCapMessage } from "@/lib/portal/asinIntake";

// ── SUBMIT — 4-step structure per the approved prototype (full-build brief §4): Supplier /
// Brands / Documents / Review. LOGIC-PRESERVING RESTRUCTURE: every rule, state, validation,
// and API call from the 3-step version is byte-equivalent — upload validation + drag-drop,
// the 2-file cap, notes-required-when-no-files, the $99 no-uploads gate, ASIN intake
// (Scale-only), brand cap + dedupe, the credit math, and the post-submit receipt. Movement is
// free (rail chips + Edit buttons); the SUBMIT gate (canSubmit) is unchanged. The helper
// panel's field hints are LOAD-BEARING, not decoration — research runs on the typed name.
// SUPERSESSION NOTE: the brief states the 2-file cap legibly at the point of use, replacing
// the 2026-08-07 silent-guardrail treatment (the server rule itself is unchanged). ──

type Result = {
  case_id: string;
  case_number: string;
  credits_charged: number;
  remaining_balance: number;
};

import { fileCountError, planAcceptsUploads, MAX_FILE_BYTES, FILE_SIZE_MESSAGE, FILE_TYPE_MESSAGE, MAX_CASE_DOCUMENTS } from "@/lib/constants/uploads";

// Shared validation for both the button and drag-drop paths — UX ONLY. The SERVER re-validates
// size and sniffs the type from content (lib/utils/fileSniff) before any storage write/charge.
function validateFile(f: File): string | null {
  if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return FILE_TYPE_MESSAGE;
  if (f.size > MAX_FILE_BYTES) return FILE_SIZE_MESSAGE;
  return null;
}

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Supplier" },
  { n: 2, label: "Brands" },
  { n: 3, label: "Documents" },
  { n: 4, label: "Review" },
];

// Step-aware guidance (the prototype's helper rail) — protects the credit before it's spent.
const STEP_TIPS: Record<Step, { kicker: string; tip: string }> = {
  1: { kicker: "Before you continue", tip: "Use the supplier's full legal name, exactly as it appears on their invoice or quote — spelling matters for research." },
  2: { kicker: "The brands are the scope", tip: "The brands and vendor you enter here are what we research — one case covers one supplier and the brands you list." },
  3: { kicker: "Documents corroborate", tip: "A PO or letterhead helps us confirm the vendor's entity and address. The brands and vendor you entered are what we research." },
  4: { kicker: "One last look", tip: "A minute here protects the credit — check the supplier, brands, and marketplace are exactly right, then submit." },
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

  const [step, setStep] = useState<Step>(1);
  const [vendor, setVendor] = useState("");
  const [website, setWebsite] = useState("");
  const [marketplace, setMarketplace] = useState("amazon_us");
  const [brands, setBrands] = useState<string[]>([]);
  const [asins, setAsins] = useState<Record<string, string>>({});
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
  // ASIN intake — Scale-only progressive disclosure; the field never renders on other tiers.
  // ASINs are OPTIONAL (UNRULED default, flagged), but a non-empty value must be a valid ASIN.
  const collectsAsins = planCollectsAsins(plan);
  // $99 takes no uploads (founder-ruled 2026-08-07) — server enforces the same predicate.
  const uploadsAllowed = planAcceptsUploads(plan);
  const badAsins = collectsAsins
    ? brands.filter((b) => (asins[b] ?? "").trim() !== "" && !ASIN_RE.test(normalizeAsin(asins[b])))
    : [];
  const asinsOk = badAsins.length === 0;
  const canSubmit = vendor.trim() !== "" && brands.length > 0 && notesOk && asinsOk && remainingAfter >= 0;

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
    const gone = brands[i];
    setBrands(brands.filter((_, idx) => idx !== i));
    if (gone !== undefined) {
      setAsins((prev) => {
        const next = { ...prev };
        delete next[gone];
        return next;
      });
    }
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
      if (collectsAsins) {
        const filled = Object.fromEntries(
          brands.map((b) => [b, normalizeAsin(asins[b] ?? "")]).filter(([, a]) => a !== ""),
        );
        if (Object.keys(filled).length > 0) fd.set("brand_asins", JSON.stringify(filled));
      }
      for (const f of files) fd.append("file", f);

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

  // "Submit another" — clear the receipt and the form back to a fresh Step 1.
  function resetForm() {
    setResult(null);
    setStep(1);
    setVendor("");
    setWebsite("");
    setMarketplace("amazon_us");
    setBrands([]);
    setAsins({});
    setDraft("");
    setNotes("");
    setFiles([]);
    setFileError(null);
    setError(null);
  }

  // ---- confirmation receipt (unchanged live behavior) ----
  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-surface p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clear-bg text-xl text-clear-ink">✓</div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Research request submitted</h2>
        <p className="mt-1 text-sm text-ink-2">
          Case <span className="font-mono font-semibold">{result.case_number}</span> is in the queue.
        </p>

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

        <div className="mt-3 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-canvas p-3">
            <div className="text-[12px] uppercase tracking-wide text-muted">Credits Used</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.credits_charged}</div>
          </div>
          <div className="rounded-lg border border-line bg-canvas p-3">
            <div className="text-[12px] uppercase tracking-wide text-muted">Remaining Balance</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{result.remaining_balance}</div>
          </div>
        </div>

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

  const nextDisabled =
    (step === 1 && vendor.trim() === "") ||
    (step === 2 && (brands.length === 0 || !asinsOk)) ||
    (step === 3 && !notesOk);

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Research a supplier</h2>
      <p className="mt-1 text-sm text-ink-2">
        One case covers one supplier and their brands, for one credit. You&rsquo;ll review everything before it&rsquo;s submitted.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          {/* functional step rail — every chip is a button; movement is always free */}
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Submission steps">
            {STEPS.map((s) => (
              <button
                key={s.n}
                type="button"
                role="tab"
                aria-selected={step === s.n}
                onClick={() => setStep(s.n)}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold ${
                  step === s.n ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-subtle"
                }`}
              >
                <span className={`font-mono text-[10.5px] ${step === s.n ? "text-white/80" : "text-muted"}`}>0{s.n}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-card border border-line bg-surface p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-ink">The supplier</div>
                  <p className="mt-0.5 text-[13px] text-muted">Who are you planning to buy from?</p>
                </div>
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Supplier business name <span className="text-deny-ink">*</span></span>
                  <input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. Universal Supply Co."
                    autoComplete="organization"
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                  />
                  <span className="mt-1 block text-[13px] text-muted">The full legal name from their invoice or quote — spelling matters.</span>
                </label>
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Supplier website <span className="font-normal text-muted">(optional)</span></span>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    inputMode="url"
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                  />
                  <span className="mt-1 block text-[13px] text-muted">If they gave you a storefront, portal, or catalog link, paste it here.</span>
                </label>
                <label className="block">
                  <span className="text-[14px] font-medium text-ink">Marketplace you sell on</span>
                  <select
                    value={marketplace}
                    onChange={(e) => setMarketplace(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
                  >
                    {MARKETPLACES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[13px] text-muted">The Amazon marketplace where you&rsquo;ll resell these goods.</span>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-ink">The brands</div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {`Up to ${cap} brands per case — one credit covers them all.`}
                  </p>
                </div>
                <div>
                  <span className="text-[14px] font-medium text-ink">Brand names <span className="text-deny-ink">*</span></span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-canvas p-2">
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
                        className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[16px] text-ink outline-none placeholder:text-muted"
                      />
                    )}
                  </div>
                  <div className="mt-1.5 text-[13px] text-muted">
                    {`${brands.length} of ${cap} brands added`}
                  </div>
                  {brands.length >= cap && (
                    <p className="mt-1 text-[13px] text-ink-2">{brandCapMessage(plan)}</p>
                  )}
                  {collectsAsins && brands.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[14px] font-medium text-ink">
                        ASINs <span className="font-normal text-muted">(optional — one per brand)</span>
                      </span>
                      <p className="text-[13px] text-ink-2">
                        Enter the ASIN you&rsquo;re actually planning to buy from this supplier — the
                        exact listing, not just any product of the brand.
                      </p>
                      {brands.map((b) => (
                        <label key={b} className="flex items-center gap-2 text-[13px] text-ink-2">
                          <span className="w-40 shrink-0 truncate font-medium text-ink">{b}</span>
                          <input
                            value={asins[b] ?? ""}
                            onChange={(e) => setAsins((prev) => ({ ...prev, [b]: e.target.value }))}
                            placeholder="e.g. B0ABC12345"
                            className="min-h-11 w-44 rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-mono text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                          />
                          {(asins[b] ?? "").trim() !== "" && !ASIN_RE.test(normalizeAsin(asins[b])) && (
                            <span className="text-[12px] text-deny-ink">10 letters/digits</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
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
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-ink">What they&rsquo;ve sent you <span className="font-normal text-muted">(optional)</span></div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    An invoice, quote, or price list gives our review something concrete to check. Nothing is shared with the supplier.
                  </p>
                </div>
                <div>
                  {!uploadsAllowed ? (
                    <div className="rounded-lg border border-dashed border-line-strong bg-subtle p-4">
                      <label className="cursor-not-allowed rounded-md bg-subtle px-3.5 py-2 text-[13px] font-semibold text-muted" aria-disabled="true">
                        Choose file
                      </label>
                      <p className="mt-2 text-[13px] text-ink-2">
                        Document review is included from the {PLAN_PRICE_LABEL.single_149} report up.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] text-ink-2">
                        Optional. A PO or letterhead helps us confirm the vendor&rsquo;s entity and address.
                        The brands and vendor you enter above are what we research.
                      </p>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          addFiles(e.dataTransfer.files ?? null);
                        }}
                        className={`mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 transition-colors ${
                          dragOver ? "border-brand bg-brand-tint" : "border-line-strong bg-canvas"
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
                          {files.length === 0
                            ? `or drag & drop — PDF, JPG, PNG · up to ${MAX_CASE_DOCUMENTS} files · 10MB each`
                            : `${files.length} of ${MAX_CASE_DOCUMENTS} files attached`}
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
                    </>
                  )}
                </div>

                <label className="block">
                  <span className="text-[14px] font-medium text-ink">
                    Anything specific on your mind?{" "}
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
                    placeholder="e.g. They say they ship from a EU warehouse — the pricing feels low for this brand."
                    className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
                  />
                  {notesRequired && (
                    <p className="mt-1 text-[13px] text-ink-2">
                      No document uploaded — please describe what you know about this vendor and brand
                      relationship in as much detail as possible. This is the only evidence we&rsquo;ll
                      have to work from.
                    </p>
                  )}
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-ink">Review before it&rsquo;s submitted</div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    A minute here protects the credit — check the supplier, brands, and marketplace are exactly right, then submit.
                  </p>
                </div>
                <ReviewGroup title="Supplier" onEdit={() => setStep(1)}>
                  {vendor.trim() ? (
                    <>
                      <div className="font-semibold text-ink">{vendor.trim()}</div>
                      {website.trim() && <div className="text-muted">{website.trim()}</div>}
                      <div className="text-muted">Selling on {MARKETPLACES.find((m) => m.value === marketplace)?.label ?? marketplace}</div>
                    </>
                  ) : (
                    <span className="text-muted">No supplier name yet — add it before submitting.</span>
                  )}
                </ReviewGroup>
                <ReviewGroup title="Brands" onEdit={() => setStep(2)}>
                  {brands.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {brands.map((b) => (
                        <span key={b} className="rounded-md bg-brand-tint px-2 py-0.5 text-[13px] font-medium text-brand-ink">{b}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">No brands entered yet.</span>
                  )}
                  {collectsAsins && brands.some((b) => (asins[b] ?? "").trim() !== "") && (
                    <div className="mt-1 font-mono text-[12.5px] text-muted">
                      {brands.filter((b) => (asins[b] ?? "").trim() !== "").map((b) => `${b}: ${normalizeAsin(asins[b])}`).join(" · ")}
                    </div>
                  )}
                </ReviewGroup>
                <ReviewGroup title="Documents & notes" onEdit={() => setStep(3)}>
                  <div>{files.length > 0 ? files.map((f) => f.name).join(" · ") : <span className="text-muted">No documents attached</span>}</div>
                  {notes.trim() && <div className="mt-1 text-ink-2">{notes.trim()}</div>}
                </ReviewGroup>

                <div className="rounded-lg border border-brand/30 bg-brand-tint p-4">
                  <div className="text-[13px] font-bold uppercase tracking-wide text-brand-ink">
                    Submitting uses {cost} {cost === 1 ? "credit" : "credits"}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">
                    You have {creditsAvailable} available · estimated completion {estimatedCompletionLabel(plan).toLowerCase()}.
                    If research can&rsquo;t start, your credit is returned automatically.
                  </p>
                  <div className={`mt-1 text-[13px] ${remainingAfter < 0 ? "text-deny-ink" : "text-ink-2"}`}>
                    Credits remaining after submission: <span className="font-semibold">{remainingAfter}</span>
                  </div>
                </div>
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
              onClick={() => (step === 1 ? router.push("/portal/dashboard") : setStep((step - 1) as Step))}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
            >
              ← {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={nextDisabled}
                onClick={() => setStep((step + 1) as Step)}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                Next: {STEPS[step].label} →
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit || busy}
                onClick={submit}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Submit for research"}
              </button>
            )}
          </div>
        </div>

        {/* step-aware guidance — wide desktop only; protects the credit before it's spent */}
        <aside className="hidden lg:block" aria-live="polite">
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{STEP_TIPS[step].kicker}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{STEP_TIPS[step].tip}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center justify-between border-b border-line bg-subtle px-4 py-2">
        <span className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">{title}</span>
        <button type="button" onClick={onEdit} className="text-[13px] font-semibold text-brand hover:text-brand-hover">Edit</button>
      </div>
      <div className="px-4 py-3 text-[14px] text-ink-2">{children}</div>
    </div>
  );
}
