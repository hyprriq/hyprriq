# HyprrIQ — Brand & Design System (v3, 2026-07-06)

Extends the locked Synthesis direction (DESIGN.md, 2026-06-17). Nothing here contradicts the locked tokens — this document **completes** the system so it covers all four surfaces (website, client portal, admin portal, agency portal) and scales with the product. Where a value changes (one token: `muted`), the change is a verified accessibility fix, not a taste change.

Brand in three words (from PRODUCT.md, unchanged): **rigorous, reassuring, human.**
Reference anchor (unchanged): Mercury/Ramp confident data-forward polish, translated to a light warm-neutral palette with a deep confident blue.

---

## 1. Color — base & brand (unchanged except `muted`)

| Token | Hex | Usage |
|---|---|---|
| `base` | `#FAF9F7` | Page background |
| `surface` | `#FFFFFF` | Cards, panels, raised surfaces |
| `subtle` | `#F2F1ED` | Insets, hover bg, section separation |
| `ink` | `#1A1917` | Headlines, body (16.7:1 on base) |
| `ink-2` | `#56544E` | Supporting text (7.2:1 on base) |
| `muted` | **`#75736B`** ← was `#8A887F` | Tertiary *text*: timestamps, sub-labels, empty states (4.51:1 — AA) |
| `muted-decor` | `#8A887F` | NEW — non-text only: disabled icons, decorative dots, dividers-with-presence |
| `line` | `#E6E4DE` | Borders, dividers |
| `line-strong` | `#D6D3CB` | Emphasized borders, input borders on hover |
| `brand` | `#1B4B8A` | Primary actions, links, active states (8.7:1 on white) |
| `brand-hover` | `#2A6ACC` | Hover/pressed |
| `brand-ink` | `#0F2A4E` | Drench moments, dark panels, gradient ends |
| `brand-tint` | `#E8F0FB` | Selected rows, tags, quiet highlights |
| `accent-warm` | `#B8731A` | Rare hope/optimism highlight; never near verdict colors |
| `accent-data` | `#2F6F6A` | Neutral process/data accent; never adjacent to a verdict color |
| `accent-data-tint` | `#E9F2F1` | Fill for accent-data contexts |

**Rationale for the one change**: `#8A887F` measures 3.38:1 on `base` and 3.55:1 on `surface` — below the 4.5:1 AA floor for normal text, and it is used for real content across the portal (timestamps, "of 12 remaining", empty states). `#75736B` keeps the same warm-gray hue family at 4.51:1. The old value survives as `muted-decor` so nothing decorative gets darker/heavier.

## 2. Verdict semantics (unchanged, verified)

The four verdicts are the loudest color moment on any screen — the reveal the product builds to. Matched weight; none shouts louder. Label + icon first, color third. Never color-only.

| Verdict | `bg` | `ink` | Contrast | Icon (Lucide) |
|---|---|---|---|---|
| Source Clear | `#EAF6EF` | `#1A6B3A` | 5.90 ✓ | `circle-check` |
| Usable With Conditions | `#F7F1DC` | `#846412` | 4.87 ✓ | `alert-circle` |
| Verify Before Purchase | `#FAEEDF` | `#9A551F` | 4.97 ✓ | `scan-eye` |
| Do Not Rely On This Source | `#F8E9E6` | `#9A332C` | 6.17 ✓ | `circle-x` |

All four inks also pass AA directly on `base`/`surface` (5.2–6.9:1), so verdict-colored *text* outside a badge is permitted (e.g., dimension states, SLA warnings) — but keep it scarce so badges stay the loudest moment.

### 2.1 Dark-panel verdict brights (NEW — tokenized)

On `brand-ink`/`ink` dark panels (auth brand panel, admin sidebar accents) the light-bg inks are too low-contrast. These four are the *only* permitted bright variants, replacing the ad-hoc hexes in `auth-shell.tsx`:

| Token | Hex | Pairs with |
|---|---|---|
| `clear-bright` | `#6EE7B7` | dark panels only |
| `conditional-bright` | `#FCD34D` | dark panels only |
| `verify-bright` | `#FDBA74` | dark panels only |
| `deny-bright` | `#FCA5A5` | dark panels only |

