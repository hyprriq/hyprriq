import { inngest } from "@/lib/inngest/client";
import { recordHeartbeat } from "@/lib/inngest/heartbeat";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendDormantNoticeEmail, sendRetentionWarningEmail } from "@/lib/email/notify";
import { SITE_URL } from "@/lib/constants/site";

// ── RETENTION SWEEP (founder-ruled 2026-08-21; deletion policy RULED same day — the legal pages
// promise deletion; this is the machinery that makes the promise true) ───────────────────────
//
// ⛔ OFF BY DEFAULT: this function deletes client data, so it runs ONLY when the founder sets
// RETENTION_SWEEP_ENABLED=1 — turning deletion on is a deliberate act, never a deploy side
// effect. DELETION IS PERMANENT (ruled): the storage object is removed with no recovery.
//
// THE WARNING IS THE GATE, NOT A COURTESY (ruled: "an unannounced first deletion run is the
// worst possible introduction to the feature"):
//   Phase 1 — WARN: files whose delete_after falls within the next 30 days (or is already past,
//   e.g. on first activation) get ONE email per client per expiry month
//   (dedup retention_warning:{client_id}:{YYYY-MM}) telling them what will be removed and when.
//   Phase 2 — DELETE: a file is removed ONLY when (a) its delete_after has passed, AND
//   (b) its client's warning for that expiry month has been ON RECORD ≥30 DAYS (the email_log
//   row's sent_at is the clock), AND (c) its case has a FROZEN documentation_review Evidence
//   Pack — the pack carries the extracted content, so findings, reports and REJUDGE all survive
//   the source-document deletion. No pack → the file is the only copy of what scoring saw →
//   SKIP + audit (founder-ruled: a rejudge silently producing a different verdict months later
//   is exactly the class of defect nobody would ever trace).
// A failed storage removal SKIPS the deleted_at stamp so tomorrow retries — never a stamped row
// with a live object. Every deletion audits.
//
// DORMANT ONE-TIME ACCOUNTS: 24 months of no activity → ONE notice ever
// (dedup dormant_24m:{client_id}); founder/operator roles never nagged. Closure after the
// 30-day window stays a deliberate founder step until closure machinery ships.

const DORMANT_MONTHS = 24;
const WARNING_DAYS = 30;

