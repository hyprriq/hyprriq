# PDF REPORT — INTEGRATION HANDOFF (design lane → dev lane, 2026-08-16)

The client report renders as a PDF. The **document is finished and verified**; what remains is
wiring it into the product. This is written for the dev thread — nothing below asks you to
change the design.

---

## 1 · The one path

| What | Where |
|---|---|
| **Entry point** | `lib/pdf/renderReportPdf.ts` → `renderCaseReportPdf({ case })` |
| The document (pure, no I/O) | `lib/pdf/reportTemplate.ts` |
| Embedded fonts + wordmark | `lib/pdf/reportAssets.ts`, `lib/pdf/fonts/` |
| Structural copy (fixture-bound) | `lib/content/reportDocument.ts`, `lib/content/documentIdentity.ts` |
| CLI wrapper (design lane only) | `scripts/pdf/report-html.ts` |
| **Verification (use in CI)** | `scripts/pdf/verify-report.ts` |

**Superseded — do not build on:** `scripts/pdf/report-document.tsx`,
`scripts/pdf/generate-samples.tsx`, `scripts/pdf/print-sample.tsx`, `scripts/pdf/fonts/`
(react-pdf era). Kept only as history; the samples they produced are in
`docs/pdf-samples/superseded/`.

### The contract

```ts
import { renderCaseReportPdf, ReportNotRenderable } from "@/lib/pdf/renderReportPdf";

const { pdf, html, pageCount, content } = await renderCaseReportPdf({ case: caseId });
// pdf       Buffer — the deliverable
// html      string — the same document, self-contained (audit/preview; safe to store)
// pageCount number
// content   the projected content it rendered from
```

Throws `ReportNotRenderable` with `reason`: `not_found` · `not_delivered` · `no_snapshot` ·
`no_client_name`. All four are **loud by design** — do not catch-and-default any of them into a
blank or partial PDF.

Deterministic: same case + same delivered attempt → same document, always. It reads the
**delivered** attempt, never the latest, so a re-investigated case keeps its frozen record (H1).

---

## 2 · Blockers to clear before any client receives a PDF

### 2a · The internal-token presence checkpoint (P0, commit `3e4c9ff`) binds here

That P0 names **"PDF and email"** among the checkpoint's bindings. Confirmed empirically on
2026-08-16 by rendering the known-bad case: **`AWI-2608-034` produces a client PDF containing
`EV-###` and `src_N` tokens.** The renderer is faithful — it carries whatever the projection
emits — so the leak arrives on the document, in the client's most-read fields.

Two consequences for this integration:

1. The render path must sit **behind** the presence checkpoint once it exists, on the client
   side of the projection, exactly as the P0 rules. Do not add token-stripping to the template:
   the P0's law is that cleaners are shape-based and the checkpoint is presence-based, and
   widening one into the other is the defect it was written to prevent.
2. Until the checkpoint ships, **PDF delivery must not be enabled for cases whose projected
   payload still carries tokens.** `scripts/pdf/verify-report.ts` will fail such a document on
   its "no internal vocabulary" check — usable as an interim manual gate, not as the fix.

Earlier passes in this thread reported "zero internal vocabulary" — that was measured on
`AWI-2607-022` only, and is not a statement about the corpus.

### 2b · The client name

`no_client_name` **fires today on real cases** (AWI-2607-022 included). Root cause is dev-lane:
Stripe checkout captures `customer_details.name` and the webhook discards it
(`app/api/webhooks/stripe/route.ts`, ~line 132), and clients cannot self-edit their name.

Until that is fixed, delivered cases with no name on file cannot produce a client PDF — the
renderer refuses rather than printing "Prepared for —". **Please fix the capture (and backfill
existing clients) before enabling delivery.** The `allowMissingClientName` option exists only
for internal proofs and stamps a visible marker on every page; never pass it from a route.

---

## 3 · The deployment constraint — read before choosing where this runs

`renderCaseReportPdf` drives **headless Chromium** via `puppeteer-core` against an installed
browser. On a platform with no browser binary (Vercel serverless functions), it will throw at
`launchBrowser()`.

`launchBrowser()` in `lib/pdf/renderReportPdf.ts` is deliberately **the single swap point** —
everything above and below it is platform-agnostic. Options:

| Option | Notes |
|---|---|
| **`@sparticuz/chromium`** in the same function | Works on Vercel; ~50MB layer, cold starts measured in seconds, needs `maxDuration` raised. Swap `launchBrowser()` only. |
| **Render off the request path** (recommended) | Generate once when the case is published, from a job runner that has a real Chrome. You already run Inngest for exactly this class of work. |
| Hosted render API (Browserless etc.) | Third-party sees full client report content — a privacy decision, not just an infra one. |

