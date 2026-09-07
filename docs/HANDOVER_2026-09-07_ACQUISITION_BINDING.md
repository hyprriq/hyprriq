# HANDOVER — 2026-09-07 · acquisition binding deployed-not-pushed, the walk pending

**For the next session. Everything below was MEASURED at write time (2026-09-07, ~08:00Z reads);
re-verify with the queries given before acting — state has moved mid-conversation twice this
week and both times the founder caught it, not us.**

## 0 · Session protocol (unchanged, load-bearing)

- Answer from files, not memory. If the codebase contradicts the brief, STOP and tell the founder.
- Measure before asserting; report numbers from real measurement.
- Six things stop at the founder: production migrations · money/Stripe · deploy to main ·
  deleting anything · anything changing what a client is charged/promised/shown · verdict maths.
  (Deploy = the founder says "deploy", then we merge/push and verify READY + SHA + alias.)
- ⛔ Never `git add -A`. Explicit paths only; `.claude/ backups/ codex-fresh-design/
  mockups-codex-exploration/` stay untracked.
- ⚠ Standing rule 11 lives here too: multi-line strings and regexes written through the bash
  heredoc channel get escape-stripped IN TRANSIT (`\n` becomes a newline inside Python source,
  `\\b` becomes `\b`). Write scripts to a file with the Write tool, or use escape-free literals
  (`String.fromCharCode(10)`, assertion-guarded replacements). This bit three times this week;
  the per-function audit pattern (verify every converted site, not the regex) is the recovery.
- SSOT = `docs/HyprrIQ_OPEN_ITEMS.md` (§0-U is the newest section; standing rules 1–16 in §8).

## 1 · WHERE WE ARE — the acquisition-binding arc

**The story in one paragraph:** Approve (one click = ruled grant + invite email + audit) shipped
2026-09-07 morning. Its first real exercise found the failure mode: the grant carried no
recipient binding (email lived in `note` free text) and no issuer check, so the founder's own
admin click redeemed the first partner grant ever sent. Fully reverted (4 statements, read-back
clean), grant `df72272a…` revoked. The binding batch was then built: `recipient_email` on
grants, RPC issuer-block + wrong-account refusal with MASKED copy, billing_audit CHECK widened
(its insert had violated the CHECK on every redemption since 2026-08-21, swallowed fail-soft —
rule 14 inside a success path). Full detail: tracker §0-U + commit messages `a211d8d`, `7c124e4`.

**Git (verify: `git log --oneline orgin/main..main`):**
- Branch state at handover: `main` == `staging`, working tree clean.
- ⚠ **THREE COMMITS SIT ON `main` UNPUSHED** — `a211d8d` (binding batch), `31801f0` (DOC-DELTA
  §0-U), `7c124e4` (probe fix). The binding CODE is NOT deployed.
- Remote is named `orgin` (their typo, do not "fix" it). Push = `git push orgin main`.

**Database (verify with one query each — all measured true at write time):**
- Migration `20260906000000` (approval) ✅ ran. Migration `20260907000000` (binding) ✅ **ran**
  — `acquisition_grants.recipient_email` exists, `billing_audit_event_check` includes
  `grant_redeemed`. **Migration-before-deploy ordering is therefore already satisfied.**
- `partner_requests`: `approved:1` (g@hyprrbrands.com → grant `df72272a…`, which is REVOKED,
  `recipient_email` NULL, `redemption_count` 0) · `contacted:1` (legacy row, stays).
- `grant_redemptions`: 0 rows. Live (unrevoked) grants: 0.
- ✅ **The Resend delivery seam has its first live proof**: the one `grant_invite` email row
  carries a NON-NULL `resend_message_id` (the only row in the whole ledger with one — everything
  earlier predates the seam).
- Support replies: 2 of 2 tickets carry `admin_response`; 2 `support_reply` emails sent
  (pre-seam, so no message ids — expected). The founder's four-check walk report was never
  delivered; treat the path as exercised-per-DB, not founder-verified.

## 2 · THE NEXT ACTION (single, unambiguous)

1. **Founder says "deploy"** → `git push orgin main` → verify Vercel deployment READY, SHA
   `7c124e4`, alias `hyprriq.com` (Vercel MCP: project `prj_fi4xRBMD0UdH3R0tdgqU1C2g3QT8`,
   team `team_tcDXxvsw5aBPtcsrlskgucjU`).
