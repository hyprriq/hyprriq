# HANDOVER → UI/UX LANE (marketing site build)

**Written 2026-08-23 at the close of the dev/integrity lane. Read this cold before touching anything.**

**If the code disagrees with this file, the code is right — say so with evidence rather than building to this document.** Two premises the founder holds are contradicted by the codebase; they are in §5 and you will hit them on day one.

**Branch:** `staging`, clean and pushed. **Gates at handover:** 2003/2003 tests · tsc 0 · eslint 0 errors (4 long-standing warnings in prototype assets) · `next build` clean.

**Your standing brief is `docs/UIUX_SESSION_PROMPT.md` — but read §4 of THIS file first.** That brief now carries a STOP marker at the top: its *visual* guidance (palette, type, motion) is superseded pending a founder ruling. Its structure, surface map and copy laws still stand.

---

## 1. What this session built, and what it deliberately did not

This session was dev-lane and integrity work. **No visual design work was done, by instruction.** Nothing here restyles anything.

**Built:**

- **Verdict absence handling.** A missing verdict never renders as a verdict, anywhere. The PDF refuses (`no_verdict`, in the existing `no_client_name` refusal pattern); the portal case page shows an honest refusal panel; `ReportView` throws as a belt. One shared module: `lib/portal/verdictPresence.ts`.
- **Delivery-email honesty.** The "your report is ready" email is now suppressed when the portal page would refuse — it was announcing reports a client could not read.
- **Admin boundary made real.** `app/(admin)/layout.tsx` enforced authentication only; it now enforces the operator boundary. Dev-only validation routes that spend real research budget are disarmed unless `DEV_VALIDATION_ROUTES=1`.
- **Internal-marker leak closed at the class.** A corpus census found 17 markers reaching client surfaces across 4 cases, **3 of them already delivered**. Vocabulary widened (`RG`, hyphenated `A-NNN`), mixed citation groups now lose the marker and keep the words, and the presence checkpoint backstops it.
- **Internal *vocabulary* leak closed.** `(brand_risk)` was reaching a delivered report because the substitution table was hand-written and knew `brand_risk_assessment` but not the short alias. It now derives from `AREA_NAMES`.
- **Golden-case regression suite.** 40 real cases replayed through the real verdict chain on every build. `docs/goldenCases.md` documents exactly what it catches and — more importantly — what it does not.
- **Standing integrity checks.** Five checks, each BLOCK / ALERT / SURFACE, a nightly sweep that pages once per *new* finding, and `/admin/integrity` where green means measured green with a timestamp.
- **Presentation-surface fixes you inherit** — see §3.

**Deliberately NOT done (do not assume these are oversights):**

- **No visual work of any kind.** The palette/type/motion ruling is the founder's and is open.
- **Two reported defects left unfixed on purpose**, both awaiting a ruling: the `"per credit"` error message (§5.6) and the report's silence about why a $99 buyer sees three areas (§5.2).
- No migrations run, no Stripe config touched, no deploy to `main`.
- The dead multi-credit branch in `creditsRequired` left in place — removing it is a pricing-semantics decision, not a cleanup.

---

## 2. Half-finished, and what "half" means

**Nothing is half-built in code.** Every change this session shipped complete with fixtures and is on `staging`. The genuinely unfinished items are *decisions*, not code:

| Item | What "half" means |
|---|---|
| **Visual system** | Palette, typography and motion are under active founder ruling. The current tokens have **three verdict badges failing contrast** and **a base colour the founder has rejected**. Code is fine; the design language is undecided. You cannot finish a marketing page against tokens that are about to change — get the ruling first. |
| **`UIUX_SESSION_PROMPT.md` §4** | Marked superseded, not rewritten. Someone must rewrite it *after* the ruling. The marker says the founder removes it, not a design session. |
| **The $99 area-composition gap** | Diagnosed in full (§5.2), fix not written, because the honest fix is partly a copy decision and partly a report-surface decision and both are the founder's. |
| **Keepa** | `KEEPA_LIVE = false`. Two of four tiers are off sale because of it. Being tested by the founder; not your lane, but it constrains what you may put a buy button on (§5.3). |

---

## 3. Files you will touch, and what is surprising about them

### The marketing surface

**Routes** — `app/(marketing)/`: `page.tsx` (home), `pricing`, `how-it-works`, `how-to-read`, `sample-report`, `partners`, plus six legal pages (`terms`, `privacy`, `data-policy`, `refund-policy`, `payment-policy`, `cookie-policy`).

