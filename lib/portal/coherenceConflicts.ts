import type { SourcingContradictionRecord } from "@/lib/research/contracts";

// ── THE TOLERANT READ FOR TRACK 5's CONFLICT RECORDS — ONE DEFINITION, BOTH BUNDLES ───────────
//
// ⚠ WHY IT LIVES HERE AND NOT IN lib/research/contracts.ts, WHERE IT BELONGS ON SUBJECT.
// `components/admin/case-review.tsx` is a "use client" file, and s2.locks.test.ts forbids ANY
// runtime import from `@/lib/research/` in a client component — the engine must never reach a
// browser bundle. The lock caught this on the first attempt, which is exactly its job.
//
// The alternative was inlining the two-line read in the panel, and that is the drift class this
// codebase keeps paying for: two copies of one rule, one of which gets updated. So the function
// moves to a dependency-free module BOTH sides may import, and contracts.ts re-exports it for
// server callers. Same precedent as lib/auth/capabilities.ts, split out of permissions.ts when
// its supabaseAdmin import reached the browser through a client component.
//
// ⛔ THE `import type` ABOVE IS ERASED AT BUILD and is explicitly legal under the lock. Keep it a
// type-only import: making it a value import would re-create the leak this file exists to avoid.
//
// ── WHAT IT READS ────────────────────────────────────────────────────────────────────────────
// Track 5's container field was renamed `contradictions` → `coherence_conflicts` on 2026-09-01,
// so that "contradiction" means exactly one thing in this codebase: Module 4's verdict-bearing
// set. The RECORD shape did not move — it is still frozen m4c-1.0.0.
//
// ⚠ THE 15 CASES DELIVERED BEFORE THE RENAME HOLD THE OLD KEY, and they are frozen artifacts: the
// divergence law says a delivered record is investigated, never smoothed, so there is no migration
// and no backfill. This reader is the entire cost of that choice, and it is why re-rendering a
// two-month-old report still shows what it always showed.

/** Read Track 5's coherence-conflict records from a stored payload, new shape or old. */
export function readCoherenceConflicts(sl: unknown): SourcingContradictionRecord[] {
  const o = (sl ?? {}) as { coherence_conflicts?: unknown; contradictions?: unknown };
  if (Array.isArray(o.coherence_conflicts)) return o.coherence_conflicts as SourcingContradictionRecord[];
  if (Array.isArray(o.contradictions)) return o.contradictions as SourcingContradictionRecord[];
  return [];
}