(These are the existing sign-in TONE_DOT values, promoted to tokens. The sign-up panel's off-system violet `#C4B5FD` is retired; its fourth pill uses `accent-warm` brightened: `#E8A94E`.)

### 2.2 Verdict usage rules
1. A verdict badge = icon + full label + `bg`/`ink` pair, pill radius. Never truncate the label below "Do Not Rely".
2. Verdict color never decorates non-verdict things. SLA warnings borrow `verify-ink` deliberately (it means "act before buying/deadline") — that is the only sanctioned reuse.
3. The verdict spectrum bar (4 segments, best→worst) is the brand's signature motif — usable on marketing, auth, report headers, and loading states. Segments always in fixed order; never reordered or subset.
4. In data viz (admin outcomes, agency dashboards), verdict distribution charts use the four inks at full value on white — the one context where all four appear at density.

## 3. Semantic state colors (NEW)

App surfaces need state colors that are *not* verdicts. Map to the same hue families so nothing new enters the palette, but use them via semantic names so meaning stays distinct:

| Token | Value | Usage |
|---|---|---|
| `success` / `success-bg` | `#1A6B3A` / `#EAF6EF` | Saves, confirmations, "report ready" |
| `warning` / `warning-bg` | `#9A551F` / `#FAEEDF` | Action needed, SLA due, unsaved changes |
| `danger` / `danger-bg` | `#9A332C` / `#F8E9E6` | Errors, destructive actions, failed payments |
| `info` / `info-bg` | `#1B4B8A` / `#E8F0FB` | Neutral notices, in-progress |

Components reference `danger`, never `deny-ink` — same hex today, but the indirection lets verdict colors evolve independently of UI states.

## 4. Typography (unchanged stack, completed scale)

- **Display / headlines**: Schibsted Grotesk (500–800) — newsroom authority; the "intelligence firm" voice.
- **Body / UI**: Hanken Grotesk (400–700) — humanist, warm, readable.
- **Data / mono**: Geist Mono — case IDs, scores, dates in tables, always `tabular-nums`.

### 4.1 Marketing scale (fluid)
| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero H1 | `clamp(2.4rem, 5.2vw, 3.9rem)` | 700 | `leading-[1.05]`, `-0.02em`, `text-wrap: balance` |
| Section H2 | `clamp(1.75rem, 3vw, 2.4rem)` | 700 | |
| Manifesto H2 | `clamp(1.9rem, 3.8vw, 3rem)` | 700 | drench sections only |
| Lede | `1.125rem` (18px) | 400 | `ink-2`, max-w ~65ch |
| Body | `0.9375rem` (15px) | 400 | |

### 4.2 App scale (fixed rem — product register, no fluid type)
| Token | Size | Use |
|---|---|---|
| `text-page-title` | 20px / 700 display | Topbar H1 |
| `text-section` | 16px / 700 display | Card/section headers |
| `text-body` | 14px / 400–500 | Default UI text |
| `text-detail` | 13px / 400 | Secondary cell text, helper text |
| `text-caption` | 12px / 500 | Uppercase labels, table headers (tracking-wide) |
| `text-metric` | 28px / 800 display | KPI numbers (`tabular-nums` when comparable) |
| Report verdict display | 24px / 700 display | The one large type moment inside the portal — the delivered verdict |

Rules: one display family for headings ≥16px; Hanken for everything interactive; mono only for identifiers and figures; body line-height 1.5, dense table cells 1.4; no font below 12px.

## 5. Icon system (NEW — closes the DESIGN.md "Session 2+" gap)

- **Library**: Lucide only. Stroke 1.75 (2.25 only inside verdict badges for punch). Sizes: 14 (inline), 16 (buttons/badges), 18 (nav), 20 (feature), 22 (marketing strips).
- **Default color**: `ink-2` (neutral). Icons never introduce hue except the two sanctioned sets below.
- **Zero emoji in UI chrome.** Emoji are permitted only inside user-generated content.

### 5.1 Research-dimension hues (the one sanctioned category-color set)
Stable hue per dimension so returning users scan by color. All muted/mid-saturation, family-consistent with the palette:

| Dimension | Icon | Hue | Tint bg |
|---|---|---|---|
| Supplier Identity | `building-2` | `#1B4B8A` (brand) | `#E8F0FB` |
| Supply Chain Relationship | `git-branch` | `#2F6F6A` (accent-data) | `#E9F2F1` |
| Brand Risk | `shield-alert` | `#9A551F` (verify-ink) | `#FAEEDF` |
| Documentation Review | `file-search` | `#846412` (conditional-ink) | `#F7F1DC` |
| Sourcing Logic | `route` | `#6B5B95` → **no.** Use `#56544E` (ink-2) | `#F2F1ED` |

(Deliberately no new hue for the fifth dimension — four hues + neutral keeps the set inside the existing palette; a fifth novel hue would start the carnival DESIGN.md bans.)

### 5.2 Navigation icon assignments (portal / admin / agency)
Dashboard `layout-dashboard` · New Case `plus` · Active Cases `folder-search` · Completed `file-check-2` · Billing `credit-card` · Settings `settings-2` · Help `circle-help` · Support `mail` · Quality Review `scan-search` · Delivered `send` · All Cases `layout-list` · Clients `users` · Outcomes `chart-line` · Revenue `chart-column` · Prompts `file-text` · Team `user-cog` · Reports library `library`.

## 6. Component standards (NEW)

### 6.1 Buttons
Two registers, one vocabulary:

| | Marketing | App (portal/admin/agency) |
|---|---|---|
| Shape | Pill (`rounded-full`) | `rounded-[10px]` |
| Sizes | lg (px-6 py-3 / 16px) | md (px-4 py-2.5 / 14px), sm (px-3 py-1.5 / 13px) |

Variants (both registers): **primary** solid `brand`→`brand-hover`; **secondary** `surface` + `line-strong` border → `subtle` hover; **ghost** text `ink-2` → `subtle` hover; **destructive** solid `danger` (app only, always paired with a confirm pattern).
States: every button ships default/hover/focus-visible/active/disabled/loading. Active = `scale(0.98)`, 120ms ease-out. Loading = spinner replaces leading icon, label persists, width locked. Disabled = 50% opacity + `cursor-not-allowed`.
**No text arrows (`→`) in labels** — use `arrow-right` icon 16px, gap-2, or nothing.

### 6.2 Cards & elevation
| Level | Style | Use |
|---|---|---|
| 0 | `surface` + `line` border | Default panels, tables |
| 1 | + `shadow-[0_1px_2px_rgba(26,25,23,0.04),0_12px_32px_-12px_rgba(26,25,23,0.16)]` | Hero artifacts, the report Snapshot, modals |
| hover | `-translate-y-0.5` + level-1 shadow + `line-strong` | Interactive cards only |

Radius: `--radius-card: 14px` (cards), 10px (buttons/inputs), pill (badges/marketing CTAs). Never nest cards; inside a card use `base` inset panels with `line` borders.

### 6.3 Badges/pills
`rounded-full px-2.5 py-1 text-[12px] font-semibold` + optional 14px icon. Status pills use semantic tokens; verdict badges per §2. Sentence case except table-header captions.

### 6.4 Tables (app)
Header row: `subtle` bg, 12px/600 uppercase tracked `muted` captions. Rows: 14px, `line` dividers, hover `subtle`, 44px min row height. Identifiers in Geist Mono `tabular-nums`. Below `md`: rows collapse to stacked cards (label:value pairs) — never horizontal-scroll a primary workflow table.

### 6.5 Forms
Visible labels always (14px/500 ink). Inputs: `base` bg, `line` border, 10px radius, focus `border-brand` + ring. Helper text 13px `ink-2` below input; errors 13px `danger` with `circle-alert` 14px, below the field. Required = asterisk in `danger`. Validate on blur. Placeholder is example, never label. Multi-step flows keep the existing stepper pattern (numbered circles + connecting line).

### 6.6 Empty states (teaching pattern)
Icon (20px, `muted-decor`, in a `subtle` circle) + one-line what-this-is (14px ink) + one-line how-to-start (13px ink-2) + optional primary action. Never a bare "No X yet."

### 6.7 Modals
Only for: destructive/irreversible confirms (publish, delete, cancel-plan) and focused single-task input. Centered, `transform-origin: center`, scale 0.97→1 + fade 200ms ease-out, exit 140ms. Backdrop `rgba(26,25,23,0.45)`. Focus-trapped, Esc closes (except mid-submit). Irreversible confirms: restate the object identity (case number, vendor, client), show the consequence, destructive-styled confirm labeled with the verb ("Publish report", never "OK").

## 7. Layout, spacing, z-index (NEW)

- Spacing scale: 4px base — 4/8/12/16/20/24/32/40/48/64. Marketing sections `py-12 lg:py-16` (drench moments `py-20/24`).
- App shell: sidebar 248px fixed ≥1024px; off-canvas overlay below (hamburger in topbar). Topbar 64px. Content `px-7 py-6`, max content width 1200px for reading surfaces, full for tables.
- Container (marketing): `max-w-6xl px-5 lg:px-8`.
- Z-index scale: `dropdown 10 · sticky 20 · sidebar-overlay 30 · modal-backdrop 40 · modal 50 · toast 60 · tooltip 70`. Never arbitrary values.
- Breakpoints: 640 / 768 / 1024 / 1280 (Tailwind defaults). Portal is desktop-primary but must be *usable* at 375px (status checking, report reading).

## 8. Motion (NEW — tokenized)

| Token | Value |
|---|---|
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` (existing) |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| `--dur-fast` | 120ms (press feedback) |
| `--dur-base` | 200ms (hover, tabs, dropdowns) |
| `--dur-slow` | 300ms (modals, panels) |
| `--dur-reveal` | 600–700ms (marketing choreography only) |

Rules: transform/opacity only; enter ease-out, exit ~65% of enter duration; no bounce/elastic anywhere (undercuts authoritative-calm). **App surfaces animate state, never entrance** — the two sanctioned app "moments" are (1) the verdict badge settle (scale 0.96→1 + fade, 500ms, once) when a delivered report opens, and (2) dimension rows flipping Queued→Complete (crossfade 200ms) during live progress. Marketing keeps its load/scroll choreography. Everything honors `prefers-reduced-motion` (crossfade or instant).

## 9. Accessibility (verified numbers)

- Verified AA: ink 16.70, ink-2 7.20, brand-on-white 8.68, white-on-brand 8.68, accent-data 5.83, all four verdict pairs 4.87–6.17, verdict inks on base 5.23–6.92.
- Fixed: `muted` 3.38 → `#75736B` 4.51 (this doc §1).
- Focus: global `:focus-visible` 2px `brand` ring, offset 2 (already shipped — keep).
- Verdicts/status never color-only (icon + label always). Keyboard: full tab order, modals trapped, tables row-focusable where rows act. Touch targets ≥44px on mobile-reachable controls.

## 10. Voice & register (summary — full rules in content package)

- **Rigorous**: specific numbers, named dimensions, verified/inferred/unconfirmed vocabulary.
- **Reassuring**: every wait state says what's happening and when it resolves; errors say how to fix.
- **Human**: plain verbs, sentence case, no exclamation marks in chrome, no emoji in chrome.
- **Compliance floor** (all surfaces incl. buttons/tooltips/empty states): never "guaranteed," "safe," "authorized" (loosely), "protect your account," "risk-free." The product reports; the client decides. "Agency" never appears in public/client-facing headlines (the agency *tier* is named **HyprrIQ Teams** in client-facing copy — see content package §6).

## 11. Surface register map

| Surface | Register | Buttons | Motion | Density |
|---|---|---|---|---|
| Website | Brand | Pill | Choreography allowed | Airy |
| Auth | Bridge | Pill (Clerk themed) | One staggered moment | Airy |
| Client portal | Product | 10px | State-only + 2 sanctioned moments | Moderate |
| Admin portal | Product (dense) | 10px | State-only | Dense |
| Agency portal | Product | 10px | State-only | Moderate-dense |

## 12. Token delivery (implementation shape)

All of the above lands as `@theme` additions in `app/globals.css` (Tailwind v4 CSS-first tokens) — **additive**, plus the single `muted` value change. New tokens: `muted-decor`, four `*-bright`, four semantic state pairs, dimension hue map (as CSS vars consumed by the icon components), motion durations, z-index scale. No component may hardcode a hex that exists as a token (current violations to clean: auth-shell TONE_DOT/pills, hero gradients, Clerk `colorPrimary` stays literal by necessity with a mirror comment — already documented in code).
