# HyprrIQ — Content Rewrite Package (2026-07-06)

Copy recommendations for every surface, SEO/GEO content plan, and the auth-page copy. Everything below respects the compliance floor: never "guaranteed / safe / authorized (loosely) / protect your account / risk-free"; the product reports, the client decides; "agency" never in public-facing headlines.

**Voice recap**: rigorous, reassuring, human. Write like a senior analyst who has done this a thousand times and wants you to buy well — not like a security product, not like a growth-hacked SaaS.

---

## 1. Homepage copy (rewrites where warranted — much of it is already good)

### 1.1 Keep as-is (verbatim — these are working)
- H1: **"Know what you're really buying — before you wire the money."**
- Manifesto: **"We will never tell you a source is safe."** + its supporting paragraph.
- Pain-section head: "Where wholesale sellers actually lose money." / "It's rarely the price. It's the things you couldn't see before you bought."
- The four OUTCOME_COPY verdict descriptions.

### 1.2 Rewrites

**Hero sub-paragraph** — current version is good but buries the buyer. Tighter, names the reader earlier:

> Current: "Every wholesale buy is a bet on a supplier you can't fully see and a brand that can pull your listing. We investigate both, then hand you a one-page verdict and the exact questions to ask. We don't promise 'safe' — we help you decide."

> **Recommended:** "You're about to send real money to a supplier you found three weeks ago. We investigate the supplier *and* the brand behind the buy — then hand you a one-page verdict and the exact questions to ask before a dollar moves. We don't promise 'safe.' We make sure you decide with open eyes."