**Components** — `components/marketing/`: `site-header`, `site-footer`, `announcement-bar`, `cookie-notice`, `pricing-plans`, `faq`, `decision-snapshot`, `dashboard-preview`, `report-preview`, `how-it-works-scroll`, `verdict-badge`, `verdict-spectrum`, `reveal`, `counter`, `newsletter-signup`, `partner-request-form`, `legal-page`.

**Copy lives in `lib/content/`, not in components** — `pricing.ts`, `how-it-works.ts`, `help.ts`, `legal.ts`, `reportCopy.ts`, `sample-report.ts`, `auth.ts`, `partnerRequest.ts`.

### Surprises — read these before you edit

1. **The six legal pages are FROZEN CONTENT.** They were rewritten under a truth-audit ruling: every sentence was checked against what the code actually does. Seven false claims were removed. **Layout is yours; wording is not.** Specific things that must not be "improved": the locked refund formula in `refund-policy`, the past-due block, and the null-until-launch effective date. `/terms` and `/privacy` URLs are **permanent** — Stripe live mode points at them and they must never move.

2. **Prices, credits, caps and SLA are never typed by hand.** They render from `lib/constants/plans.ts` (`PLAN_NAME`, `PLAN_PRICE_LABEL`, `PLAN_CREDITS_PER_CYCLE`, `PLAN_BRAND_CAPS`, `CASE_SLA_HOURS`). A hardcoded "$279" or "24 hours" in JSX is a defect even when it is currently correct.

3. **`lib/content/sampleIdentifiers.ts` exists and is mandatory.** Any mock showing a case ID must use `SAMPLE_CASE_IDS` (`AWI-SAMPLE-001`…). The live generator only ever writes four digits in the middle segment, so `AWI-SAMPLE-*` cannot collide *by construction*. This session found real delivered case IDs paired with a **real distributor's name** (`AWI-2607-022 · TD SYNNEX`) on the design reference, and a live-shaped ID on the homepage hero. A filesystem lock now fails the build on any new occurrence — including a real corpus vendor name on a presentation surface.

4. **`components/marketing/decision-snapshot.tsx` renders on the homepage** and is the most-seen surface in the product. It shipped the certainty chip **"Inferred"** — a word never ruled. The locked vocabulary is **Verified / Assessed**. Corrected this session; do not reintroduce it.

5. **`public/prototype/**` is reference-only and partly stale.** `DESIGN_SYSTEM_reference.html` was corrected this session for the same two defects. `public/prototype/backup/` is an archive — do not build from it. The prototype report files still carry "Inferred".

6. **`partner-request-form.tsx` and `/partners` are function-complete and live.** The `partner_requests` table exists in production. This is restyle-don't-rewire territory; its copy is MUST_PASS-locked.

7. **`newsletter-signup` and `/unsubscribe` are live and legally load-bearing.** The unsubscribe URL is permanent (CAN-SPAM). Don't move it.

---

## 4. Standing locks

### Locks that FAIL THE BUILD (you will hit these; that is their job)

| Lock | Fails when |
|---|---|
| `lib/utils/clientCopy.bannedLanguage.lock.test.ts` | **Any string literal** you add under `components/marketing`, `app/(marketing)`, `lib/content`, `components/portal`, `app/(portal)` or `app/api` contains banned language. It walks the filesystem and extracts literals — **new copy is scanned automatically, whether or not you remember.** |
| `lib/utils/bannedLanguage.fix.test.ts` (`MUST_PASS`) | A pinned client-facing string changes without its fixture. **Standing rule 8: any new client-facing string joins MUST_PASS in the SAME commit.** |
| `lib/content/retiredPricing.lock.test.ts` | A retired price figure ($79/$129/$239/$197/$249) appears in live client copy. Note: it deliberately allows `$239.94` — a price with cents is refund arithmetic, not a price tag. |
| `lib/content/sampleIdentifiers.lock.test.ts` | A live-shaped case ID **or a real corpus vendor name** appears on a presentation surface. Comments citing real cases as provenance are exempt (it strips comments first). |
| `lib/constants/plansOnSale.lock.test.ts` | A category-compliance tier is marked on-sale while `KEEPA_LIVE` is false; or a pricing card's `comingSoon` flag stops deriving from the registry; or a coming-soon card carries "Most popular". |
| `lib/portal/verdictPresence.lock.test.ts` | Any render-layer file falls back **to a verdict value**. Falling back to an honest non-verdict ("pending", "—") stays legal. |
| `lib/auth/clientBoundary.lock.test.ts` | A `"use client"` component imports a server-only module. Client-safe constants live in `lib/constants/*`, `lib/portal/*`, `lib/auth/capabilities.ts`. |
| `lib/content/reportCopy.test.ts`, `submit.test.ts`, `partnerRequest.test.ts` | Report/submit/partner copy modules drift from their pinned values. |
| `lib/admin/nav.test.ts` | The admin nav gains or loses an item without updating the pinned list (18 items today). |

