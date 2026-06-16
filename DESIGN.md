# Design

*Seed version — written pre-implementation (no real code/tokens to extract yet). Re-run `/impeccable document` once the portal has real pages and components, to replace these hypotheses with extracted, verified tokens.*

## Visual Theme

**Light-first, warm, evidence-driven.** Not dark-SaaS-by-default — dark mode can exist later as an opt-in, never the identity. The feeling to hit: a knowledgeable advisor's office, not a security operations center. Minimalist layout, generous whitespace, but warmed up with color (multi-color icon system) and a confident electric-blue brand accent so it never tips into cold/clinical.

Reference anchor: **Mercury/Ramp's confident data-forward polish**, translated to a light, optimistic palette instead of their dark mode — same precision and trust signals, different temperature.

## Color Palette

### Base
| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#FAFAF9` | Page background — warm off-white, not stark white |
| `bg-surface` | `#FFFFFF` | Cards, panels, raised surfaces |
| `bg-subtle` | `#F1F0EE` | Subtle section separation, hover backgrounds |
| `text-primary` | `#1C1B1A` | Body/headline text — warm near-black, not pure `#000` |
| `text-secondary` | `#5B5854` | Supporting text, captions, metadata |
| `border-default` | `#E5E3DF` | Card borders, dividers — soft, warm gray |

### Brand
| Token | Hex | Usage |
|---|---|---|
| `brand-primary` | `#2563EB` | Electric blue — primary CTAs, links, active states, key data highlights |
| `brand-primary-hover` | `#1D4ED8` | Hover/pressed state |
| `brand-accent-warm` | `#F59E0B` | Sparing use — "hope/optimism" highlight, positive emphasis distinct from verdict colors |

### Verdict semantics (desaturated — distinguishable, never alarming)
| Verdict | Token | Hex |
|---|---|---|
| Source Clear | `verdict-clear` | `#3F9468` (muted sage green) |
| Usable With Conditions | `verdict-conditional` | `#C99A2E` (muted gold) |
| Verify Before Purchase | `verdict-verify` | `#C2742F` (muted terracotta-orange) |
| Do Not Rely On This Source | `verdict-doNotRely` | `#B5524A` (muted brick-red, deliberately *not* fire-engine red) |

All four sit at matched lightness/saturation so none visually "shouts" louder than the others — the verdict is communicated by label + icon first, color second.

### Multi-color icon system
Icons get category-coded hues (not all brand-blue) to reinforce warmth and quick visual scanning — e.g. vendor-identity icons in one hue, brand-posture icons in another, document/evidence icons in a third. Keep all icon hues inside a shared muted/mid-saturation family so the page still feels cohesive, not carnival-colored. Exact hue-per-category assignments to be finalized when building the icon set (Session 2+).

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
