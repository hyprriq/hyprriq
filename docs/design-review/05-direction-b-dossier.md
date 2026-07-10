# Direction B — "The Dossier" (new design proposal, 2026-07-06)

A ground-up visual direction, designed fresh per the founder's request. The previously locked DESIGN.md system is set aside for this exercise; if Direction B is approved, this document becomes the new DESIGN.md source and the implementation guide gets re-pointed at it. **Nothing in the app has changed — these are review-only mockups in `mockups-v2/`.**

## The scene (one sentence)

*A senior analyst's desk at a private intelligence firm: dark ink, bright documents, a stamped verdict.*

Everything derives from that sentence. The chrome (nav, shells, hero) is the dark desk; the content (cases, reports, plans) are white documents sitting on it; the verdict is a physical **stamp** pressed onto the dossier. The product's deliverable — a document a seller acts on — becomes the literal design language.

## Why this is stronger than the current design

| | Current (v1, "Synthesis") | Direction B ("Dossier") |
|---|---|---|
| First impression | Clean light SaaS — competent, but reads like many fintech tools | Dark editorial intelligence firm — nobody in this category looks like this |
| Brand color | Deep blue `#1B4B8A` (the most common SaaS trust color) | Petrol teal `#0F5E66` + brass thread (rare, ownable) |
| Typography | Geometric sans everywhere (Schibsted/Hanken) | **Besley serif** display = editorial authority; Public Sans body = official-document clarity |
| The verdict moment | A colored pill badge | A **rubber stamp** — rotated, double-ruled, animated thunk on reveal. The signature no competitor has |
| Section system | Standard centered heads | **File tabs** — case-file tabs label every section ("File — Where the money goes") |
| Portal IA | Left sidebar (default SaaS) | **Dark top-bar chrome, no sidebar** — the full width belongs to the documents; cases render as physical case-file cards with tab cutouts |
| Motion | Fade-up reveals | Scroll-stop choreography: pinned dossier that **assembles through 3 states** as you scroll, stamp-in animations, count-ups, brass progress bar |

The register still honors the business rules: calm not alarmist (the dark is warm charcoal under lamplight, not cyber-dark), verdict colors stay the loudest semantic moment, no method exposure, no "agency" in client-facing copy, banned-language discipline intact.

## Palette

### Chrome & workspace
| Token | Hex | Usage |
|---|---|---|
| `chrome` | `#16130E` | Warm near-black — hero drench, top bars, footer, manifesto |
| `chrome-2` | `#242019` | Raised dark surfaces, fact ribbon |
| `chrome-text` | `#F4F1EA` | Off-white type on dark |
| `chrome-dim` | `#A69F8F` | Secondary type on dark (AA on chrome) |
| `ops` | `#0B3A40` | **Admin-only chrome** — petrol-dark top bar distinguishes the Review Desk |
| `desk` | `#EDEAE2` | The workspace behind documents (light surfaces) |
| `paper` | `#FFFFFF` | Documents — cards, reports, forms |

### Ink & accents
| Token | Hex | Usage |
|---|---|---|
| `ink` / `ink-2` / `muted` | `#1B1812` / `#544F45` / `#6E695E` | Text ramp on paper/desk |
| `line` / `line-strong` | `#DBD6CA` / `#C4BEAF` | Rules and borders |
| **`petrol`** | `#0F5E66` | THE accent — CTAs, links, active states (hover `#147A84`, tint `#E1EFEF`, bright-on-dark `#58B8BD`) |
| **`brass`** | `#B08D3E` (dim `#8C6F2E`) | The detail thread — file-tab dots, hairlines, active-nav underline, admin avatar. Never body text, never large fills |

### Verdicts (unchanged — semantic product IP)
Source Clear `#1A6B3A`/`#EAF6EF` · Usable With Conditions `#846412`/`#F7F1DC` · Verify Before Purchase `#9A551F`/`#FAEEDF` · Do Not Rely `#9A332C`/`#F8E9E6`. Bright variants on dark: `#3E9C68` `#C9A22E` `#D07B36` `#C25048`.

## Typography

- **Display**: **Besley** (Google Fonts, 500–800) — a firm, slightly sharp clarendon-blooded serif; reads "established firm," not "startup." Used for all headings, KPI numbers, stamps, plan prices.
- **Body/UI**: **Public Sans** (400–700) — designed for official documents (USWDS lineage); quietly reinforces the dossier register.
- **Data**: **Geist Mono** — case IDs, dates, ledger headers, file-tab labels, deadlines (`SLA DUE TODAY` style), always tabular.

