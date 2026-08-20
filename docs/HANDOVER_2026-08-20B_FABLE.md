# HANDOVER — 2026-08-20 (evening) → next session

**Read cold. Nothing here is taken on trust.** Every number was measured and is re-checkable with
the command given. **If your reading of the code or the data disagrees with this file, THE FILE IS
WRONG** — say so with evidence. That instinct found every real defect this week, including several
of the previous sessions' own.

**Branch** `staging` · **HEAD** `54876ea` · fully pushed, tree clean (only `skills-lock.json` +
the founder's four untracked folders, which NEVER get committed).
**Gates at handover:** 1747/1747 · tsc 0 · eslint 0 · build clean.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md` (seven stale rows cleared at `55cae3e` — but VERIFY
LIVE anyway; distrusting the tracker is how this week's defects were found).

---

## 0 · WORKING MODE (founder-ruled, standing)

Full authority: find, fix, verify, commit, push to staging — no asking first. Report ONCE at the
end. The ONLY stops: (1) writes to existing production data / migrations → describe-and-stop with
exact SQL + read-backs, founder runs; (2) money/Stripe; (3) deploying to main/production;
(4) deleting anything; (5) changes to what a client is charged/promised/shown as a product claim
(fixing a broken sentence is yours; deciding what $99 includes is not); (6) the verdict maths —
signals, weights, thresholds, vetoes (prose/contracts/projections/output fields AROUND it are
yours; that boundary has held).

---

## 1 · WHAT IS PROVEN — the milestone this session closed

**The entire chain is proven on a REAL CLIENT, including the last unproven link.**
AWI-2608-043 (single_99, gautam@buddyvirtual.com): published 16:07:22Z → Inngest first invoke
16:12:29 → PDF stored 16:12:40 (`user_3FT…/AWI-2608-043-attempt-1.pdf` in `reports`) → audit
16:12:41: `report_pdf: "stored"`, **`email: {sent: true, attached: true}`**. Verify:

```sql
select new_value from audit_log where record_id='34617b97-aa0e-4540-bfb4-a1c99bb01453'
 and new_value::text like '%report_pdf%';
```

- Inngest event→invoke pickup is **~5 minutes and that is NORMAL** (operator batch this morning
  behaved identically). A "still being prepared" 202 inside that window is accurate, not a bug.
- ⚠ STILL OWED BY THE FOUNDER: eyeball confirmation the email + attachment is in the inbox — the
  one reading the data cannot take. Also two non-blocking `401 Invalid signature` GETs to
  `/api/inngest` (15:30/15:58Z) — invokes sign fine; a glance at the Inngest dashboard sync panel
  someday, not urgent.

Delivered corpus: 13 cases — 11 verify / 1 usable / 1 source_clear.

## 2 · THE OPEN THREADS, in the order they unblock

### A · EMAIL SYSTEM — awaiting the founder's DESIGN APPROVAL, then 8 more emails
`docs/ADR-EMAIL-001.md` is the whole architecture (read it before touching email). Landed at
`d7b7100`: `lib/email/templates/EmailLayout.tsx` + `DeliveryNotification.tsx` +
`scripts/email-preview.ts`; browser-openable previews at `public/prototype/email-preview/`.
**Nothing is wired into notify.ts yet — deliberately.** On approval:
1. Wire the layout into the 5 existing senders + the LAYOUT LOCK TEST **in the same commit**
   (a lock landing before the code obeys it fails the build; that ordering was deliberate).
2. Welcome / payment-failed / low-credit (at 1, again at 0) / renewal-reminder (ruled: keep, the
   pre-charge courtesy only). **Cancellation email BLOCKS on the deletion policy** — nothing that
   promises deletion ships before something deletes (founder ruling).
3. ⚠ MIGRATIONS NOT YET WRITTEN (next session writes, founder runs): `email_log.dedup_key text`
   + partial unique index on `(template, dedup_key)` — **this IS the idempotency for emails 4–7,
   they block on it** — and `marketing_contacts` (address, consent status, consent ts, source,
   unsubscribe status). Then the newsletter box + tokenized permanent `/unsubscribe`.
4. Idempotency per class is DESIGNED in the ADR (Stripe: processed-guard + dedup_key on
   invoice/subscription ids; welcome: send only on the insert-CREATE path, never the upsert;
   scheduled: one send per threshold per billing cycle BY UNIQUE KEY). Do not re-derive it.

### B · RLS → Clerk JWT wiring — waiting on TWO founder dashboard steps
`docs/ADR-RLS-001-clerk-identity-wiring.md` + migration `20260820000100` (described-and-stopped,
inert until the provider is on; plpgsql exception-guarded — EVERY policy calls this function, a
throw downs the portal; body proven live under a dropped probe). ⛔ **NEVER "simplify" to a
set_config GUC** — PostgREST pools connections; session-scope leaks identity ACROSS TENANTS,
txn-scope never reaches the query (memory: `clerk-identity-is-verified-jwt-not-guc`). When the
founder enables Clerk third-party auth in Supabase + confirms `sub`: land
`createUserScopedClient()` (anon key + `accessToken`) AND the authenticated-JWT adversarial probe
**in that same session** — wired early = every read returns zero rows (outage, not hole).
Escalation pre-fix verified live: self-`role='founder'` REFUSED, self-edit allowed, row untouched.

### C · Cloudmersive — waiting on the founder's key
Env: **`CLOUDMERSIVE_API_KEY`** (one var). Ruled wiring: BLOCKING at upload, **fail-CLOSED** (no
key/unreachable = refuse the upload, an unscanned file never enters the bucket), plain
client-facing refusal, verdict audited either way.

### D · Two defects found on 043, needing decisions
1. **Vendor-IS-brand ceiling — MEASURED, NAMED, UNRULED.** The engine cannot recognise a vendor
   that IS the brand: no identity-layer comparison, no Track 2 weight key, no verdict input.
   Corpus 3/44 manufacturer-direct cases, ZERO better than mid-scale; AWI-2607-024's Track 2
   returned `no_connection_found` for a brand vs ITSELF. Any fix touches the weight registry /
   verdict path = frozen surface = founder ruling. Sharpest form of 3c; sits with the founder.
2. **Polarity mis-key on a REAL delivered case:** 043's Track 1 fired `negative_reputation` (−3)
   on a POSITIVE statement ("Reddit users… reference using the seasonings positively"). The
   weight firewall validates key-exists-for-track, not statement-vs-key polarity. Without it 043
   likely lands `infer` and ~2.5 → the usable boundary. A polarity validation layer touches
   scoring acceptance → flag shape to the founder before building.

### E · The rest of the launch list
- **"How to read your report" as a PUBLIC page** — the one marketing-site blocker (content
  already exists: `HOW_TO_READ` constant + `lib/content/help.ts` verdicts). Sample-report page
  EXISTS (`9212296`).
- Legal copy (founder writing) → I build pages+footer → staging→main event → live Stripe.
- Zero-row tables ruled keep-and-comment — the code comments themselves are still unwritten.
- Founder to eyeball once: `/admin/settings` Clerk `<UserProfile />` (render-verified, never
  seen by a human) and the header avatar.

## 3 · WHAT LANDED THIS SESSION (all pushed, `645b560`…`54876ea` plus the morning's run)

Env guard (live Stripe keys refused outside Vercel Production — VERCEL_ENV, never NODE_ENV) ·
Sentry key-safe (DSN envs still unset by founder) · robots/sitemap/OG · resolved-brands chain
(Track 3 emits `{submitted, resolved}` → `cases.brands_confirmed` → PDF cover, "Submitted as:"
when differing; p002-1.2.0 / IOS v0.3.2-resolved-brands) · M9 headline colon-forms (seen working
on 043's live headline) · prose-override UI (blocked-panel reword box; `lib/portal/overrideKeys.ts`
is the ONE locator→overlay translation, round-trip fixture-locked) · LEGAL FLAG banner
render-verified (vitest include now `**/*.test.{ts,tsx}`) · RLS adversarial suite
(`scripts/rls-adversarial.ts`, 40 checks incl. storage) + escalation found→founder fixed→re-verified ·
admin PDF download route + three-state Download button · operator profile (Clerk `<UserProfile/>`
at /admin/settings) + operator names resolve-from-Clerk (`lib/data/operatorNames.ts`, fail-soft) ·
avatar in header · client PDF-cover name resolve-don't-store (`lib/pdf/clientName.ts`, one
composer shared with preflight; portal name edits write THROUGH to Clerk) · claims strip + four
vocabulary survivors fixed · EmailLayout + delivery preview · ADR-EMAIL-001 · ADR-RLS-001.
Earlier same day (see `docs/HANDOVER_2026-08-20_FABLE.md` + tracker): prose repair loop
(pipeline 1.8.0, Part A invariants guard Part B), publish gate as ONE composition, overlay
readers, jurisdiction-as-set, Chromium/fonts/pdfjs serverless fixes, five operator publishes.

## 4 · MECHANICS YOU CANNOT GUESS (hard-earned; several cost hours)

- **Founder-script invocation:**
  `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`
- **`.env.local` IS NOT PRODUCTION.** Wrong three times historically. Env state → say
  unverifiable, ask.
- **Commits: `git commit -F <file>`, ALWAYS.** Inline `-m` with quotes/em-dashes mangles
  (PowerShell split a message into pathspecs this very day). Check the STAGED COLUMN before every
  commit; never `git add -A`.
- **vitest v4 footgun:** `beforeEach(() => mock.mockReset())` RETURNS the mock and vitest CALLS a
  returned function as teardown — phantom failures. Braces: `beforeEach(() => { … })`.
- **PowerShell `[id]` route paths are WILDCARDS** in `-Path` args — silent no-match. Use
  `-LiteralPath` or bash. (Cost a false "pages unguarded" scare.)
- **next.config `outputFileTracingIncludes` is LOAD-BEARING** for the PDF worker (sparticuz bin,
  @napi-rs/canvas both hoisting layouts, pdfjs-dist unbundled). A "cleanup" silently reverts to
  the DOMMatrix/ENOENT crashes — three real failure layers, all measured.
- **Instruments** (one instrument, one number — never merge): `publish-preflight.ts` (route's own
  gate via `composePublishGate`) · `render-check-034.ts` (CASE=… exact client projection,
  delivered-??-latest attempt rule) · `rejudge-case.ts` (verdict determinism) · `gate-census.ts`
  (STORED corpus — 58% is EXPECTED, not a failed fix) · `rls-adversarial.ts` ·
  `email-preview.ts` · `publish-case.ts` (operator-house ONLY, refuses real clients).
- **Supabase MCP** authorised: reads + founder-named writes. Project `mjkacjrrrmlwlwkienvq`.
  Vercel: team `team_tcDXxvsw5aBPtcsrlskgucjU`, project `prj_fi4xRBMD0UdH3R0tdgqU1C2g3QT8`,
  runtime logs need tight windows/deploymentId or they time out.
- **Two writers:** the founder edits DB + dashboards while you work. Never claim a change you did
  not make; re-read before asserting.

## 5 · STANDING RULES (violating these is the actual failure mode)

A named case is a test example, NEVER the design input — measure the corpus first · scope to the
SURFACE, not the field · every new cleaner/scanner/instruction ships with fixtures covering shapes
you did NOT have in mind · one instrument, one number · verify LIVE rather than reading the
tracker · prompt+parser+SCHEMA move together (a ban with no permission is not a contract) ·
client wording changes are renderings, never stored-literal edits · flag UNRULED laws, never slip
them in · frozen surfaces per §0(6).

## 6 · UNRULED, RECORDED, NOT DECIDED

- Vendor-IS-brand ceiling (§2D1) — awaiting founder ruling; measured, do not build ahead of it.
- Polarity validation for weight keys (§2D2) — flag shape first.
- Part A sixth-invariant reach: colon-form edits within 6 words of a flagged region are admitted
  (single-region diff) — pinned honestly in fixtures; multi-region diff noted as future
  tightening, founder acknowledged, NOT scheduled.
- Prompt stricter than gate on "corroborated by <named>" — founder ruled: keep stricter.
