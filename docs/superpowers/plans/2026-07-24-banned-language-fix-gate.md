# Banned-Language Fix Gate — SPEC · 2026-07-24

**Status: 🔴 DRAFT — AWAITING FOUNDER RULING. NO CODE UNTIL RULED.**
**Class: PRE-LAUNCH BLOCKER (founder-ruled 2026-07-23), alongside env separation — nothing goes to a real client until this closes.**
**This gate REOPENS H5-frozen `lib/utils/banned-language.ts`** — hence full gate discipline: this spec → founder rulings → RED-first build → ATs → re-freeze.
**Author:** build thread, from source. Every enforcement claim below was runtime-verified 2026-07-23 (phrases fed through the live scanners — the method that found the holes) and re-checked from source this sitting; the founder accepted that method as the gate's standard.

---

## 0. WHAT EXISTS TODAY (the enforcement map, from source)

| Piece | What it does | Where it fires |
|---|---|---|
| `scanHard` (H1–H9) | blocking tier | delivery gate only: `review/route.ts:101-125` walks compiled findings + questions + the identity client_note + M9/M8 columns; 422 + audit on hit |
| `scanAssertion` (A1–A5) | advisory tier | admin review panel (never blocks) |
| `findProcurementLanguage` | recommendation-shaped phrases | track narrative fields only (Track 2/3 wiring) — **NOT in the delivery gate** |
| `scanSynthesisAtDelivery` (S-1e G2) | method-vocabulary scanner | delivery gate (M7/M8/M9) |
| categoryLanguage.ts (cc gate) | category status claims | Track 6 narrative fields — **the proven pattern this gate builds to** |
| Emails / UI copy / error messages | **NOTHING** | — |

**The authority:** `docs/BANNED_LANGUAGE_TABLE_recovered.md` — 16 never/instead pairs + the scope
law, verbatim: banned terms *"appear NOWHERE in the platform — not in reports, not in emails, not
in UI copy, not in AI prompts, not in error messages."* ADR-G004 additionally specs (master doc,
~line 30): output *"including email notifications — must pass compliance validation before storage
or PDF generation… enforced by the banned language scanner, not by editorial discipline alone."*
**The email gap is therefore spec-vs-built divergence, not new hardening.**

---

## 1. THE TEN HOLES → NEW HARD RULES (founder-ruled: ALL go HARD — "no tier below that for an outright ban")

Build to the `categoryLanguage.ts` bar: **negation-aware where the ban is polarity-blind,
denial-aware where the honest form is a denial, alternation-complete, and RED-proven by feeding
the actual evasions through the live scanner** — never by regex review. Proposed rules (H10–H16;
exact regexes are build-time, the SHAPES are ruled here):

