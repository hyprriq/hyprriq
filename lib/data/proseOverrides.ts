// ── CLIENT-PROSE OVERRIDES — storage layer ("Show + Fix" piece 2).
// The law lives on lib/portal/proseOverlay.ts and on the migration: an override is a CLIENT-
// PROJECTION layer, never an evidence edit. This file only reads and writes the rows; it holds no
// judgment about what may be overridden and never touches case_track_results or case_synthesis.
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProseOverride } from "@/lib/portal/proseOverlay";

export type StoredProseOverride = ProseOverride & {
  id: string;
  reason: string | null;
  actor_id: string;
  created_at: string;
};

/** Active overrides for ONE attempt. Overrides never carry across attempts — a re-run starts clean. */
export async function getProseOverrides(caseId: string, attempt: number): Promise<StoredProseOverride[]> {
  const { data, error } = await supabaseAdmin
    .from("case_prose_overrides")
    .select("id, target, field_path, original_text, replacement_text, reason, actor_id, created_at")
    .eq("case_id", caseId).eq("attempt_number", attempt).is("deleted_at", null)
    .order("created_at");
  if (error) {
    // FAIL LOUD, NEVER SILENT: a swallowed read here would publish the engine's raw wording while
    // the operator believes their correction is in force. The callers turn this into a hard error.
    throw new Error(`prose overrides unreadable: ${error.message}`);
  }
  return (data ?? []) as StoredProseOverride[];
}

/** Write (or replace) the operator's wording for one field of one attempt. */
export async function saveProseOverride(input: {
  caseId: string; attempt: number; target: string; fieldPath: string;
  originalText: string; replacementText: string; reason: string | null; actorId: string;
}): Promise<{ error: string | null }> {
  // Replace rather than update: the soft-deleted row stays as the record of what was there before.
  const { error: delErr } = await supabaseAdmin
    .from("case_prose_overrides")
    .update({ deleted_at: new Date().toISOString() })
    .eq("case_id", input.caseId).eq("attempt_number", input.attempt)
    .eq("target", input.target).eq("field_path", input.fieldPath).is("deleted_at", null);
  if (delErr) return { error: delErr.message };

  const { error } = await supabaseAdmin.from("case_prose_overrides").insert({
    case_id: input.caseId, attempt_number: input.attempt,
    target: input.target, field_path: input.fieldPath,
    original_text: input.originalText, replacement_text: input.replacementText,
    reason: input.reason, actor_id: input.actorId,
  });
  return { error: error?.message ?? null };
}

/** Revert to the engine's wording. Soft delete — the ledger keeps what was tried. */
export async function clearProseOverride(
  caseId: string, attempt: number, target: string, fieldPath: string,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("case_prose_overrides")
    .update({ deleted_at: new Date().toISOString() })
    .eq("case_id", caseId).eq("attempt_number", attempt)
    .eq("target", target).eq("field_path", fieldPath).is("deleted_at", null);
  return { error: error?.message ?? null };
}
