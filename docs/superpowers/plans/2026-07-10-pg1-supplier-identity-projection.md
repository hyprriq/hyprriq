# PG-1 — supplier_identity Client-Surface Projection (micro-gate, founder-review spec)

**Status:** 🔴 **DRAFT — AWAITING FOUNDER REVIEW (one SO, one OQ). NO CODE UNTIL RULED.** Sequenced BEFORE Track 3 (founder-ruled 2026-07-10).
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

- **OQ-A — should the projected note ALSO be status-gated (H5 delivered-only pattern), or keep current render timing?** **Recommendation: keep current timing (projection only, minimal change).** The client_note is the intended client-visible surface, H5's delivery gate already scans it at publish, and changing render timing is a product-behavior change this micro-gate shouldn't smuggle. If the founder wants delivered-only gating, it's one extra condition — rule it explicitly either way.

## ACCEPTANCE TESTS (founder-run)

**AT-1 (two-sided, live):** open a case page as a client with DevTools → the RSC payload/props contain NO `resolution_research`, `resolution_audit`, `resolution_notes`, `candidate_domains`, `registration_signals`, `resolution_method`; the identity-clarification note (when the case has one — e.g. AWI-2607-026's name_website_mismatch note) still renders byte-identically. Unit lock: projection function two-sided (keeps kind+client_note; strips everything else; null-safe).
**AT-2:** admin review page unchanged (full identity visible — eyeball AWI-2607-018's carried audits still render admin-side).
**AT-3:** `rejudge-case.ts` determinism PASS (no engine surface touched — expected trivially green; run it anyway, standing rule).

## TASK (one; TDD; single commit)

- [ ] Failing tests: projection unit two-sided + a type-level lock that the portal view-model no longer carries the full `SupplierIdentity`. Implement the projection; full verify; push staging. **STOP — founder runs AT-1..3 → PG-1 frozen → Track 3 build unblocks (once its SOs/OQs are ruled).**
