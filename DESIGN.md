# Design

*Direction LOCKED 2026-06-17: **Synthesis** — resolved the warm/electric-blue (old DESIGN.md) vs cool/navy (`hyprriq_ux_v2.html`) conflict. This file is now the single source of truth; the v2 HTML and the old warm-only tokens are superseded by what's below. Re-run `/impeccable document` once real components exist to replace any remaining hypotheses with extracted tokens.*

## Visual Theme

**Light-first, warm-neutral, evidence-driven — disciplined.** Not dark-SaaS-by-default (dark is an opt-in, never the identity). Not cold-clinical, not cream-AI-default either. The feeling to hit: a knowledgeable advisor's office, not a security operations center. Minimalist layout, generous whitespace, a **warm-neutral** base (just off cool — humane, not sterile), and a single **deep, confident blue** brand for authority. Color is *restrained*: the four verdict colors are the loudest moment on any screen — the reveal the whole product builds to. Icons are mostly neutral; hue is added only where it genuinely speeds category scanning, never carnival.

Reference anchor: **Mercury/Ramp's confident data-forward polish** — same precision and trust signals, translated to a light, warm-neutral palette with a deep-blue (not electric, not navy) brand.

## Color Palette

### Base (warm-neutral — just off cool, never cream, never stark white)
| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#FAF9F7` | Page background — warm-neutral off-white |
| `bg-surface` | `#FFFFFF` | Cards, panels, raised surfaces |
| `bg-subtle` | `#F2F1ED` | Inset/sidebar, hover backgrounds, section separation |
| `text-primary` | `#1A1917` | Body/headline text — warm near-black, not pure `#000` |
| `text-secondary` | `#56544E` | Supporting text, captions, metadata |
| `text-muted` | `#8A887F` | Placeholders, timestamps, least-important metadata |
| `border-default` | `#E6E4DE` | Card borders, dividers — soft, warm gray |

### Brand (deep confident blue — between electric `#2563EB` and navy `#1B4B8A`)
| Token | Hex | Usage |
|---|---|---|
| `brand-primary` | `#1B4B8A` | Deep blue (prototype brand, final) — primary CTAs, links, active states, key data highlights |
| `brand-primary-hover` | `#2A6ACC` | Hover/pressed state |
| `brand-ink` | `#0F2A4E` | Darkest blue — brand drench (manifesto), brand-panel gradient end |
| `brand-tint` | `#EAEEFB` | Selected rows, tags, badges, subtle highlights |
| `brand-accent-warm` | `#B8731A` | Rare — "hope/optimism" highlight; must never compete with verdict colors |

### Verdict semantics (the LOUDEST color on any screen — the reveal; calm evidence, never a klaxon)
Badge pattern = `ink` text + icon on `bg` fill. Color is the *third* signal after label + icon, but it is the strongest color moment on the page.

| Verdict | `bg` | `ink` |
|---|---|---|
| Source Clear | `#EAF6EF` | `#1A6B3A` (sage green) |
| Usable With Conditions | `#F7F1DC` | `#846412` (muted gold) |
| Verify Before Purchase | `#FAEEDF` | `#9A551F` (terracotta) |
| Do Not Rely On This Source | `#F8E9E6` | `#9A332C` (muted brick — deliberately *not* fire-engine red) |

The four sit at matched weight so none "shouts" louder than another — the verdict is communicated by label + icon first, color second. But against the neutral page, the verdict badge is unmistakably the most colorful element in view.

### Icon system (restrained — neutral by default, hue only to aid scanning)
Default icon color is `text-secondary`/`text-primary` (neutral). Category hue is applied **only** where it genuinely speeds scanning of a repeated set — e.g. the research-dimension icons (Supplier Identity / Supply Chain / Brand Risk / Document / Sourcing Logic) each get one stable hue so a returning user reads them at a glance. Outside those defined sets, icons stay neutral. All hues live in a shared muted/mid-saturation family (no neon, no full-saturation). This is the synthesis position: warmth and quick scanning where it earns its keep, discipline everywhere else — never carnival-colored. Exact per-category hue assignments finalized when the icon set is built (Session 2+).

## Typography