### Locks that only hold IF SOMEONE REMEMBERS

These are conventions with no test behind them. Breaking them is silent:

- **Never hardcode a price, credit count, brand cap or SLA figure in JSX** — no test catches a *correct* hardcoded value, only a retired one. It becomes wrong at the next ruling.
- **Never rename `/terms` or `/privacy`.** Nothing in the repo prevents it; Stripe live mode breaks.
- **Legal page wording is founder+PT territory.** No test guards a "clearer" rewrite of a locked clause.
- **`git add -A` is forbidden in this repo** — explicit paths only. The founder keeps untracked working folders (`backups/`, `codex-fresh-design/`, `mockups-codex-exploration/`, `.claude/`) and `skills-lock.json` must stay out of commits.
- **The design lane never touches `lib/research/`, `lib/utils/banned-language.ts`, or the verdict engine.** The frozen-surface diff check is a session-end habit, not a hook: `git diff --name-only HEAD -- lib/research lib/utils/banned-language.ts` must return nothing.
- **Do not "fix" two correct-looking oddities**: Track 5 Sourcing Logic renders N/A with real text (non-voting by ruling), and Track 4 Documentation Review renders N/A on zero uploads (absence ≠ finding).

---

## 5. Where the codebase contradicts what the founder believes

**These are the two most valuable paragraphs in this document.** Both were established from source this session and reported; neither has been acted on.

### 5.1 — "Nobody knows which three areas the $99 tier includes, so nobody can write the pricing page honestly" — **FALSE**

The pricing page already names them, correctly, and has for some time. `lib/content/pricing.ts:92`:

> `"Three assessment areas: Supplier Legitimacy, Brand Risk, Sourcing Logic"`

and the comparison row: `{ feature: "Assessment areas", values: ["3 of 5", "All 5", "All 5", "All 5"] }`.

Verified against `lib/constants/tracks.ts:52` — `single_99: { tracks: [0, 1, 3, 5] }` → Supplier Legitimacy, Brand Risk, Sourcing Logic. **Exact match.** All four tiers match the ladder. **Do not "fix" the pricing page's area claims; they are right.**

### 5.2 — The real gap is composition, not count

Of the three areas a $99 buyer gets, **only two bear on the verdict**. `sourcing_logic` is the ruled non-voting emitter (`lib/content/reportCopy.ts:107`), rendered under *"Checks that don't affect the verdict."*

And the excluded pair — **Supply-Chain Relationship** and **Documentation Review** — is the pair that answers *"can this supplier actually supply this brand?"* A $99 buyer learns "is this a real business" and "is this brand litigious", but not "is there any provable connection between them".

Also: **the excluded areas are absent, not explained.** They are gated at *research* time (`lib/research/pipeline.registry.ts` — `plan_gates: GROWTH_SCALE`), so no row exists and nothing renders. The report header says "The 3 assessment areas in this report" with no line saying why. A buyer who read a site explaining five areas gets three and no explanation. **That gap is a marketing-site problem as much as a report problem — it is the thing to solve in your lane.**

One inaccurate comment to know about: `components/portal/report-view.tsx:239` claims the area count "derives from the canonical track registry… a property of the PRODUCT, not of this case." It does not — it counts *rendered rows* filtered by `isAssessmentArea`. Right today only because the gate and the rows agree.

### 5.3 — Two of four tiers are OFF SALE

`PLANS_ON_SALE = ["single_99", "growth_279"]`. **`single_149` and `scale_499` are not buyable**, and top-ups are off sale (`TOPUPS_ON_SALE = false`). The checkout route refuses them server-side (403), and pricing cards render them as a "Coming soon" roadmap with the CTA replaced by an honest note.

**Do not reintroduce a purchase path for them.** A card that *looks* buyable is a broken promise even when the server says no. The lock will catch a registry drift but not a hand-built button.