**Hero badge** — "Pre-purchase source intelligence" → keep (it's the category claim; repeat it everywhere).

**Trust strip (replaces the 6-icon TRUST_TOPICS row)** — facts, one hue:

> **Every case:** 60+ public data points · 5 research dimensions · 14 document standards · reviewed by a human expert before it reaches you

**"Why HyprrIQ exists"** — currently anonymous. With founder identity (Option A, recommended):

> "HyprrIQ was built by **[Name]**, an Amazon wholesale seller with 15+ years of buying inventory — invoices, brand restrictions, authenticity complaints, account-health fights, all of it. One lesson kept repeating: **the invoice isn't the risk — the unknowns behind it are.** A supplier can be real, the invoice genuine, and the brand can still reject the source. HyprrIQ investigates what sellers usually discover only after the money's gone."

(Option B if founder stays unnamed: keep current copy but add a photo-free "operator, not observer" credentials line: "15+ years buying wholesale · 7 figures of inventory purchased · burned twice, never a third time.")

**Pricing section head** — "Costs less than one bad buy." → keep. Sub-line fix for the $79/$99 contradiction: standardize on **$99** everywhere (FAQ item 7 and pricing metadata currently say $79 — see fixes list §7).

**CTA vocabulary (site-wide standard)**
- Signature CTA everywhere the action is sign-up: **"Vet a supplier"** (header, hero, manifesto, final CTA).
- Pricing cards: **"Start with Growth"** / **"Start with Scale"** / **"Buy a single report"** — the click states the commitment.
- Secondary CTA: **"See a sample report"** (stronger than "View sample report" — "see" promises less friction).

### 1.3 New homepage sections (content ready)

**Social-proof slot (array-driven, ship empty-tolerant)** — testimonial schema: quote (≤160 chars), name or anonymized handle ("M.K., electronics seller, $1.2M/yr"), verdict their case got. Until real ones exist, run the fact-strip only — never fake testimonials.

**Sample-report teaser band** (links to `/sample-report`):
> **Read an actual report before you spend a credit.**
> A real Source Intelligence Report — vendor anonymized, findings intact. See exactly what lands in your portal: the verdict, the evidence across five dimensions, and the questions we'd ask that vendor.
> [See the sample report →]

---

## 2. New pages (full content briefs)

### 2.1 `/sample-report` (highest-conversion page to add)
- H1: "A real report, anonymized."
- Render the full report *in HTML* (indexable) — Decision Snapshot header, dimension findings with Verified/Inferred/Unconfirmed labels, questions-to-ask list. PDF download gated on email ("Send me the PDF").
- Closing CTA: "Every case gets this depth. Vet a supplier →"
- SEO title: `Sample supplier intelligence report — HyprrIQ` / meta: "See a complete HyprrIQ Source Intelligence Report: the verdict, five research dimensions, and the exact questions to ask a wholesale supplier before you buy."

### 2.2 `/about`
Structure: (1) founder story ¶ (from §1.2), (2) "How we work" at output level — five dimensions, human review, the four verdicts, what we never do (no method exposure: name *what* is checked, never *how*), (3) the honesty policy restated, (4) company facts (Hyprr Retail LLC, contact). H1: "The firm sellers call before they wire."

### 2.3 `/contact`
Short. "Talk to us before you commit — or any time after." Email + response-time promise ("within 1 business day"), plus the support portal note for clients. No forms-to-nowhere.

### 2.4 `/terms` and `/privacy`
Required before any paid marketing. Legal drafting is out of scope here; the design/IA slot is: prose page template (max-w-3xl, h2 sections, updated-date line). **Ship real documents, not lorem.**

### 2.5 `/how-credits-work` (or expanded pricing section)
The credit model is the #1 pre-sale confusion risk. Content: 1 credit = 1 complete report (1 supplier, up to 5 brands, all dimensions); monthly grant + rollover table; top-up packs; what happens on cancel (keep reports, keep unused credits until period end); worked examples ("You vet 3 suppliers in March on Growth…"). FAQ JSON-LD.

### 2.6 `/use-cases/*` (3 to start)
- `first-order-with-a-new-supplier` — mirrors PROFILES[0]
- `adding-a-brand-to-your-catalog` — PROFILES[1]
- `after-a-bad-buy` — PROFILES[2]
Each: the scenario in the seller's words → what a report shows in that scenario → mini sample verdict → CTA. 600–900 words each.

---

## 3. SEO / GEO plan

### 3.1 Technical (do first, cheap)
1. `app/sitemap.ts` + `app/robots.ts`.
2. Per-route `openGraph` + `twitter` metadata; one branded OG template (wordmark + verdict spectrum + page title).
3. Canonicals via `metadata.alternates.canonical`.
4. `llms.txt` describing the product, the four verdicts, the five dimensions, pricing — the citable facts (GEO: AI assistants answer "how do I vet an Amazon wholesale supplier"; make HyprrIQ the quotable source).
5. Keep FAQPage/Organization JSON-LD; add `Product` (with offers) on `/pricing`, `Article` on blog posts, `BreadcrumbList` on deep pages.

### 3.2 Keyword territory (demonstrate expertise, justify the price)
Primary: *vet amazon wholesale supplier · amazon supplier verification · fake wholesale supplier · amazon inauthentic complaint supplier · wholesale invoice verification · authorized distributor check*. The buyer is mid-funnel and frightened at 2am — content should answer the fear precisely, then offer the service.

### 3.3 Resource hub — 6 pillar articles (order of publication)
1. **The 12 questions to ask any wholesale supplier before you wire money** (also the lead-magnet PDF — email capture)
2. **How Amazon inauthentic complaints actually work — and why "I have an invoice" doesn't end them**
3. **Distributor vs. authorized distributor: what sellers get wrong**
4. **The anatomy of a fake wholesale supplier: 9 observable signals**
5. **What a supplier's invoice can and cannot prove**
6. **Gated brands: how enforcement postures differ, and how to read them before you buy**
Each 1,500–2,500 words, one expert takeaway per H2, a "what we'd check" sidebar that maps to the five dimensions (outputs, never method), Article JSON-LD, internal links to use-cases and `/sample-report`.

### 3.4 Glossary (long-tail, 12 terms to start)
gated brand · ungating · IP complaint · inauthentic claim · LOA (letter of authorization) · authorized distributor · test buy · account health · section 3 suspension · retail arbitrage vs wholesale · brand gating · funds disbursement hold. 150–300 words each, defined term JSON-LD, cross-linked.

### 3.5 GEO specifics (2026 AI-search)
- Lead every pillar with a 40–60 word extractable answer block (the "citable paragraph").
- State proprietary *facts* (four verdicts, five dimensions, never-say-safe policy) in consistent wording across pages so AI answers converge on your phrasing.
- Publish the sample report in HTML (AI systems cite pages, not PDFs).

---

## 4. Portal UX copy (client)

| Element | Current | Recommended |
|---|---|---|
| Dashboard greeting | "Good day, {name} 👋" | "Good morning, {name}." (time-aware, no emoji) |
| Dashboard sub (active) | "Here's what's happening with your research today." | keep |
| KPI "SLA Risk" | "SLA Risk / Due soon" | **"Arriving Soon"** / "reports due in ≤2 days" |
| Deadlines card title | "Upcoming Deadlines" | **"Expected Deliveries"** — rows: "AWI-2606-014 · Northgate — expected Thu, Jul 9" |
| Empty cases | "No cases yet — submit your first research request." | Teaching pattern: "**Your cases live here.** Submit a supplier and brands; we research across five dimensions and deliver a verdict in 3–5 business days." + [Vet your first supplier] |
| Delivered banner | "✓ Report delivered on {date}. … PDF export is coming soon." | "Report delivered {date}. Your verdict, evidence, and supplier questions are below." (+ Export button when built) |
| Waiting state (research) | — (dimensions only) | Add: "**Research in progress.** Our team is working your case across five dimensions. Expected delivery: **{date}**. We'll email you the moment it's ready — nothing for you to do." |
| Questions banner | "💬 Ask your supplier these before placing an order. Satisfactory answers do not guarantee invoice acceptance." | "Ask your supplier these before you order. Good answers reduce doubt — they don't remove the need for your own judgment." (keeps compliance, warmer) |
| Priority pills | high / medium / low | **Must ask / Should ask / If useful** |
| Timeline step | "Founder review" | Option A (recommended): **"Expert review"** — scales to Teams tier; Option B: keep "Founder review" as boutique signal. Business call. |
| Confirm scope button | "✓ Confirm {brands} (original)" | "Confirm original list ({brands})" — verb first, no glyph |
| Error (scope) | "Could not confirm scope. Please refresh and try again." | keep (already correct pattern) |

## 5. Auth copy

**Sign-in** — heading "Welcome back" keep; sub → "Sign in to your research portal."; switch → "New to HyprrIQ? **Create your account**" (drop "free").
**Sign-up** — heading "Create your account" keep; sub → "Vet your first supplier in minutes."; panel tagline → "The check that comes / **before the wire.**"; pills (tokenized colors): "Human-reviewed reports" (clear-bright) · "60+ public data points per case" (conditional-bright) · "Four plain-English verdicts" (verify-bright) · "Built by a wholesale operator" (warm-bright). Legal line under form: "By creating an account you agree to the [Terms] and [Privacy Policy]."

## 6. Naming the $999 tier (client-facing)

"Agency" is banned from public headlines. Recommended public name: **HyprrIQ Teams** ("For teams vetting suppliers on behalf of clients"). Alternatives: **HyprrIQ Pro Desk** / **HyprrIQ Partners**. Internal code and routes may keep `agency`; every rendered surface says Teams. Pricing card copy:

> **Teams — $999/mo.** For firms and multi-account operators vetting suppliers for their clients. 30 reports/mo, pooled credits, client workspaces, staff seats, report handoff. [Talk to us →]

(Teams sells via a short conversation, not self-serve checkout, at v1 — the CTA reflects that.)

## 7. One-line fixes (do immediately, zero risk)

1. FAQ item: "from $79" → "for $99" (`components/marketing/faq.tsx`).
2. Pricing metadata description: "from $79" → "from $99" (`app/(marketing)/pricing/page.tsx`).
3. Announcement bar href `#pricing` → `/pricing`.
4. Footer: remove or build About/Terms/Privacy `#` links (never ship dead legal links).
5. Home FAQ says single report gets "Delivered to your email in 5 days" — verify email delivery actually exists before the claim stands; otherwise "Delivered to your portal in 5 business days."
