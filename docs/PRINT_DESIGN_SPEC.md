# PRINT DESIGN SPEC — THE REPORT AS A DOCUMENT (2026-08-15)

**Status:** proposed with cover + spread samples for founder approval; the full document gets
built once on approval. Supersedes the visual layer of the three rejected samples; content flow
and the identity elements of `REPORT_DOCUMENT_IDENTITY_SPEC.md` are unchanged.

**Why the three samples failed (critique summary):** they were the web report on paper — screen
greys on white (body set in the screen's `ink-2`, weak in print), tinted rounded panels and
pill chips (SaaS idiom), letterspaced caps on every label (template mannerism at that volume),
a four-step type scale with no real contrast, and the verdict rendered as one panel among many.
This spec designs the document as its own artifact.

## 1 · Print palette — derived for ink, not carried from screen

Paper is white. No tinted grounds, no panels-as-cards. Greyscale column = ink coverage on a
mono office printer (Rec.601 luma).

| Role | Hex | Greyscale | Rule |
|---|---|---|---|
| Paper | `#FFFFFF` | 0 % | The only ground. |
| Body ink | `#14181D` | ≈ 91 % black | All prose and headings. Dense, confident. The screen's `ink-2` (#3D454F, ≈ 72 %) is demoted to **metadata only**. |
| Soft ink | `#43494F` | ≈ 72 % | Labels, captions, footer. Never body. |
| Print navy | `#122E4A` | ≈ 84 % | Brand structure: wordmark "Hyprr", the cover's single rule. Deepened from screen `#173E63` — large solids of the screen value print muddy-blue. |
| Copper | `#9A551F` | ≈ 61 % | **Wordmark IQ only.** 1.9:1 on navy and mid-grey sludge on mono printers — it carries no meaning anywhere else in print. Absent from the mono rendering (wordmark-mono). |
| Hairline | `#C9CDD2` | ≈ 20 % | Rules. 0.5–0.75 pt. |
| Verdict inks (print) | clear `#1D5638` · conditional `#755110` · verify `#8A470B` · deny `#7C2622` | 74 · 67 · 67 · 75 % | Used ONCE per document: the verdict name on the verdict page — the document's one colour moment. |

**The greyscale truth, stated plainly:** conditional and verify converge in grey (both ≈ 67 %),
and clear/deny sit near each other — hue can NEVER carry the verdict. It never does here: the
level is carried by **position on the four-slot scale (active slot solid, others outlined),
the "Level n of 4" line, and the label text**. In grey the verdict name is simply dark text and
the document loses nothing.

## 2 · Type scale — three real registers, wide steps

Faces: **Fraunces** (display) · **Source Serif 4** (all text, both weights) · **JetBrains Mono**
(data). The interface sans does not board the document — it belongs to the app.

| Level | Face | Size / leading | Use |
|---|---|---|---|
| Display | Fraunces 600 | 32 / 36 pt | Document title (cover), verdict name (30 pt) — twice in the document, nowhere else |
| Section | Fraunces 600 | 15 / 20 pt | Section openings ("The five assessment areas", headline) |
| Area head | Source Serif 600 | 12.5 / 16 pt | Assessment-area names, "The single most important risk" |
| Body | Source Serif 400 | 10.5 / 15.5 pt | All prose. Measure 65–72 characters. |
| Label | Source Serif 600 | 9 / 12 pt | Meta labels — weight and position, **no letterspacing** |
| Data | JetBrains Mono 400 | 8–9 pt | Case refs, dates, footer |

**Letterspaced capitals are used exactly once:** the kicker above the verdict name. The single
most important moment earns the document's single formal device. Every other label works
through weight and position.

## 3 · Page geometry

US Letter. Text block **350 pt wide** (≈ 70 characters of body serif). Left margin 90 pt;
right margin 172 pt — the wide margin is deliberate white space and carries only the area
marginalia (certainty labels) on findings pages. Top 76 pt, bottom 84 pt. Running footer
(mono 7.5 pt, soft ink): `case · Page n of N · Delivered date`.

## 4 · The cover — authority, no verdict

White. Wordmark (traced asset, navy + copper) top left. Lower half: a short navy rule, the
document title in display Fraunces, then the identity stack — **value-first** (supplier and
brands set large, labels small above them), never a form grid. Confidentiality + issuer at the
foot. Nothing else.

**Ruling argued (§3 of the brief): the verdict does NOT ride the cover.**
(a) The reference class — legal opinions, diligence memos, credit reports — never front-loads
the conclusion on the binding; the cover's job is authority. (b) The verdict is the product's
one reveal; on the cover it competes with brand presence and gets neither room nor context
(the scale needs explaining space). (c) PDFs surface as thumbnails in email clients — the
confidentiality posture argues against the decision being legible from a file preview. The
verdict instead **owns page 2 entirely** — the first thing the reader meets on opening, with
the whole page as its stage. The counter-argument (reader holds the decision without opening)
is real but weaker: this reader paid for the document; they will open it.

## 5 · The verdict page — the hero

Page 2 carries: the kicker → verdict name at 30 pt in its print ink (the colour moment) →
`Level n of 4` in mono → the four-slot scale at full text width (active slot solid with
reversed label; inactive slots outlined, grey labels — value + position, greyscale-proof) →
the verdict's meaning paragraph → a hairline → the engine's summary headline (Fraunces 15) →
the single most important risk. One page, one subject, generous air.

## 6 · Page-break rules (build requirements)

- A heading never separates from its first two lines (`minPresenceAhead`).
- A finding block breaks only if longer than a page; otherwise moves whole (`wrap={false}`).
- Prose orphan/widow floor: 2 lines (react-pdf `orphans`/`widows`).
- The timeline/progress line binds to the block above it — never a page-foot orphan.
- The checklist breaks between items only; an item never splits.

## 7 · Defects carried from the rejected samples — status

- **fi/ff ligature loss** ("verifed", "confrmed", "SEC flings"): root cause — fontkit shapes
  the ligature glyph but react-pdf's toUnicode maps it to one character, so the text layer
  drops letters on copy. FIXED at the font level: `liga`/`clig`/`dlig`/`calt` stripped from
  every embedded face (fonttools; tabular/fraction features kept) — f-i draws as two glyphs,
  visually fine at text sizes, and the copy layer is 1:1. Verification now asserts the intact
  words and rejects the broken forms.
- **Page-break discipline:** §6 rules are build requirements, demonstrated in the spread.
- **"Prepared for —"** renders a dash because Stripe's checkout captures `customer_details.name`
  and the webhook discards it (known dev-lane gap, webhooks route ~line 132). **No PDF can
  ship addressed to nobody** — the production build must fail loudly on a missing client name
  rather than print a dash. Flagged; not fixable in the design lane.
