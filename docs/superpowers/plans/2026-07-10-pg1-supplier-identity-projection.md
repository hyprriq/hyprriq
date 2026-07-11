# PG-1 — supplier_identity Client-Surface Projection (micro-gate, founder-review spec)

**Status:** ✅ **PG-1 FROZEN (founder-declared, 2026-07-11) — ALL THREE ATs PASSED.** **AT-1 ✅** two-sided DevTools proof: `resolution_research` returns NO MATCHES on the client case page (61 requests / 2.4MB searched) and IS present on the admin page with full audits — the same field actively stripped client-side, retained admin-side. **The N4-class leak is closed for supplier_identity.** **AT-2 ✅** admin view unchanged. **AT-3 ✅** rejudge determinism clean ("projection touched transport, not judgment"). Ruling-2 condition (confirm/correct invitation lock, all five note kinds) in and green. Build record: commit 32fe228 (projection) + 652e959 (invitation lock); OQ-A ruled KEEP pre-delivery render (record below). Original draft header: Sequenced BEFORE Track 3 (founder-ruled 2026-07-10).
**Phase:** the projection ONLY. NOT in phase: RLS suite, env separation, any other data-layer read (admin unaffected), rendering changes.
**Migration:** NONE.

## PROBLEM (founder-ruled priority, reasons on record in the tracker)

The portal case page passes the whole case object across the Server→Client boundary; the RSC payload serializes the ENTIRE `supplier_identity` JSON to the browser on any case, any status — internal `resolution_notes`, `resolution_research[]` (llm_failed, sources, the SB-2 inner audits with scores/winners/runner-up domains), `resolution_audit`, `candidate_domains`, `registration_signals`, `resolution_method`. Only `identity_discrepancy.client_note` is rendered, but DevTools sees everything. This is the N4 class H5 closed for findings, on a field never projected — and it makes the OQ-A ruling ("infra failures carry no client note; truth lives admin-side") false in practice: the truth ships in the page payload. Every identity-layer gate has been enriching the leak; Track 3 adds more case-object fields next. Fix the boundary first.

## FIX (H5's own pattern)

Server-side projection in the CLIENT data path (`lib/data/cases.ts`, `getCaseById` / any portal-facing selector that returns `supplier_identity`): the client component receives `supplier_identity` reduced to
```ts
{ identity_discrepancy: { kind, client_note } } | null
```
— exactly what it renders today, nothing else. Admin data path (`lib/data/admin.ts`) unchanged (admins see everything — that's the review surface). Type honesty: the portal case view-model type declares the projected shape (no lying `SupplierIdentity` type on a stripped object).

## SIGN-OFF — 🔴 UNSIGNED

- **SO-1 — `lib/data/cases.ts` portal projection (H5 client-surface pattern).** Data-layer only; zero engine change; zero admin change; the rendered client note byte-identical. Two-sided obligation: the note still renders where it renders today, AND the stripped fields are provably absent from the payload.

## OPEN QUESTION — 🔴 UNRULED

- **OQ-A — ✅ RULED (founder, 2026-07-11): KEEP the pre-delivery render — no delivered-only gating.** The note is "a data-correction prompt, not a finding — its value is being early, and gating it to delivered-only defeats the globaldist-class catch"; the retractability worry (AWI-2606-012's once-false note) dissolved because "the churn WAS the SB-2 defect, now fixed." **CONDITION, implemented as a lock:** every identity client_note must carry an explicit confirm/correct invitation (websiteAnchor.test.ts "PG-1 condition" block, all five kinds) — a future copy edit can never turn a provisional prompt into a bare assertion. Note the ruling honored the ORIGINAL Spec-B design intent surfaced during the build (the documented "shows as early as identity resolves" comment).

## ACCEPTANCE TESTS (founder-run)

**AT-1 (two-sided, live):** open a case page as a client with DevTools → the RSC payload/props contain NO `resolution_research`, `resolution_audit`, `resolution_notes`, `candidate_domains`, `registration_signals`, `resolution_method`; the identity-clarification note (when the case has one — e.g. AWI-2607-026's name_website_mismatch note) still renders byte-identically. Unit lock: projection function two-sided (keeps kind+client_note; strips everything else; null-safe).
**AT-2:** admin review page unchanged (full identity visible — eyeball AWI-2607-018's carried audits still render admin-side).
**AT-3:** `rejudge-case.ts` determinism PASS (no engine surface touched — expected trivially green; run it anyway, standing rule).

## TASK (one; TDD; single commit)

- [x] Failing tests: projection unit two-sided + a type-level lock that the portal view-model no longer carries the full `SupplierIdentity`. Implement the projection; full verify; push staging. **STOP — founder runs AT-1..3 → PG-1 frozen → Track 3 build unblocks (once its SOs/OQs are ruled).**