2. Founder re-opens the request so Approve #2 issues a BOUND grant:
   `update partner_requests set status='new', decided_at=null, grant_id=null
    where email='g@hyprrbrands.com';`
3. **THE WALK — refusals BEFORE the happy path** (once redeemed, binding refusals become
   unreachable on that grant). Only credit-SPEND costs research money; all of this is free:

| # | path | how | correct |
|---|---|---|---|
| 1 | issuer block | founder clicks fresh link as admin (repeat of the accident) | "created from your own operator account" refusal |
| 2 | wrong_account + mask | click as hyprriq@gmail.com | `g•••@hyprrbrands.com` — **local part must be absent** |
| 3 | new-user redemption | different browser, sign up g@hyprrbrands.com | credit lands; `grant_redemptions` +1; **first `billing_audit` row with `event='grant_redeemed'`** |
| 4 | spent link re-click | reopen link | `/partners?invite=inactive` |
| 5 | already_has_plan | manual UNBOUND grant, open as hyprriq@gmail.com (has single_99); revoke after | plan refusal |
| 6 | revocation mid-flow | create, click (cookie parks), revoke, load portal | "no longer active" |
| 7 | expiry | park a 1-day grant, walk tomorrow | "expired" — the only time-gated one |

## 3 · OPEN BEYOND THIS ARC (ranked)

1. 🔴 **LIVE STRIPE HAS NOT HAPPENED** — 0 livemode events in `stripe_events`. The full runbook
   (products, portal config, webhook, env vars Production-only, order, first-purchase watch)
   was delivered in-session ~2026-09-02; the four stale TEST-mode `stripe_customer_id`s and the
   buy-from-`user_3IN1WU…` instruction are the critical parts. `SEARCH_INDEXING_ENABLED` stays
   false until the first real purchase succeeds (`lib/constants/site.ts`).
2. 🔴 **AWI-2608-045 re-publish never happened** — 0 prose overrides on the case, status still
   `delivered` from 09-01. The five verified replacement texts (four `ungating` + one `gated
   listing`, all gate-clean) are in the 2026-09-06 conversation; the founder pastes them via
   publish → blocked panel (4 boxes) + one manual override on
   `track:brand_risk_assessment` / `questions_to_ask[1].question`. First exercise of the
   override→re-render→re-send chain.
3. 🔴 **Cost telemetry still dead** (`prompt_runs` 0 rows; `runModel` discards usage) — the
   acquisition-readiness review's top blocker with the RLS posture and the watchdog-kills-queue
   defect (`watchdog.ts` WEDGE includes `pending_intake` while pipeline concurrency=5). Full
   ranked list: the 2026-09-06 review report (10 findings, all CONFIRMED).
4. ⚠ **Block-rate watch** on the `ungating` gate: baseline 4/15 delivered cases carried the
   word pre-ruling; prompts now forbid it. Re-run `scripts/banned-language-corpus.ts` after the
   next few cases; flag if materially above a quarter.
5. ⚠ Email HTML injection in support/change-request bodies (raw interpolation into
   `dangerouslySetInnerHTML` templates) — review finding, unfixed; contact/partner routes show
   the escaping pattern to copy.
6. Support-reply walk report (founder), tap-floor allowlist rows, inbound mail
   (recorded-not-chosen), `/portal/guides` two "Coming soon" rows.

## 4 · RULINGS MADE THIS ARC (so nobody re-litigates)

- **Approve, no auto-issue**: "the click is the decision, the code is only the courier."
  Decline sends nothing. "Mark contacted" is gone (an action's name must not describe a side
  effect the system does not perform).
- **Two checks, two laws (verbatim, in the RPC):** "Binding is per-grant, self-dealing is
  per-system. A coupon may be unbound to recipients; it is never redeemable by its creator."
- **The masked refusal is a security control**: first char + ••• + domain; the full address
  never leaves the server.
- **'contacted' stays in the DB CHECK** as valid-but-unissuable history (divergence law).
- New instrument lessons for §8 candidates: a migration validated against a measurement is
  validated against a MOMENT (re-measure at run time — saved us twice); a read-back probe must
  test EXACTLY ONE constraint (the FK-vs-CHECK probe fix, `7c124e4`).
