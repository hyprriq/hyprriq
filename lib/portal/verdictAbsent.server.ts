import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";

// ── THE LOUD SIDE OF ABSENCE (founder-locked 2026-08-22, item 5): if a delivered case reaches
// a render surface without a verdict, an invariant broke UPSTREAM and the founder needs to know
// immediately — silence is how the ?? 0 survived. Three channels, all fail-soft (the reporter
// never blocks the refusal that is already happening):
//   console.error  — the immediate log line
//   audit_log      — the queryable record:
//                      select created_at, new_value from audit_log
//                       where new_value->>'verdict_absent_at_render' = 'true';
//   sendAdminAlert — the existing ops pager (key-safe no-op when email isn't configured)

export async function logVerdictAbsent(opts: { caseRef: string; surface: string; raw: string | null | undefined }): Promise<void> {
  const rawShown = opts.raw === undefined ? "undefined" : JSON.stringify(opts.raw);
  console.error(
    `[verdict-absent] case ${opts.caseRef} reached ${opts.surface} without a verdict (column held ${rawShown}) — ` +
    `REFUSING to render; an upstream invariant is broken (delivery requires a verdict)`,
  );
  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: null, action: "UPDATE",
      actor_id: "system", actor_type: "system",
      new_value: { verdict_absent_at_render: true, case_ref: opts.caseRef, surface: opts.surface, raw: opts.raw ?? null },
    });
  } catch (e) {
    console.error(`[verdict-absent] audit write failed while recording the refusal itself: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    await sendAdminAlert(
      `Verdict absent at render — case ${opts.caseRef}`,
      `<p>Case <b>${opts.caseRef}</b> reached the <b>${opts.surface}</b> surface with no usable verdict (column held ${rawShown}).</p>
<p>The surface REFUSED to render — nothing was fabricated and nothing verdict-shaped reached the client. This should be impossible while the publish gate requires a verdict, so an upstream invariant is broken: investigate the case row and the delivery path before anything else ships.</p>`,
    );
  } catch (e) {
    console.error(`[verdict-absent] ops alert failed (refusal already stands): ${e instanceof Error ? e.message : String(e)}`);
  }
}
