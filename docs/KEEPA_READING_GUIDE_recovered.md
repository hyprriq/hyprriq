# Keepa Data Reading Guide — RECOVERED VERBATIM from HyprrIQ_ClaudeCode_Brief_v1_1_Addendum.docx PATCH 4

**Provenance:** extracted 2026-09-08 from the founder-authored v1.1 Addendum .docx, which was
NOT on disk in the repo (found at `C:\Users\Gautam Naidu\Downloads\`; the addendum's own text
says versions live in `D:\hyprriq\docs\`, which does not exist on this machine). Same recovery
convention as CATEGORY_FLAGS_TABLE_recovered.md. The three inert Track 3 weight keys
(`keepa_stable_no_cliff` / `keepa_enforcement_cliff` / `low_seller_count_stable`) were BUILT TO
ANTICIPATE THIS GUIDE — until now nothing on disk carried the method behind them.

**The addendum also contains PATCH 1 (invoice 14-field checklist), PATCH 2 (manual entry credit
rules), PATCH 3 (national distributor detection) — recovered to `addendum.txt` in session
scratch but NOT yet transcribed to docs/. PATCH 4 only, below, per the founder's instruction.**

---

## PATCH 4 — Keepa Data Reading Guide: Complete Interpretation Methodology

> COMPLETELY MISSING FROM v1.0:
> Keepa seller count trend analysis is our most powerful proprietary risk signal.
> 15 years of Amazon experience means we know what these patterns mean.
> This section teaches the system and any future analyst exactly how to read Keepa.
> This is the moat. Document it completely.

### P4.1 What Keepa Is and Why It Matters

Keepa is a price and seller tracking tool for Amazon. For HyprrIQ, we use it exclusively for the seller count graph — how many third-party sellers have been offering a product over time. This is our proprietary risk signal because:

- A falling seller count often means the brand has been issuing IP notices — sellers are exiting
- A very low seller count (1-3) means the brand has successfully locked down third-party access
- A sudden cliff drop means an enforcement wave happened — the brand sent mass notices
- Rising or stable seller counts mean the brand tolerates resellers
- Who the remaining sellers are tells you whether aggregators have bought the brand

### P4.2 The Seven Seller Count Patterns — How to Read Each One

| Pattern Name | What You See on Keepa Graph | What It Means | Risk Signal | Report Language |
|---|---|---|---|---|
| Open Market — Stable High | Flat line 15-40+ sellers. Stable over 90+ days. No significant drops. | Brand actively tolerates third-party resellers. Open market environment. | LOW | Brand marketplace shows stable third-party seller presence consistent with open reseller environment. [X] sellers observed across [ASINs checked]. |
| Gradual Decline | Seller count declining slowly over 6-12 months. E.g. 30 sellers Jan → 22 Mar → 18 Jun. | Brand possibly tightening distribution over time. Could be normal attrition or early enforcement. | MODERATE — monitor | Brand marketplace shows gradual reduction in third-party seller count over the past [timeframe]. This may indicate tightening distribution. Periodic monitoring recommended. |
| Enforcement Cliff | Seller count drops sharply — 20+ sellers to 2-4 in under 30-60 days. Clear cliff visible. | Brand sent mass IP notices or enforcement wave. This is the most alarming pattern. | HIGH — flag prominently | Brand marketplace shows a significant reduction in third-party sellers over a [X]-day period in [month/year], consistent with a brand enforcement event. Current seller count: [X]. |
| Already Locked Down | Permanently 1-3 sellers for 6+ months. No variation. | Brand has successfully locked third-party access. Only brand direct or selected partners remain. | HIGH | Brand marketplace shows very limited third-party seller presence ([X] sellers). Brand appears to maintain tight marketplace control. Remaining sellers: [identify who they are]. |
| Volatile / Unstable | Seller count jumps up and down — e.g. 8, 15, 4, 12, 3, 18 — no stable pattern. | Listing instability. Could be suppression events, hijacker activity, or inconsistent enforcement. | MODERATE-HIGH | Brand marketplace shows volatile seller count patterns, which may indicate listing instability, periodic enforcement activity, or hijacker presence. Exercise caution. |
| Rising Trend | Seller count growing over time. E.g. 5 sellers 6 months ago → 15 now. | Brand opening up distribution or new market entry. New resellers entering. | LOW-MODERATE | Brand marketplace shows increasing third-party seller presence, suggesting expanding distribution. No enforcement signals observed in seller count data. |
| Brand Direct Only | 1 seller consistently. Seller is the brand itself or a closely related entity. | Brand has fully locked third-party access. Only sells direct on Amazon. | VERY HIGH | Brand marketplace shows brand-direct only selling model on Amazon. No third-party seller presence observed. This brand maintains exclusive Amazon selling rights. |

### P4.3 How to Read Keepa — Step by Step (Phase 1 Manual Process)

Until Keepa API is integrated (Phase 2), the founder does this manually for Scale and Agency plan cases:

| Step | Action | What to Note |
|---|---|---|
| 1 | Go to keepa.com. Search the brand's most popular ASIN (or the ASIN from the client's invoice if visible). | Note the ASIN you used. Note the product name. |
| 2 | On the Keepa graph, find the 'New Sellers' data line. It is usually shown in blue or purple. Toggle it on if not visible. | This is the seller count line — not the price line. |
| 3 | Set the time range to 90 days first. Then switch to 1 year. Compare both views. | Short term = recent events. Long term = pattern. |
| 4 | Identify the pattern from Section P4.2. Pick the closest match. | Note the pattern name, current count, and what the line looks like. |
| 5 | Note the current seller count (today's number at the right end of the graph). | Write exact number. |
| 6 | Note the highest seller count in the past 12 months and when it occurred. | This tells you what the 'normal' was before any enforcement. |
| 7 | If there is a significant drop: note the approximate date and the drop amount (e.g. from 24 to 4 in March 2026). | This is the enforcement cliff if it happened. |
| 8 | Click on 2-3 of the remaining sellers to see who they are. Check their seller name on Amazon. | Are they: brand direct, aggregator (Perch, Branded, Thrasio, Factory14), or independent? |
| 9 | Repeat steps 1-8 on 2-3 different ASINs from the same brand. | If all ASINs show the same pattern = brand-level signal. If only 1 ASIN = ASIN-specific issue. |
| 10 | Enter findings in the manual notes field in the admin dashboard under Track 3. | Use the report language from Section P4.2 that matches the pattern observed. |

### P4.4 Identifying Aggregator Ownership — Critical Context

When seller count drops to 1-3, check WHO those remaining sellers are. This is essential context:

| Remaining Seller Type | Who They Are | What It Means for the Client |
|---|---|---|
| Brand direct | Seller name = brand name or closely related entity | Brand has taken full control of Amazon. No third-party selling tolerated. Do not source for Amazon resale. |
| Aggregator | Perch, Branded, Thrasio, Factory14, Heyday, Elevate Brands, Heroes, Accel Club, Berlin Brands | Brand has been acquired by an aggregator. Aggregators typically enforce IP aggressively. Very high enforcement risk. |
| Selected authorized reseller | Named distributor or regional partner — not aggregator, not brand | Brand is allowing limited authorized resellers. Possible to sell if authorization chain is solid at Level A or B. |
| Independent reseller | Random third-party seller name — no obvious brand connection | Brand enforcement is weak or inconsistent. Resellers are entering opportunistically. Moderate risk. |

### P4.5 Aggregator Recognition List

These are the major Amazon aggregators as of 2026. Check seller names against this list:

- Perch — large US aggregator, very active brand enforcement
- Branded — major US aggregator, aggressive IP protection
- Thrasio — one of the largest, declining but still active
- Factory14 — European aggregator with US presence
- Heyday — significant US aggregator
- Elevate Brands — active in supplements and health
- Heroes — UK-based, expanding to US
- Accel Club — European aggregator
- Berlin Brands Group — European, growing US presence
- Suma Brands, Boosted Commerce, Benitago, Cap Hill Brands — mid-size aggregators

If the only remaining sellers on a brand's ASINs are aggregators: this is a MAJOR red flag. The brand has been acquired and the new owner almost certainly enforces IP aggressively. Flag this prominently in Track 3 findings with 'High — aggregator ownership detected' risk impact.

### P4.6 Phase 2 Keepa API — What Changes

When Keepa API is integrated (Phase 2 — at 20+ Scale/Agency clients), the manual process above is automated. The research pipeline will:

- Call Keepa API with the brand's primary ASIN (extracted from client form or identified by AI)
- Pull 90-day and 365-day seller count history automatically
- Calculate the pattern classification programmatically
- Identify significant drops (>50% drop in under 60 days = enforcement cliff)
- Return structured JSON with pattern, current count, peak count, drop events, and trend direction
- Feed this data directly into Track 3 findings without manual founder input

The Keepa API response structure to parse:

```
// Keepa API returns product data including seller count history
// Key field: stats.newCount (seller count over time as paired timestamps)
// Parse this array to get seller count at each point in time
// Calculate: current_count, peak_count, min_count, trend_direction
// Detect cliff: if count drops >50% within 60 days = enforcement_cliff = true
// Detect aggregator: check sellerName on current offers against aggregator list
```

---

*(Repo notes, 2026-09-08 — NOT part of the verbatim PATCH 4 content above.)*

**⚖ FOUNDER AMENDMENT 2026-09-08 (a RULED correction to the source — the verbatim above is
preserved unedited; this note governs what SHIPS).** The founder, on reading his own guide back:
P4.1 and P4.2 state the enforcement cliff's CAUSE as fact ("the brand sent mass IP notices").
**IT CANNOT KNOW THAT.** Sellers exit for stock problems, an exclusivity deal, Amazon entering
the listing, or a supplier disappearing. The pattern is real; the cause is inference. Whatever
ships says *"seller count fell sharply in this window, and here is what can produce that
shape"* — never *"the brand enforced."* Show the pattern, name what it does not prove. This
supersedes, on every client surface: P4.1's causal bullets, P4.2's "consistent with a brand
enforcement event" report language, and P4.5's "almost certainly enforces IP aggressively."
The P4.2 report-language column remains the STRUCTURE of what ships (pattern + numbers +
window); its causal clauses are re-worded under this ruling and the banned-language +
method-leakage gates before any client sees them.

**⚖ DESTINATION CONFIRMED: TRACK 3, not Track 6.** P4.6 says "Feed this data directly into
Track 3 findings" — matching the three firewall-inert `brand_risk_assessment` weight keys.
Whether the keys SCORE remains a separate ruled gate (firewall v-note riders, 2026-07-11);
an advisory rendering does not open it.

**⚠ API field names are the source's recollection, not a contract.** "stats.newCount" etc. are
to be verified against Keepa's live response at build time; the guide's semantics (count over
time, current/peak/min, >50%-in-60-days cliff) are the authority, not its field spelling.

**Pattern-classification constants derived from this guide** (window sizes, the 50%/60-day
cliff rule, the 90-day stability window, the 6-month lockdown window, the 13 aggregator names)
**must cite this file** when encoded, per the laws-get-named rule.
