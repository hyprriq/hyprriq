# ADR-007: Brands & Suppliers as normalized entities (PROPOSED — not implemented)

**Status:** Proposed
**Date:** 2026-06-20
**Deciders:** Gautam (Founder/CTO)

## Context
Admin wants a browsable cross-reference: click a brand → see every supplier ever
researched against it (across all clients), and vice-versa — so the same
brand-supplier relationship isn't re-researched from scratch each time.

Today, on a `cases` row, vendor and brands are **denormalized text**:
`vendor_name text`, `vendor_name_normalized text`, `brands_submitted text[]`,
`brands_confirmed text[]`. There are `supplier_cache` and `brand_cache` tables,
but they are **per-entity research caches** (keyed by normalized name), not a
queryable case↔entity relationship. So "every supplier researched for brand X
across all clients" cannot be answered without scanning text arrays on cases.

## Decision (proposed)
Introduce normalized entities + a join, layered on top of the existing caches:

```
brands         (id, name, name_normalized UNIQUE, ...)        -- promote brand_cache or new
suppliers      (id, name, name_normalized UNIQUE, website)    -- promote supplier_cache or new
case_brands    (case_id FK, brand_id FK, certainty, PRIMARY KEY(case_id,brand_id))
case_suppliers (case_id FK, supplier_id FK, PRIMARY KEY(case_id,supplier_id))
brand_supplier_links (brand_id, supplier_id, last_case_id, last_finding_certainty,
                      times_seen) -- the cross-reference index, upserted per case
```

- Write path: when a case is delivered (and later when Track 0/research runs),
  upsert into `brands`/`suppliers` (by `name_normalized`), the two join tables,
  and `brand_supplier_links`.
- Read path (admin only): brand detail → join `brand_supplier_links` → suppliers;
  supplier detail → reverse. Both are simple indexed lookups.

## Options
- **A. Keep text fields, query with `ANY`/`unnest` over `cases`** — no migration,
  but every cross-ref read scans all cases' arrays; no dedup; gets slow + messy.
- **B. Full normalization above (recommended)** — proper entities, fast indexed
  cross-ref, dedup, reusable research. Migration + backfill from existing cases +
  write-path changes in the deliver/review flow.
- **C. Reuse `brand_cache`/`supplier_cache` + add only the join tables** — lighter;
  the caches already dedupe by normalized name. Likely the pragmatic middle path.

## Complexity / risk
- Migration: additive (new tables) + a **backfill** that parses existing
  `brands_submitted`/`vendor_name` from delivered cases — one-time, scriptable,
  low risk (no destructive change to `cases`).
- Ongoing: the deliver/review write-path must populate the join tables — couples
  to the (currently manual) review flow and, later, the research pipeline.
- Privacy: cross-client aggregation is **admin-only** — must never leak which
  *clients* asked (show relationships/counts, not client identities) unless
  explicitly intended.

## Recommendation
Schedule as its own session **after** the research pipeline lands (the pipeline
is the natural write-path owner). Until then: keep text fields; do not build the
UI. Option C is the likely implementation.
