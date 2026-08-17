# HANDOVER — 2026-08-16 → next session (Opus 5)

**From:** Fable 5 dev thread (out of tokens). **To:** the next session, any model, any machine.
**Read order for a cold start:** this file → `docs/HyprrIQ_OPEN_ITEMS.md` (SSOT tracker; every batch below has a dated block there with commit hashes) → the specific docs named per item. All claims below are committed on `staging` at `c4b13ae`; nothing is mid-flight, working tree clean except the founder's own untracked folders.

---

## 0 · WHERE THE THREAD STOPPED — the one live decision

**The banned-language gate census sits at 23% (9 of 39 cases would block at publish), all on one vocabulary class**, after two founder-ruled gate amendment rounds (commits `5541857`, `8997d6d`). The residual is the engine's habit of writing "confirm/confirmed" for authorization in grammatical shells the rulings don't cover:
- named-artifact subjects: *"Ingram Micro's 2025 Lenovo Playbook **confirms** current authorization"*, *"regional portals **confirm** authorization"*;
- scope-attached passives: *"Authorization **is confirmed** for US, UK, Belgium, and Mexico"* (scope after the verb, no via/by/through evidence marker).

**Standing recommendation, delivered and tracker-recorded: stop grammar-chasing; run the `confirms→supports` ENGINE-PROSE PASS.** It is founder-run (touches frozen prompts), already scoped in-chat and below (§5). Of the two real operator cases: **AWI-2608-034 (Stacker/NVE, Scale) now scans CLEAN — the #3 attribution guards cleared it; it is publishable today through the normal review flow.** **AWI-2608-033 (Bulk Buy America, Growth)** remains held on the confirms-authorization residual and publishes once the prose pass (or a further shell demotion, not recommended) lands. The founder has NOT yet ruled on running the prose pass — that is the open question the next session likely starts with.

## 1 · WHAT THIS SESSION BUILT (chronological; every commit message is a full record)

| Batch | Commits | Load-bearing mechanism |
|---|---|---|
| Gap-close (submission email, checkout guard, tier name) 08-10 | `2ca75c1` `1c2cac2` `4f0b43a` `b67935e` | Second ruled transactional email (idempotent via audit-row check, only after enqueue, never records failed as sent); `checkoutStateError` fails closed pre-Stripe; `single_149`="Single Deep Report" everywhere |
| Admin dev close-out, 9 items 08-11 | `b290a88` `d194035` `277ed02` `7d8ee63` `a33c08e` `fec79ff` | Operator run-a-case gained $149 + multipart uploads (same fileSniff rules, uploads BEFORE enqueue); house row excluded from MRR (**$1,277→$778 live-verified**); `last_active_at` written on portal loads (15-min throttle); users screen wired (invites/assignment/labels); credit-adjust no-op now 409s; page gates + no visible-but-refusing buttons |
| SLA + settings + credit semantics 08-12 | `d3a6f88` `6a6fb3c` `3e284a1` | `CASE_SLA_HOURS=24` stamped at both intake paths; **CREDIT/USAGE LAW in `SAAS_ARCHITECTURE.md §I`** (4 cases, basis of refund formula, never re-derive from code); adjust route → `adjust_client_credits` RPC, **fails closed 503 until founder runs migration `20260812000000_credit_semantics_adjust_rpc.sql` — STILL NOT RUN** |
| SLA copy + hour-granularity fixes 08-12 | `470c184` | Client promise = 24h from `CASE_SLA_HOURS`; `PLAN_SLA_DAYS` retired+locked; day-math SLA displays → hours; **`SLA_RISK_WINDOW_HOURS=6` is UNRULED (my constant, flagged)** |
| Client portal full build 08-13 | `1601bdc` `9fd9579` `9337495` | **The report renderer** (decision-first, M9/M8 wired through `lib/portal/clientReport` projection — exactly 5 fields cross, structural ?-filter, unbounded headlines); submit 4-step logic-preserving; guides shell; settings/auth claim rewords |
| Report polish + prose rules 08-13 | `e361ac9` `888cb5e` | src_N strip CLIENT-ONLY (admin keeps tags — founder-ruled); `parseFindingStructure` (lossless); disposal-sentence filter + Track-name substitution (Rules 1+2 ratified; Rule 3 method-narration LEFT ALONE) |
| Admin review rebuild 08-13 | `85833bb` `eabd9e3` | Findings-first screen; client-view toggle renders the REAL `ReportView` over the same pure projection (extraction test-locked); contradictions full anatomy; direction line; escalation/last-decision/SLA honesty; client view pinned to delivered attempt |
| Empty-tab guards + ratified readability 08-14 | `5420fe3` | Stub-headline guard (<20 chars = absent); conditional Checklist/Could-not-confirm tabs; label-marker fusion + guarded sentence splits (under-split-only); bank-coordinate filter (Documentation-scoped) |
| Humanise + claims + area-claims ruling 08-14 | `2c2a866` `1d1ba42` `126d440` | Plan-derived research bullet; help-page false claim killed; report headers count-derived from the case's own findings; "research dimensions"→"assessment areas" everywhere public |
| Submit copy fixes 08-15 | `538c0ec` | Cap stated once; credits sub never echoes balance; ASIN gating confirmed ($149+Scale on KEEPA flip) |
| **Gate ruling, census-driven 08-16** | `5541857` `8997d6d` | §0 above. Sentence-scope bug fixed (abbreviation-aware); verdict rules negation/attribution-aware (`makeVerdictGuard`, tight clearing windows — the 021 regression fixture forced them); ungating service-vs-subject split; evidence-subject + via-attributed-passive demoted to **A6 advisory** ("reword to 'supports'") |