**Geometric sans, paired to avoid the generic-Inter-everywhere look** (the thing we're explicitly avoiding — "AI slop" templated feel):

- **Display/Headlines:** Geist (free, distinctive geometric sans, less overused than Inter alone)
- **Body/UI:** Inter (ubiquitous but unobtrusive at body size — fine where it's not the focal element)
- **Data/numeric (case IDs, dates, confidence scores):** Consider a monospace or tabular-numeral variant for alignment in tables — decide once the dashboard's data density is in front of us.

Scale: standard modular scale, headline weight 600–700, body weight 400–500. Avoid ultra-bold/heavy weights that read as aggressive.

## Components

- **Cards:** soft shadow (not hard 1px border alone), 12px radius — rounded enough to feel approachable, not so round it feels playful/consumer.
- **Buttons:** primary = solid `brand-primary`, secondary = outline/ghost. No gradient fills (anti-reference: crypto/Web3 flashiness).
- **Verdict badge:** label + icon + the matched desaturated color from the table above. Never color-only.
- **Forms:** progressive disclosure for the intake form — it collects a lot (vendor, brands, optional invoice, notes) and must not feel like one giant form. Group into clear steps.
- **Empty/loading states:** warm, reassuring copy — match the "trust and hope" personality even when there's nothing to show yet (e.g. case awaiting research).

## Layout

- Generous whitespace on marketing pages (brand-register, persuasive, give the message room to breathe).
- Portal/dashboard: moderate density — favor clarity over Bloomberg-terminal density given the warmth goal, but the case-status and track-progress views can be more data-forward since that's where "evidence-led" trust is built.
- Standard responsive breakpoints (mobile/tablet/desktop) — portal is desktop-primary (B2B, at-a-desk usage) but must not break on tablet.

## Motion

**Subtle confidence** — Mercury/Stripe-level polish, not showy. 150–250ms ease-out on hover/state changes, gentle fade+slide on page/panel transitions, no bounce or playful easing (would undercut the authoritative+calm personality). Respect `prefers-reduced-motion`.

## Accessibility

WCAG 2.1 AA baseline: all color pairs above need contrast verification at implementation time (the muted verdict colors especially — desaturation can hurt contrast, so each needs to be checked against its background, not just visually approved). Full keyboard navigation and visible focus rings on every interactive element.

---

## v2 marketing decisions (locked 2026-06-17)

Resolved after a design-system review (refs: 21st.dev simplistic-saas & synth-ai; benchmarks Stripe/Linear/Mercury). These govern all marketing surfaces.

### Narrative arc (the spine)
Hook → **Pain** (where sellers lose money) → Stakes (why pre-purchase) → How it works (sticky scroll story) → The four outcomes → The depth → **Honesty manifesto** ("we never say safe") → Who it's for → Pricing → FAQ → Final CTA. Lead with the buyer's fear, not the feature list. Compliance: pain is always framed as "what happens when you don't check first," **never** "we protect your account."

### Background system (segmentation by meaning, not decoration)
Disciplined 4-tier rhythm — no gradients-everywhere, no dark sections:
- `bg-base #FAF9F7` — default narrative sections
- `bg-surface #FFFFFF` — sections anchored by an artifact/proof (alternates for rhythm)
- `bg-subtle #F2F1ED` — quieter/supporting sections
- **`brand-ink #0F2A4E` drench** — the honesty manifesto only (the single bold moment; light text) + a restrained brand band for the final CTA
Hero may carry one barely-perceptible warm→white wash. Nothing more.

### Color — verdict system IS the multi-accent
Reject Google-style rainbow accents: the four verdict colors are the controlled multi-accent and must stay the loudest color moment. Single deep-blue brand + verdict semantics (Stripe-trust / Linear-restraint lineage). One tightly-scoped neutral data accent allowed:
| Token | Hex | Usage |
|---|---|---|
| `accent-data` | `#2F6F6A` | muted teal-ink — process/neutral data accents only; never adjacent to a verdict color |

### Typography (locked)
Display/headlines **Schibsted Grotesk** (editorial/newsroom authority — signals "intelligence firm," uncommon in SaaS). Body/UI **Hanken Grotesk** (humanist, warm, readable). Data **Geist Mono**. Rejected as AI-default tells: Inter, Geist (sans), Plus Jakarta Sans, Instrument Sans.

### Motion
Scroll storytelling adopted, scoped: sticky/pinned "how it works" where the Decision Snapshot assembles as you scroll; count-up only on **real product facts** (60+ data points, 5 dimensions, 14 doc standards — never vanity metrics); subtle section reveals; CTA micro-interactions. Transform/opacity only; `prefers-reduced-motion` → static. No decorative parallax.

### Information architecture & SEO (structure now, build later)
Marketing route plan so programmatic SEO slots in without re-platforming: `/`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/use-cases/[slug]`, `/industries/[slug]` (amazon-wholesale, walmart-wholesale), `/compare/[slug]`, `/glossary/[term]` (gated-brand, ungating, ip-complaint — long-tail), `/resources`, `/blog/[slug]`. Each page: one `<h1>`, semantic landmarks, per-route metadata, JSON-LD (Organization / Product / FAQPage), sitemap + canonical. The Home ships FAQ + Organization JSON-LD now.

### Flexible for future content (layout locked 2026-06-17, expand without redesign)
- **Array-driven, add entries anytime:** pain modes, depth list + stat counters, buyer profiles, pricing plans, FAQ items.
- **Drop-in full sections between existing ones:** logo/social-proof strip, customer outcomes/case studies, industry sections, comparison ("vs doing it yourself"), resources/blog teasers.
- **Swappable artifacts (one slot each, marked `SWAP POINT`):** `DecisionSnapshot`, `DashboardPreview`, `ReportPreview`, and the scroll-story stage visuals → replace mock with a real screenshot, no layout change.
