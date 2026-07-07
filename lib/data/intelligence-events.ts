import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import { researchIdentityFor } from "@/lib/research/researchIdentity";
import { normalizeName } from "@/lib/utils/normalize-name";

// H6 — the append-only Case Intelligence Event (ADR-G007): the corpus's source of truth. One row
// per completed investigation attempt, recorded whether or not the identity was confirmed (the
// ledger stores TRUTH; the profile ROLLUPS exclude unconfirmed/failed events). Idempotent under
// Inngest retry/replay via UNIQUE(case_id, attempt_number, event_type) — this is what makes the
// corpus write safe to retry (the H2-era case_count re-increment hazard dies here).
export interface InvestigationEvent {
  case_id: string;
  attempt_number: number;
  event_type: "investigation_completed";
  entered_name: string | null;
  resolved_name: string;
  vendor_name_normalized: string;
  resolved_domain: string | null;
  identity_unconfirmed: boolean;
  identity_failed: boolean;
  brands: string[];
  brands_normalized: string[];
  signals: Partial<Record<TrackKey, TrackSignal>>;
  verdict: string | null;
}

export interface MemoryWriteArgs {
  signals: Partial<Record<TrackKey, TrackSignal>>;
  verdict: string | null;
  identityFailed: boolean;
  identityUnconfirmed: boolean;
}

export function buildInvestigationEvent(ctx: TrackContext, args: MemoryWriteArgs): InvestigationEvent {
  const rid = researchIdentityFor(ctx); // H4's ONE identity selector — the logged intelligence.ts refactor
  const brands = ctx.brands_submitted ?? [];
  return {
    case_id: ctx.case_id,
    attempt_number: ctx.attempt_number ?? 1,
    event_type: "investigation_completed",
    entered_name: ctx.vendor_name ?? null,
    resolved_name: rid.name,
    vendor_name_normalized: normalizeName(rid.name),
    resolved_domain: rid.domain,
    identity_unconfirmed: args.identityUnconfirmed,
    identity_failed: args.identityFailed,
    brands,
    brands_normalized: brands.map(normalizeName).filter(Boolean),
    signals: args.signals,
    verdict: args.verdict,
  };
}

export async function recordInvestigationEvent(ev: InvestigationEvent): Promise<{ inserted: boolean; error: string | null }> {
  const { error } = await supabaseAdmin.from("intelligence_events").insert(ev);
  if (!error) return { inserted: true, error: null };
  if (error.code === "23505") return { inserted: false, error: null }; // replay — attempt already in the ledger
  return { inserted: false, error: error.message };
}