Pairing logic: serif display × neutral sans body = real contrast axis; the mono carries the "typed into the record" texture that makes tables feel like ledgers.

## Signature elements (what makes it unmistakable)

1. **The stamp.** Verdicts render as rotated (-1.5° to -2°) double-ruled stamps in Besley caps. Animated: scale 1.3→1 + fade with a slight overshoot curve (`cubic-bezier(.34,1.3,.5,1)`, ~450ms) when scrolled into view or when a report opens. Static under reduced-motion. Appears at 3 scales: hero dossier, report letterhead (large), case-card ministamp.
2. **File tabs.** Every document card has a physical tab cutout (`::before` notch); every marketing section is headed by a tab label (`■ FILE — WHERE THE MONEY GOES` in mono caps with a brass square). This replaces generic eyebrow-kickers with an ownable, on-metaphor system.
3. **The assembling dossier (scroll-stop).** On the homepage, a sticky document on the left steps through intake → research-in-progress → stamped verdict as the three steps scroll past on the right, with a petrol progress bar. IntersectionObserver-driven, fully degraded for reduced-motion/no-JS.
4. **Ledger tables.** Admin/portal tables use a 2px ink rule under mono-caps headers — bank-ledger discipline instead of gray SaaS table headers.
5. **Brass thread.** One hairline of brass per view maximum (hero base rule, manifesto tick, active-nav underline). It's the wax-seal detail: scarce or it's costume.

## Portal architecture change

Direction B removes the left sidebar. Portals use a **dark top-bar** (charcoal for clients/Teams, petrol-dark for admin) with 5–6 nav items and a brass active underline; content gets the full desk width. Client cases render as a **grid of case-file cards** (tab notch, ministamp for delivered verdicts, 5-dot dimension progress for in-research) rather than table rows — the "documents on a desk" mental model. Admin keeps the ledger table (operators need density) plus the triage strip and keyboard hints.

## Mockups in this direction (`mockups-v2/`)

| File | Screen | What to look at |
|---|---|---|
| `01-home.html` | Homepage | Ink-drench hero with the dossier artifact; **scroll the "How a case is built" section** for the pinned assembly sequence; stamp wall; manifesto; pricing incl. Teams |
| `02-client-dashboard.html` | Client dashboard | Top-bar chrome, index-card strip, case-file grid with ministamps + progress dots |
| `03-client-report.html` | Delivered report | The letterhead dossier: firm plate, big stamp-in verdict, findings ledger + ask list, dimension evidence below |
| `04-admin-queue.html` | Admin Review Desk | Petrol-dark ops chrome, triage strip, ledger queue with client column + deadline aging, keyboard hints |
| `05-sign-in.html` | Sign-in | Dark desk under lamplight; the form as a tabbed document; verdict plate |
| `06-agency-dashboard.html` | Teams dashboard | Pooled-credit burn bar by client, client chips on every case, team activity |

## If approved

The implementation guide (`04-implementation-guide.md`) structure holds — same gates, same care levels, same preserve-list — with G-2 (tokens) swapped to this palette/type, and one added early gate: **font swap** (Besley + Public Sans via `next/font`, replacing Schibsted/Hanken in `app/layout.tsx` + `globals.css` `@theme inline`) and the portal-shell gates re-pointed at the top-bar architecture instead of the sidebar refinement. Verdict hexes are unchanged, so `badges.tsx` and all verdict logic are untouched. Update DESIGN.md to this document upon approval.

## Contrast (verified values)

petrol on paper 7.46 ✓ · petrol on desk 6.21 ✓ · white on petrol 7.46 ✓ · chrome-text on chrome 16.42 ✓ · chrome-dim on chrome 7.04 ✓ · chrome-dim on ops chrome 4.71 ✓ · white on ops 12.40 ✓ · ink on desk 14.73 ✓ · ink-2 on paper 8.14 ✓ · muted on desk 4.54 ✓ (threshold — used ≥13px only) · petrol-bright on chrome 7.94 ✓ · brass on chrome 5.93 ✓ · brass-dim on paper 4.74 ✓ (labels only; brass never runs as body text). All four verdict pairs unchanged (4.87–6.17 ✓).