**Read-only reports delivered in-chat (not in files):** How-the-verdict-is-reached (full engine walk); review-screen 5-part audit; tier test-run prep (order: Growth → $99 → $149, all operator-run; costs ~$0.17 synthesis + est. $0.5–1.5/case total); Track 6 explainer (brand-level only without ASIN — on 034 it DID store real findings: stacker2 → "Energy/stimulant supplements", HIGH flag, `category_verdict: requirements_identified` — the client sees only the neutral placeholder BY DESIGN pending the client-surface ruling); two-case diagnosis (**the engine correctly caught Bulk Buy America as unauthorized** — via the vendor's own FAQ disclaimer, src_1 — verdict VBP, no false negative).

## 2 · LIVE STATE (verified, not assumed)

- **DB (Supabase project `mjkacjrrrmlwlwkienvq`):** 39 cases; 5 delivered (only AWI-2607-022 has real M9/M8 — the other 4 are stub-era, now guarded); **all 57→39-consolidated prior runs were Growth/client_paid**; first two operator cases (033/034) ran clean end-to-end and are blocked only by the gate residual. Track 6 has now stored exactly ONE result (034). MRR truth: $778.
- **Migrations:** all applied EXCEPT `20260812000000_credit_semantics_adjust_rpc.sql` (founder-run; until then admin credit adjustments 503 by design).
- **Env holes (Vercel):** `RESEND_API_KEY`/`RESEND_FROM` (all transactional email no-ops with audit-logged skip), `SUPPORT_INBOX` (ops alerts silently skip), `STRIPE_PRICE_SINGLE_149` (never exercised — $149 checkout untested).
- **Gates:** 1327/1327 tests · tsc 0 · eslint 0 · build clean at `c4b13ae`.

## 3 · PENDING FOUNDER RULINGS (the queue, in priority order)

1. **Engine-prose pass `confirms→supports`** (§5 below) — closes the 23% and unblocks 033/034.
2. **Run migration `20260812000000`** (credit semantics — admin adjustments are paused until then).
3. Track 6 client surface: real findings exist, placeholder shows; needs the client-copy gate ruling (+ the flag_language strings through MUST_PASS).
4. `SLA_RISK_WINDOW_HOURS=6` — UNRULED constant, one line to change.
5. `cases.internal_notes` overwrites (last decision only) — append-ledger needs schema ruling.
6. Backlog by ruling: (a) confirm the delivery gate walks the `unknowns` column (precondition for unknowns-fill); (b) imperative-M8 contingency rule (ready, unneeded).
7. Curated per-area client source-links feature (recommended design in-chat 08-14: operator-approved stable-class links; needs `case_reference_links` table ruling).
8. Remainders (no blockers): invoices route (needs Stripe read), client name self-edit, dashboard rail cards, reports-list search, separate FAQ route, PDF lane (count-derivation + generator; `reportDocument.ts` strings went plan-neutral meanwhile).

## 4 · MECHANICS THE NEXT SESSION CANNOT GUESS

- **Founder-script invocation (server-only poison + env):** `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`. The **gate census** acceptance tool is committed at `scripts/gate-census.ts` — run it after ANY gate or prose change; the number it prints is the launch risk (currently 9/39).
- **Discipline:** every changed client string joins the MUST_PASS fixture in the SAME commit (`lib/utils/bannedLanguage.fix.test.ts`); DOC-DELTA block into the tracker per batch; **never `git add -A`** (founder's untracked folders + skills-lock.json stay out); explicit-path staging only; LF→CRLF warnings are normal; PowerShell string round-trips mojibake UTF-8 (·, —) — always `-Encoding utf8` on BOTH read and write, verify with a `git grep "Â"` after.
- **Frozen surfaces:** engine, tracks, synthesis, verdict engine, category gate remain frozen. The banned-language gate is now **editable ONLY under an explicit founder ruling** (precedent: 2026-08-16 census-driven rounds, two-sided fixtures mandatory — every released real sentence into MUST_PASS, constructed violations into MUST_BLOCK).
- **Client projection law:** everything client-visible flows through `lib/portal/clientReport.ts` (allowlist + cleaners) and `projectFindingJsonForClient`; the admin client-view uses the SAME pure functions (never a second implementation); src_N/dimension-name/bank-coordinate/disposal cleaning is CLIENT-side only — the operator always sees raw.
- **Read-only DB diagnostics** via Supabase MCP `execute_sql` are established practice; **writes are founder-only, always describe-and-stop with exact SQL.**
- Verdict math cheat-sheet (verified live): weights .30/.25/.30/.15 redistribute on n_a; bands 3.2/2.2/1.2; floors T1/T3 soft_fail + T4 hard_fail + ≥2 load-bearing contradictions → VBP; locks T1/T3 hard_fail + critical contradiction → DNR; then no-override, then brand-risk ceiling. The review screen recomputes — nothing archives the derivation.

## 5 · THE ENGINE-PROSE PASS, SCOPED (ready to execute on ruling)

Touches the style sections of exactly four frozen prompts — Track 2 (`brand_relationship_finding`), Track 3 (`brand_risk_finding`), Track 4 (`documentation_finding`), synthesis Call C (M9/M8) — instructing "supports/indicates/establishes" for authorization contexts, banning "confirm/confirmed" for authorization claims in any voice. Content instructions, attribution rules, output shapes byte-identical. Each edit bumps `prompt_version` → `ios_version`, so stored synthesis is never reused across the change. **Re-validation:** full battery; both gate scans on regenerated output; `scripts/gate-census.ts` on a corpus replay expecting confirms-class → ~0 AND signals/verdicts byte-identical (the firewall guarantees it structurally; the replay proves it); founder side-by-side read of 3–5 cases. The A6 advisory count is the measurable target trending to zero.

## 6 · GOOD FIRST MOVES FOR THE NEXT SESSION

1. Ask the founder to rule on §3 items 1–2 (prose pass + migration) — both are the blockers with real cases behind them.
2. If prose pass ruled: execute §5, re-run `scripts/gate-census.ts`, publish 033/034 through the normal review flow once clean.
3. If tier test runs continue: the prep report's order stands (Growth → $99 → $149-with-documents, operator-run); watch `manual_override_required`/`research_failed` in the founder queue, Inngest for wedged steps.

*Everything else is in the tracker. Trust the commit messages — they were written as the record.*