**A correction to the stated reason:** the founder's reason is "category compliance depends on Keepa, Keepa isn't built." From source, Track 6 **is** built, frozen (`cc-1.0.0`) and runs today on Scale/149 cases; `KEEPA_LIVE` actually gates **ASIN collection at intake**. The ruling stands either way — whether T6's Keepa-less output is sellable is the founder's call — but if you write copy explaining *why* a tier is coming soon, do not repeat the mechanism as stated.

### 5.4 — `Master_Research_Prompts_v2.0` is not in the repo

Its only trace is six inert `PLACEHOLDER` seed rows (`is_active=false`); no code reads the `prompts` table. It sits on the tracker's **absent-docs list** with the note *"v2.1 says 'carried from v2.0' — supersession that provably dropped content."* Its "each vendor-brand combination = 1 credit" rule is implemented **nowhere**. If someone quotes it at you as authority for pricing copy, it is a document this codebase cannot read.

### 5.5 — What a credit actually buys

**One credit = one case = one supplier + up to the plan's brand cap.** `creditsRequired` can only ever return 1, because the brand cap is refused *before* the cost is computed. Credits price the **supplier**, never the brand. Terms §5, `pricing.ts:119` and the FAQ all state this correctly.

### 5.6 — One client-facing string is wrong

`app/api/cases/submit/route.ts:127`: *"Your plan allows up to 3 brands **per credit**."* False — the limit is per *case*. A $99 client holding 3 credits still cannot submit 4 brands. It is read at exactly the moment of confusion and invites "I'll buy another credit". **Reported, not fixed, awaiting a ruling.** If you touch submit-flow copy, this is the string.

### 5.7 — `UIUX_SESSION_PROMPT.md` visual guidance is superseded

Three verdict badges fail contrast; the base colour is rejected. The STOP marker at the top of that file scopes the supersession to visual guidance only — §5 surface map, copy MUST_PASS locks and §2/§3/§6/§7 all still stand.

---

## 6. What I would look at first, starting fresh

1. **Get the palette/typography ruling before drawing anything.** Everything visual is blocked on it, and three verdict badges currently fail contrast — a marketing site built on them inherits an accessibility defect on its most important visual element. This is the only genuine blocker.

2. **Then design the answer to §5.2** — the honest three-of-five story. It is the highest-value marketing problem in the product: the site explains five areas, the cheapest tier delivers three, two of which vote. The pricing page's *facts* are right; the *narrative* that makes a $99 buyer feel correctly informed rather than short-changed does not exist yet, on the site or in the report. Consider whether the report should name what it did not cover.

3. **Read `docs/HyprrIQ_OPEN_ITEMS.md` §§0-A→0-G.** That is the SSOT. §0-G is this week's integrity work; §0-D is the money-surfaces ruling that put two tiers off sale.

4. **Open `/admin/integrity`** — one screen, plain English, tells you whether the system is healthy without SQL. It will show one standing finding (`AWI-2607-022`, a known verdict divergence). That is expected and is **investigated, never smoothed** — a founder-locked law recorded in `docs/goldenCases.md`. Do not make it go green.

5. **Run the gates once before you start** so you know green looks like green: `npx vitest run` (2003), `npx tsc --noEmit`, `npx eslint .`, `npx next build`.

6. **Skim `docs/goldenCases.md`'s gap table.** It is the clearest statement in the repo of what is machine-checked and what still needs a human — useful for knowing which of your changes can break something silently.

---

## 7. Mechanics worth not rediscovering

- **Founder-script invocation:** `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`. Without `--conditions=react-server`, server-only poisoning breaks the import graph.
- **PowerShell eats `$99` in commit messages** — use a heredoc via the Bash tool, or a `-F` file.
- **Bash heredocs mangle backslashes in regex literals.** Writing `\b` or `\d` into a TS file through a heredoc or `python -c` is unreliable — this session lost three attempts to it. Use the Write tool for files containing regexes.
- **Clerk top-level imports poison react-server instrument scripts.**
- Emails render through one layout (`lib/email/templates/EmailLayout.tsx`) and a lock enforces it; previews are in `public/prototype/email-preview/`.

---

**Last word.** The dev lane is closed and the audits now run themselves — the marketing site is the last thing between this product and its first cold buyer. The single most useful thing you can do is make a $99 buyer understand exactly what they are getting *before* they pay, because the code is now honest about it and the site is not yet.
