import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendDormantNoticeEmail } from "@/lib/email/notify";
import { SITE_URL } from "@/lib/constants/site";

// ── RETENTION SWEEP (founder-ruled 2026-08-21 — the legal pages promise deletion; this is the
// machinery that makes the promise true) ─────────────────────────────────────────────────────
//
// ⛔ OFF BY DEFAULT: this function deletes client data, so it runs ONLY when the founder sets
// RETENTION_SWEEP_ENABLED=1 — turning deletion on is a deliberate act, never a deploy side
// effect. Until then the daily tick logs {disabled:true} and touches nothing.
//
// WHAT IT DELETES — SOURCE DOCUMENTS ONLY (ruled scope): uploaded_files whose delete_after has
// passed (the trigger sets 12 months at upload; account closure will tighten it to 30 days when
// closure machinery ships). The storage object is removed from case-documents, then the row is
// stamped deleted_at — the row itself survives as the record THAT a document existed and was
// deleted on schedule. Frozen Evidence Packs carry the extracted content, so findings, reports,
// and rejudge all survive a source-document deletion (H1 untouched).
//
// A missing storage object (already gone) counts as removed — the goal state is "object absent",
// and a sweep that errors forever on a half-deleted file never converges. Every deletion is
// audit-logged; a failed storage removal SKIPS the stamp (the row stays due, tomorrow retries).
//
// DORMANT ONE-TIME ACCOUNTS (same ruled schedule): one-time-plan clients with no activity for
// 24 months get ONE notice (dedup dormant_24m:{client_id} — the unique key is the "once", the
// sweep can fire forever). Closure after the 30-day window is NOT automated yet — it needs
// closure machinery (clients.closed_at + the closure semantics), which lands as its own batch
// with a founder-run migration. Until then the founder closes flagged accounts deliberately.

const DORMANT_MONTHS = 24;

export const retentionSweep = inngest.createFunction(
  { id: "retention-sweep", name: "Retention sweep (source documents + dormant notices)", retries: 1, triggers: [{ cron: "0 3 * * *" }] },
  async () => {
    if (process.env.RETENTION_SWEEP_ENABLED !== "1") return { disabled: true };

    const out = { files_deleted: 0, files_failed: 0, dormant_notices: 0, dormant_skipped: 0 };

    // ── 1 · Source documents past their delete_after. ──
    const { data: due, error } = await supabaseAdmin
      .from("uploaded_files")
      .select("id, storage_path, file_name, client_id, case_id, delete_after")
      .lte("delete_after", new Date().toISOString())
      .is("deleted_at", null)
      .limit(500);
    if (error) throw new Error(`retention-sweep: uploaded_files read failed: ${error.message}`);

    for (const f of due ?? []) {
      const { error: rmErr } = await supabaseAdmin.storage.from("case-documents").remove([f.storage_path as string]);
      // Supabase remove() of a missing object returns success with an empty list — both shapes
      // reach the stamp; only a REAL storage error (bucket unreachable, permission) skips it.
      if (rmErr) {
        out.files_failed++;
        console.error(`[retention] storage remove failed for ${f.storage_path}: ${rmErr.message}`);
        continue;
      }
      const { error: stampErr } = await supabaseAdmin
        .from("uploaded_files").update({ deleted_at: new Date().toISOString() }).eq("id", f.id);
      if (stampErr) { out.files_failed++; continue; }
      out.files_deleted++;
      try {
        await supabaseAdmin.from("audit_log").insert({
          table_name: "uploaded_files", record_id: f.id, action: "DELETE",
          actor_id: "system", actor_type: "system",
          new_value: { retention_deletion: true, storage_path: f.storage_path, file_name: f.file_name, client_id: f.client_id, case_id: f.case_id, delete_after: f.delete_after },
        });
      } catch { /* the audit reporter never blocks the sweep */ }
    }

    // ── 2 · Dormant one-time accounts → the single 24-month notice. ──
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - DORMANT_MONTHS);
    const { data: dormant, error: dErr } = await supabaseAdmin
      .from("clients")
      .select("id, email, full_name, last_active_at, plan_category, role")
      .eq("plan_category", "one_time")
      .lt("last_active_at", cutoff.toISOString());
    if (dErr) throw new Error(`retention-sweep: clients read failed: ${dErr.message}`);

    for (const c of dormant ?? []) {
      if (c.role !== "client") continue; // never dormancy-nag the founder/operator accounts
      const r = await sendDormantNoticeEmail({
        to: (c.email as string | null) ?? null, name: (c.full_name as string | null) ?? null,
        clientId: c.id as string, portalUrl: `${SITE_URL}/portal`,
      });
      if (r.sent) out.dormant_notices++;
      else if (r.reason === "duplicate") out.dormant_skipped++;
    }

    return out;
  },
);