Also required wherever it runs — the fonts and wordmark must reach the bundle:

```js
// next.config
outputFileTracingIncludes: { "/api/**": ["./lib/pdf/fonts/**", "./public/brand/**"] }
```

---

## 4 · Recommended architecture: render at publish, store, serve authorized

A report changes only when it is published. Rendering per download is waste and puts a browser
launch on a user request.

**1. Render on delivery.** In `app/api/admin/cases/[id]/review/route.ts`, the publish path
updates the case (`status: "delivered"`, ~line 213) and then runs post-delivery side effects —
`seedCaseOutcome` at ~line 231 is the established *loud-but-non-fatal* pattern. Enqueue PDF
generation in the same place (an Inngest event keeps the operator's request fast and gives you
retries). Delivery already happened; a render failure must alarm, never roll back the delivery.

**2. Store immutably.** Suggested private bucket `case-reports`, object key
`{client_id}/{case_number}-attempt-{delivered_attempt}.pdf`. Keying on the attempt matters: a
dispute re-run creates a *new* attempt, and the previously delivered PDF must stay byte-frozen
(H1). Never overwrite in place. Record the key on the case (or a small `case_reports` row) so
the portal knows a file exists.

**3. Serve through authorization.** A route like `app/(portal)/api/cases/[id]/report.pdf` that:
- resolves the client from Clerk, exactly as `getCaseById`/`getCaseFindings` do;
- confirms **this case belongs to this client** (the projection layer's ownership check is the
  precedent — a per-session gate is not enough);
- confirms the case is delivered;
- returns the bytes, or a short-lived signed URL (60s) — never a public URL, and never a path
  that can be enumerated by case number.

Admin download can reuse the same renderer behind `view_cases`.

**4. Wire the button.** `components/portal/report-view.tsx` (~line 248) has the disabled
"Download PDF (coming soon)" affordance ready to become a real link, plus absent/present
handling for cases whose PDF has not been generated yet.

---

## 5 · Verification

`scripts/pdf/verify-report.ts` runs 10 checks against any produced PDF (node + `pdfjs-dist`, no
dev server, exit-coded for CI):

ligature-intact text layer · no internal vocabulary (`EV-`, `track_N`, signal enums) · no
orphaned area headings · footnote only when a marker exists · checklist count · full content set ·
cover completeness · **contents-page numbers cross-checked against the pages sections actually
start on** · footer pagination.

```bash
npx tsx scripts/pdf/verify-report.ts path/to/report.pdf
```

Worth running in CI on a fixture case: it catches template regressions that types cannot.

---

## 6 · Rules the integration must preserve

- **Meaning is locked.** The PDF carries what the portal carries, through the same projection
  chain (`buildClientFindings` + `projectClientReport`). Never re-summarise, re-order meaning,
  or add prose in the route.
- **Structural copy lives in `lib/content/reportDocument.ts`** and every string there is in the
  banned-language `MUST_PASS` fixture. New client-facing strings join the fixture in the same
  commit — imported, never copied.
- **The colour document is the deliverable.** `PALETTE_PRINT_CHECK` (greyscale) is an internal
  proof that no meaning is carried by hue; it is not a client artifact and should never be
  offered as a download.
- The design lane owns `lib/pdf/reportTemplate.ts`. Layout/typography changes come through it,
  not through per-route overrides.

### Known drift risk — worth one small refactor

The PDF template currently **duplicates** the report's fixed display copy (verdict names and
"what this level means", the Verified/Assessed/Not-assessed definitions, the checklist intro,
the category note, the closing statement) from `components/portal/report-view.tsx`. They are
verbatim-identical today — checked on 2026-08-16, after the portal's `HOW_TO_READ` was reworded
in the dev lane, which is exactly the near-miss that makes this worth naming.

If that copy changes in one place and not the other, a client reading the portal and the PDF
side by side sees two versions of the same paid deliverable. **Recommended:** lift those
constants into `lib/content/` (alongside `reportDocument.ts`) and have both the portal component
and the PDF template import them. Small, low-risk, and it removes the drift class permanently.
Happy to do it in the design lane on your word — it touches a portal component, so it is not
mine to do unilaterally.

---

## 7 · Current state

Rendered, verified, 10/10 checks: `docs/pdf-samples/AWI-2607-022-report.pdf` (11 pages) and
`AWI-2607-022-report.html` (self-contained — opens in any browser, fonts embedded). Both carry
the internal-proof marker because that case has no client name on file (§2).