const monthKeyOf = (iso: string) => iso.slice(0, 7); // YYYY-MM of delete_after
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export const retentionSweep = inngest.createFunction(
  { id: "retention-sweep", name: "Retention sweep (warn → delete source documents + dormant notices)", retries: 1, triggers: [{ cron: "0 3 * * *" }] },
  async () => {
    if (process.env.RETENTION_SWEEP_ENABLED !== "1") return { disabled: true };

    const now = Date.now();
    const out = {
      warnings_sent: 0, warnings_skipped: 0,
      files_deleted: 0, files_failed: 0, files_awaiting_warning_age: 0, files_skipped_no_frozen_pack: 0,
      dormant_notices: 0, dormant_skipped: 0,
    };

    // ── The warning ledger: dedup_key → earliest sent_at (the gate clock). ──
    const { data: warnRows, error: wErr } = await supabaseAdmin
      .from("email_log").select("dedup_key, sent_at")
      .eq("template", "retention_warning").is("deleted_at", null);
    if (wErr) throw new Error(`retention-sweep: warning ledger read failed: ${wErr.message}`);
    const warnedAt = new Map<string, number>();
    for (const w of warnRows ?? []) {
      const t = new Date(w.sent_at as string).getTime();
      const k = w.dedup_key as string;
      if (!warnedAt.has(k) || t < (warnedAt.get(k) as number)) warnedAt.set(k, t);
    }

    // ── Phase 1 — WARN: everything due within the window (or overdue and never warned). ──
    const horizon = new Date(now + WARNING_DAYS * 86_400_000).toISOString();
    const { data: upcoming, error: uErr } = await supabaseAdmin
      .from("uploaded_files")
      .select("id, client_id, file_name, delete_after")
      .lte("delete_after", horizon)
      .is("deleted_at", null)
      .limit(1000);
    if (uErr) throw new Error(`retention-sweep: upcoming read failed: ${uErr.message}`);

    const groups = new Map<string, { clientId: string; monthKey: string; files: string[]; earliest: number }>();
    for (const f of upcoming ?? []) {
      const monthKey = monthKeyOf(f.delete_after as string);
      const key = `retention_warning:${f.client_id}:${monthKey}`;
      if (warnedAt.has(key)) continue; // this client × month is already warned
      const g = groups.get(key) ?? { clientId: f.client_id as string, monthKey, files: [], earliest: Infinity };
      g.files.push(f.file_name as string);
      g.earliest = Math.min(g.earliest, new Date(f.delete_after as string).getTime());
      groups.set(key, g);
    }
    if (groups.size > 0) {
      const clientIds = [...new Set([...groups.values()].map((g) => g.clientId))];
      const { data: clients } = await supabaseAdmin
        .from("clients").select("id, email, full_name").in("id", clientIds);
      const clientById = new Map((clients ?? []).map((c) => [c.id as string, c]));
      for (const g of groups.values()) {
        const c = clientById.get(g.clientId);
        // The date the removal actually becomes possible: the later of the file's own due date
        // and warning + 30 days (an overdue file found on first activation still gets 30 days).
        const deletionDate = fmtDate(new Date(Math.max(g.earliest, now + WARNING_DAYS * 86_400_000)));
        const r = await sendRetentionWarningEmail({
          to: (c?.email as string | null) ?? null, name: (c?.full_name as string | null) ?? null,
          clientId: g.clientId, monthKey: g.monthKey, fileNames: g.files, deletionDate,
          portalUrl: `${SITE_URL}/portal`,
        });
        if (r.sent) out.warnings_sent++;
        else out.warnings_skipped++;
      }
    }

    // ── Phase 2 — DELETE: due + warned ≥30 days + frozen pack exists. ──
    const { data: due, error } = await supabaseAdmin
      .from("uploaded_files")
      .select("id, storage_path, file_name, client_id, case_id, delete_after")
      .lte("delete_after", new Date(now).toISOString())
      .is("deleted_at", null)
      .limit(500);
    if (error) throw new Error(`retention-sweep: uploaded_files read failed: ${error.message}`);

    const dueCaseIds = [...new Set((due ?? []).map((f) => f.case_id as string | null).filter((x): x is string => !!x))];
    const frozenCases = new Set<string>();
    if (dueCaseIds.length > 0) {
      const { data: packs } = await supabaseAdmin
        .from("case_evidence_packs").select("case_id")
        .eq("track_key", "documentation_review").in("case_id", dueCaseIds).is("deleted_at", null);
      for (const p of packs ?? []) frozenCases.add(p.case_id as string);
    }

    for (const f of due ?? []) {
      const warnKey = `retention_warning:${f.client_id}:${monthKeyOf(f.delete_after as string)}`;
      const warnedSince = warnedAt.get(warnKey);
      if (warnedSince === undefined || now - warnedSince < WARNING_DAYS * 86_400_000) {
        out.files_awaiting_warning_age++; // warned this run or too recently — the 30-day clock runs
        continue;
      }
      if (!f.case_id || !frozenCases.has(f.case_id as string)) {
        out.files_skipped_no_frozen_pack++;
        try {
          await supabaseAdmin.from("audit_log").insert({
            table_name: "uploaded_files", record_id: f.id, action: "UPDATE",
            actor_id: "system", actor_type: "system",
            new_value: { retention_skip: "no_frozen_pack", storage_path: f.storage_path, case_id: f.case_id },
          });
        } catch { /* reporter never blocks */ }
        continue;
      }
      const { error: rmErr } = await supabaseAdmin.storage.from("case-documents").remove([f.storage_path as string]);
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
          new_value: { retention_deletion: true, storage_path: f.storage_path, file_name: f.file_name, client_id: f.client_id, case_id: f.case_id, delete_after: f.delete_after, warned_at: new Date(warnedSince).toISOString() },
        });
      } catch { /* the audit reporter never blocks the sweep */ }
    }

    // ── Phase 3 — dormant one-time accounts → the single 24-month notice. ──
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

    await recordHeartbeat("retention-sweep", `${out.warnings_sent} warned, ${out.files_deleted} deleted, ${out.dormant_notices} dormancy notice(s)`);
    return out;
  },
);
