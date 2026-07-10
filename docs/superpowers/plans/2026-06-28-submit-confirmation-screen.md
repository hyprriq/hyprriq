# Post-Submission Confirmation Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a confirmation/receipt screen between submitting a research request and the case detail page — showing what was submitted, what it cost, what's left, and when to expect results — with **View case** and **Submit another** actions.

**Architecture:** Client-only change in `components/portal/submit-form.tsx`. The submit API already runs the pipeline in the background via `after()` and returns immediately with `{ ok, case_id, case_number, credits_charged, remaining_balance }` — **the route does NOT change.** We revert the auto-`router.push` (added in commit `df6f869`) back to an in-form success state (`setResult(data)`) and render an enhanced confirmation card. Supplier + brands come from existing form state; the estimated-completion label is derived from `PLAN_SLA_DAYS` via a new pure helper. No new route, no data-passing, no migration.

**Tech Stack:** TypeScript, Next.js 16 (App Router, client component), React `useState`, vitest. No React component-test harness exists (`@testing-library/react`/jsdom not installed), so the card is verified by tsc + eslint + `next build` + founder visual validation on staging — the same pattern used for the Phase 4 / 4.5 UI. The one piece of real logic (the ETA label) is isolated into a pure helper with a unit test.

**Decisions locked before this plan (do not re-litigate):**
- Background pipeline via `after()` stays exactly as shipped in `df6f869`.
- "Estimated completion" = the plan's delivery SLA (`PLAN_SLA_DAYS`: Single/Growth = 5 business days, Scale = 3), consistent with the pricing page. Not the pipeline runtime.
- Confirmation lives as an in-form state, not a separate `/portal/submit/confirmation` route.

---

## File structure

- `lib/content/submit.ts` — **Modify.** Add `estimatedCompletionLabel(plan)` pure helper (content/copy layer; keeps wording out of component logic, per the existing pattern in this file).
- `lib/content/submit.test.ts` — **Create.** Unit test for the helper.
- `components/portal/submit-form.tsx` — **Modify.** Re-add `result` state, set it on success (revert the `router.push`), add a `resetForm()` for "Submit another", and render the enhanced confirmation card.

The route `app/api/cases/submit/route.ts` is intentionally untouched.

---

## Task 1: ETA label helper (pure, TDD)

**Files:**
- Modify: `lib/content/submit.ts`
- Create: `lib/content/submit.test.ts`

- [ ] **Step 1: Write the failing test** at `lib/content/submit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estimatedCompletionLabel } from "./submit";

describe("estimatedCompletionLabel", () => {
  it("uses the plan's delivery SLA in days", () => {
    expect(estimatedCompletionLabel("scale_499")).toBe("Within 3 business days");
    expect(estimatedCompletionLabel("growth_279")).toBe("Within 5 business days");
    expect(estimatedCompletionLabel("single_99")).toBe("Within 5 business days");
  });
  it("falls back to 5 business days when the client has no plan", () => {
    expect(estimatedCompletionLabel(null)).toBe("Within 5 business days");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/content/submit.test.ts`
Expected: FAIL — `estimatedCompletionLabel is not a function` / no export.

- [ ] **Step 3: Add the helper** to `lib/content/submit.ts` (append; add the import at the top of the file):

```ts
import { PLAN_SLA_DAYS, type PlanType } from "@/lib/constants/plans";

// "Estimated completion" shown on the submit confirmation screen. Sourced from the
// plan's delivery SLA (same number the pricing page promises), NOT the pipeline runtime.
// Falls back to 5 days for a client with no plan (the submit flow already blocks no-plan).
export function estimatedCompletionLabel(plan: PlanType | null): string {
  const days = plan ? PLAN_SLA_DAYS[plan] : 5;
  return `Within ${days} business ${days === 1 ? "day" : "days"}`;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run lib/content/submit.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add lib/content/submit.ts lib/content/submit.test.ts
git commit -m "feat(portal): estimatedCompletionLabel helper for submit confirmation"
```

---

## Task 2: Re-add success state + reset, set result on submit (revert auto-redirect)

**Files:**
- Modify: `components/portal/submit-form.tsx`

- [ ] **Step 1: Re-add the `result` state.** Find:

```tsx
  const [error, setError] = useState<string | null>(null);
```

Replace with:

```tsx
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
```

- [ ] **Step 2: Set the result on success instead of redirecting.** In `submit()`, find:

```tsx
      // The case exists now; research runs in the background. Go straight to the case page
      // (it shows research-in-progress). Keep busy=true through navigation so the form doesn't
      // flash back before the page unmounts.
      router.push(`/portal/cases/${(data as Result).case_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }
```

Replace with:

```tsx
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
```

- [ ] **Step 3: Add a `resetForm()` for "Submit another"** — place it right after the `submit()` function closes (before the `if (result) { ... }` render added in Task 3):

```tsx
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
    setFile(null);
    setFileError(null);
    setError(null);
  }
```

- [ ] **Step 4: Add the helper import.** Find:

```tsx
import { brandHelper, brandHelperLearnMore, MARKETPLACES } from "@/lib/content/submit";
```

Replace with:

```tsx
import { brandHelper, brandHelperLearnMore, MARKETPLACES, estimatedCompletionLabel } from "@/lib/content/submit";
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean. (The `result` state is read by the render block added in Task 3; `Result` type already exists in this file.)

- [ ] **Step 6: Commit**

```bash
git add components/portal/submit-form.tsx
git commit -m "feat(portal): restore in-form success state on submit (revert auto-redirect)"
```

---

## Task 3: Render the enhanced confirmation card

**Files:**
- Modify: `components/portal/submit-form.tsx`

- [ ] **Step 1: Add the confirmation render block.** Find the start of the main render:

```tsx
  return (
    <div className="mx-auto max-w-2xl">
```

Insert the following **immediately before** it (so the card returns early when `result` is set):

```tsx
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

```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint components/portal/submit-form.tsx lib/content/submit.ts`
Expected: clean. (`Link`, `vendor`, `brands`, `plan`, `result`, `resetForm`, `estimatedCompletionLabel` are all in scope.)

- [ ] **Step 3: Commit**

```bash
git add components/portal/submit-form.tsx
git commit -m "feat(portal): enhanced submit confirmation card (supplier/brands/ETA + Submit another)"
```

---

## Task 4: Full verification + push + live validation

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx eslint app components lib
npx vitest run
npx next build
```
Expected: tsc clean; eslint clean; vitest 146 pass (144 existing + 2 new helper tests); build succeeds.

- [ ] **Step 2: Push**

```bash
git push origin staging
```

- [ ] **Step 3: Founder visual validation (staging)** — after redeploy:
  1. Portal → New Research Request → submit a real supplier (e.g. Ingram Micro / Dell).
  2. **Expect:** the confirmation card appears (no auto-redirect, no "Submitting…" hang) showing: ✓ submitted, case number, Supplier, Brands, Est. completion ("Within N business days" matching the plan), Credits Used = 1, Remaining Balance correct.
  3. Click **View case →** → lands on `/portal/cases/[id]` with dimensions "Queued"; refresh after ~60–90s → Track 1 fills in.
  4. Back to submit → submit again → click **Submit another** → form resets to a clean Step 1 (no stale vendor/brands), credits not double-charged.
  5. **My cases** link → `/portal/cases` list shows the new case(s).

---

## Self-review notes
- **Spec coverage:** success state ✓ (Task 3 card), case number ✓, credits used + remaining ✓ (Credits Used / Remaining Balance tiles), supplier + brands ✓ (dl rows from form state), estimated completion ✓ (`estimatedCompletionLabel`, Task 1), View case button ✓, Submit another button ✓ (`resetForm`), plus a My cases link (the "go to My Cases button" you mentioned). Screen sits between submit and the case page ✓ (in-form state; View case is the explicit step onward).
- **No route change / no migration:** the submit response already returns every field the card needs; `after()` background pipeline is unchanged.
- **Type consistency:** `Result` type (existing) supplies `case_id`/`case_number`/`credits_charged`/`remaining_balance`; `plan: PlanType | null` (existing prop) feeds `estimatedCompletionLabel`; `resetForm` clears every form state setter declared in the component.
- **Testing honesty:** only the ETA helper is unit-tested (no component-test harness in repo); the card is presentational and validated visually on staging, consistent with Phase 4 / 4.5.
