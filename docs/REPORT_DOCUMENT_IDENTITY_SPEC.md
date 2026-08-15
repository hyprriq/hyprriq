# REPORT DOCUMENT IDENTITY — SPECIFICATION (2026-08-15)

**Status:** settled in the branding pass; the PDF pass implements it. Design-lane document.
**Rule inherited:** every client-facing string below that is NEW joins the banned-language
must-pass fixture in the same commit that puts it in app code. The strings marked REUSED are
already fixture-covered where required.

A PDF leaves the app: forwarded, saved, printed, read months later with no context. It must
identify itself completely on every page.

## 1 · Cover / letterhead (first page)

| Element | Content | Type treatment |
|---|---|---|
| Wordmark | `public/brand/wordmark.svg` (primary, navy+copper) | Height ≈ 9 mm; clear space = half mark height |
| Document title | "Source Intelligence Report" | Fraunces SemiBold |
| Case reference | case_number (e.g. AWI-2607-022) | JetBrains Mono |
| Supplier assessed | vendor_name | Instrument Sans SemiBold |
| Brands in scope | brands_submitted, `·`-separated | Instrument Sans |
| Prepared for | client full_name (company_name when present) | Instrument Sans |
| Delivered | delivered_at, long date | JetBrains Mono |
| Issuer line | **Hyprr Retail LLC · hyprriq.com** — the trading name alone is not sufficient on a commercial document | Instrument Sans, small |

On a monochrome printer the wordmark falls back to `wordmark-mono.svg` (single-colour); never
print copper-on-navy — see §4.

## 2 · Running footer (every page)

`{case_number} · Page {n} of {total} · Delivered {date}` — JetBrains Mono, small, muted.
Someone holding page 4 alone can identify the document.

## 3 · Standing statements (verbatim sources)

- **Not-a-guarantee** — REUSED, already approved and shipping in the web report
  (components/portal/report-view.tsx closing block):
  > "This report reflects observable evidence available at the time of research. It is not a
  > guarantee of marketplace approval, account safety, or brand action. The decision to
  > purchase is yours."
  Appears in the document body (closing section), not only in any how-to-read panel.
- **Confidentiality** — NEW STRING, PROPOSED (plain phrasing per brief; joins the fixture when
  the PDF pass ships it):
  > "Prepared for {client name}. This report is for the named client and is not for
  > redistribution."
- **Report body prose** renders in the reading serif (Source Serif 4) at a 65–75 character
  measure; headings Fraunces; data mono — the same four roles as the web report.

## 4 · Print degradation rules

- Copper `#9A551F` on navy `#173E63` is ~1.9:1 — it dies in greyscale and at small sizes.
  Single-colour reproduction always uses `wordmark-mono.svg` (currentColor → black).
- Verdict tint pairs are AA on white but their *tints* may flatten in greyscale — the verdict
  must always be carried by its label text, never by colour alone (already the product rule).
- The compact mark (`mark.svg`) uses white-on-navy for this reason; copper is reserved for the
  full wordmark at sizes ≥ ~24 px.

## 5 · Report-only — founder territory, NOT designed here

Whether a client-facing commercial document must also carry: company registration number and
jurisdiction of formation; a terms-of-service / engagement-terms reference; a governing-law
line; a support/contact channel beyond the domain. Legal pages are a known backlog item
(tracker 1.6); these belong to that ruling. Nothing invented here.