| # | New rule | Catches (runtime-proven passes today) | Polarity | Mandated denials that MUST still pass |
|---|---|---|---|---|
| H10 | purchase-recommendation, negation-complete | "you should **not** buy", "do not source from", "avoid this supplier" — closes the procurement negation escape AND promotes the whole procurement class to HARD | BOTH polarities banned (a don't-buy is as much a recommendation as a buy) | "before purchasing inventory", "purchase orders corroborate…" (the existing precision carve-outs carry over) |
| H11 | safe/unsafe-to-X, alternation-complete | "safe to **sell**", "safe to list/stock", "unsafe" as a standalone classification | BOTH ("unsafe" is the same verdictive class as "safe") | "no elevated risk indicators observed" (the table's own instead-column) |
| H12 | confirm/certify authorization | "**confirms** authorization", "we certify", "certified authorized" | affirmative banned; **denial is the product's mandated language** | **"could not confirm authorization"**, "does not confirm or deny", "not confirmation of" — the denial IS the instead-column |
| H13 | predict-Amazon's-behavior class | "Amazon will accept/reject", "this invoice will be accepted", "Amazon will not take action", "suspension-proof" (literal) | BOTH ("will not take action" is as much a prediction as "will") | "Amazon may require…", "requirements change frequently" (may-language never trips a will-rule) |
| H14 | legitimacy/fraud verdicts | "the supplier **is** legitimate" (bare — H6 only catches "fully"), "fraudulent", "fake" | BOTH (absence≠fraud is standing law — calling a vendor fake is banned in the same breath as calling it legitimate) | "identity indicators are **consistent with** an operational wholesale business", "could not be confirmed through available public sources" |
| H15 | approval status, word-order-complete | "this supplier **is approved**" (predicate order — A3/A5 need adjacency), "approved for" | affirmative banned; denial passes | "not confirmation of Amazon approval or refusal" — **requires §5's H4 carve-out first** |
| H16 | procurement patterns join the DELIVERY walk | (structural — see §3) | — | — |

**Tier note:** A1–A5 stay assertion-tier (status vocabulary the evidence itself may quote); the
TEN are HyprrIQ's own voice class — HARD everywhere, attributed or not, per the ruling.

## 2. THE SURFACE SCANS (four of five unguarded today)

- **EMAILS (spec-vs-built, closes ADR-G004's requirement):** a `scanOutboundEmail(subject, html)`
  gate INSIDE `notify.ts`'s two send functions (`sendAdminAlert`, `sendDualNotification`) — every
  outbound mail passes `scanHard` (post-fix tier) over subject + a tag-stripped text projection of
  the html. On hit: the mail does NOT send, the violation is audit-logged, the caller gets
  `{sent:false, reason:"banned_language"}` — fail-loud, and the underlying DB record (already
  written by every caller, per the notify contract) remains the durable record. Admin-only ops
  alerts included: cheap, and the scope law says NOWHERE.
- **UI COPY:** a **static source lock**, the `retiredPricing.lock.test.ts` pattern — walk
  `lib/content/`, `components/marketing/`, `components/portal/`, `app/(marketing)/`,
  `app/(portal)/` and run the post-fix HARD scan over string literals. Catches banned copy at
  commit time, costs nothing at runtime. (H2 OQ-3's badges.tsx manual care becomes enforced.)
- **ERROR MESSAGES:** client-facing error strings live in route `message:` fields and thrown-error
  copy rendered by the portal. Same static-lock approach over `app/api/**` `message:`/`error:`
  string literals + portal error components. Runtime scanning of error paths is over-engineering;
  the strings are static — lock them statically.
- **AI PROMPTS:** ruled 2026-07-23 — prompts quoting bans as instructions-of-the-ban are the
  mechanism, not a violation. **Accepted as read; no scan.** (A comment-marker convention in
  prompt files is optional polish, not specced.)

## 3. THE M9/PROCUREMENT STRUCTURAL GAP — **BUILT FIRST** (founder-ruled priority)

Today "you should buy" inside an M9 snapshot passes the delivery gate because the HARD walk
excludes procurement patterns. M9 is the newest, most client-facing surface; exposure rose when
S-1 shipped and the scanner did not follow. **Fix: H10 (the promoted, negation-complete
procurement class) joins the HARD tier, so the EXISTING delivery walk catches it with zero new
wiring** — the walk already covers M9/M8/findings/questions/identity-note. Build order: H10 →
delivery-walk RED-proof (an M9 fixture carrying "you should buy" AND one carrying "you should not
buy" must both 422) → then H11–H15 → then surfaces (§2) → then trigger 9 (§4).

## 4. TRIGGER 9 — CLIENT-INPUT LEGAL/IP-NOTICE DETECTION (the INVERSE — flag, NEVER block)

**Direction and consequence are opposite to everything above, by ruling:** banned-language scans
OUR OUTPUT and BLOCKS; trigger 9 scans CLIENT INPUT and FLAGS. A client must never be blocked
from disclosing something important.
- **Detection:** `findLegalSignals(text)` — a small pattern set over `client_notes` (+ additional
  question answers): IP complaint / infringement / cease and desist / legal notice / lawsuit /
  attorney / Section 3 / account deactivation-with-legal-context. Presence-based, no LLM.
- **Where:** DERIVED AT RENDER + ALERT AT INTAKE, **zero storage, zero migration**: (a) the submit
  route (`app/api/cases/submit/route.ts` — notes enter at line 33) fires `sendAdminAlert("legal
  signal in client notes", …)` when signals hit (non-fatal, never delays the submission);
  (b) the admin review page derives the same scan at render and shows a loud `⚖ LEGAL FLAG`
  banner above Client Notes. Re-deriving beats storing: no schema change, no stale flag, the
  Brief's `legal_flag` intent honored without a migration. **If the founder wants a persisted
  flag instead → `cases.legal_flag boolean` is an additive migration → DESCRIBE-AND-STOP.**
- **NOT a block, NOT a case-status change** (the Brief's `manual_review_required` status class was
  superseded by the universal awaiting_review gate — the founder always reviews before delivery;
  the flag makes sure he SEES it).

## 5. THE H4 NEGATION CARVE-OUT ("Amazon approval" in denial form)

H4 (`/amazon\s+approv/i`) blocks the founder's own denials: the §8 governing law and the OQ-CC5
scope sentence both carry "…do not confirm or deny Amazon approval". **Fix: the H2-precedent
negation guard** — H4 keeps blocking affirmative forms ("Amazon approved", "Amazon approval
guaranteed") and passes NEGATED/DENIAL forms (a preceding-window check for
deny/denial/not-confirmation/never, the `hasUnnegatedGuarantee` pattern). Two-sided fixtures:
the governing law and the scope sentence MUST pass; "this supplier has Amazon approval" MUST
still block. This unblocks the client-surface gate from embedding either founder string.

## 6. THE TWO-SIDED GUARANTEE — mandated denials that MUST keep passing (the H2/H3 lesson, load-bearing)

Every new rule ships with these as MUST-PASS fixtures (a fix that gags the platform's honest
denials is a worse defect than the holes it closes):
"We do not provide ungating services." · "We could not confirm authorization." · "does not
confirm or deny Amazon approval" (§8 law) · "not confirmation of Amazon approval or refusal"
(OQ-CC5) · "We do not guarantee: marketplace approval, account safety, …" (the mandated
disclaimer) · "No authorization visibility was located during this review." · "Supplier identity
could not be confirmed through available public sources." · "No elevated risk indicators observed
based on available evidence." · every §12 instead-column string · every §8 flag-language string ·
all Spec-B client_note templates (already locked, must stay green) · the four `VERDICT_SENTENCES`.

## 7. WHAT REOPENS, AND THE BUILD PLAN (RED-first)

- **REOPENS: `lib/utils/banned-language.ts` (H5-frozen)** — additive HARD rules H10–H15 + the H4
  negation guard. The two-tier architecture, the walkers, and existing rule semantics stay;
  `banned-language.test.ts` grows, existing cases stay green.
- **TOUCHED, not frozen:** `notify.ts` (email gate) · submit route + admin review page (trigger 9)
  · new static lock tests (UI/error surfaces) · new `legalSignals.ts`.
- **NOT touched:** `procurementLanguage.ts` stays as-is for its track-field call sites (H10 is a
  HARD superset at the delivery/global layer; consolidation is hygiene for a later pass, not this
  gate) · the delivery walk's structure · all engine/frozen core.
- **RED-first sequence:** (1) the ten evasions + ten mandated denials as fixtures — watch ALL
  evasions pass wrongly (RED) and denials pass (baseline) → (2) H10 + delivery-walk proof (§3) →
  (3) H11–H15 one at a time, each with its two-sided pair → (4) H4 carve-out (§5 fixtures) →
  (5) email gate → (6) static locks (UI/error) → (7) trigger 9 → (8) full suite + the S-1/CC
  regression proof: every existing template/lock stays green, frozen core byte-identical.
- **Migrations: NONE expected** (trigger 9 is derive-at-render; the only conditional is §4's
  persisted-flag option — describe-and-stop if chosen).
- **ATs (founder-run):** the ten evasions blocked at delivery by name · both §6 founder strings
  pass · an email carrying "ungated" refuses to send (audit-logged) · the legal-flag banner on a
  fixture case · the M9 "should not buy" 422.

## THE RULING BOARD

- **OQ-BL1:** the H10–H16 rule set + tier assignments as specced (all ten HARD; A1–A5 unchanged) — approve/amend?
- **OQ-BL2:** email gate semantics — block-the-send + audit + `{sent:false}` (specced) vs send-with-alert? (Specced form recommended: the scope law says NOWHERE, and the DB record already exists as the durable fallback.)
- **OQ-BL3:** trigger 9 — derive-at-render + intake alert, zero migration (specced) vs persisted `cases.legal_flag` (additive migration, describe-and-stop)?
- **OQ-BL4:** the H4 negation carve-out per §5 — approve?
- **OQ-BL5:** the §6 mandated-denial list — complete, or does the founder add phrases?
- **OQ-BL6:** UI/error surfaces as STATIC locks (specced — commit-time, zero runtime cost) vs runtime scanning — approve static?

---

# 🟢 GATE FROZEN — founder-declared 2026-07-24 · frozen pointer `20ede18` (ratified, superseding `5da1fa5`)

**THE POINTER MOVED ONCE, ON THE RECORD:** the gate was first declared frozen at `5da1fa5`; the
founder-authorized post-freeze probe (the runtime-feeding method, same session) found **two latent
bugs in the frozen state**, fixed at `20ede18`, and the founder RATIFIED the amended commit as the
frozen state the same day. Reason verbatim on the tracker; summary:

1. **Research-vocabulary false 422s (operational):** H14's fraud side and H11's bare "unsafe" were
   presence-based — Track 1's own absence-reporting narrative ("No scam reports were found") and
   attributed regulator findings ("deemed the product unsafe") hit the bans. **Would have blocked
   the first real $499 case at publish.** Reshaped VERDICT-ONLY: our-voice conclusions block;
   research-artifact/absence vocabulary passes; attributed allegations still block (H2 precedent).
2. **Containment leak:** unwrapped audit-log writes in `categoryStep.auditDrop` and the email
   gate could convert an advisory drop into a pipeline-killing throw / a caller-facing rejection.
   Wrapped; `stageCategoryCompliance` is now provably non-throwing end-to-end.

Both RED-proven (5 + 2 watched fails), all original MUST_BLOCK locks green, suite **965/965
unpiped exit 0** · tsc 0 · frozen surfaces byte-identical outside the authorized amendment.

## AT record (founder-declared at the first freeze; unchanged by the amendment)

Must-pass fixture 66/66 (now 72/72 with the research-vocabulary block) — direction proven by
name · H10–H15 evasions blocked incl. the M9 "should not buy" → 422 · banned-language suite
92/92 → 99/99 across 4 files · email gate 7/7 → 8/8 (block-the-send; ADR-G004 divergence closed)
· BL6 lock 2/2 (caught the live help.ts violation on first run) · trigger 9 flag-never-block,
derive-at-render, zero migration · the 2 PROPOSED copy edits (help.ts action line,
how-it-works.ts negation) ride to the client-surface gate.

**THE FROZEN SET:** `lib/utils/banned-language.ts` (as of `20ede18`) · the fix/lock/notify/
legalSignals test files · `notify.ts`'s gate semantics · the trigger-9 wiring (submit alert +
review-page banner) · the direction law ("a legal signal can never produce an error response") as
a named lock. **The lesson this gate leaves behind:** two-sided isn't one list — it is denials
(§6), verdict vocabulary (the whitelist-by-construction), AND the evidence's own research
vocabulary (the post-freeze find). Any future rule addition tests all three sides.
