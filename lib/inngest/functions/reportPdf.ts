import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { renderCaseReportPdf, ReportNotRenderable } from "@/lib/pdf/renderReportPdf";
import { reportObjectKey, reportExists, storeReportPdf, downloadReportPdf } from "@/lib/pdf/reportStorage";
import { sendDeliveryNotification, sendAdminAlert } from "@/lib/email/notify";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";

// ── REPORT PDF RENDER (§4, founder-ruled 2026-08-19) ────────────────────────────────────────
//
// WHY IT RUNS HERE AND NOT IN THE REQUEST — founder's ruling, recorded because the alternatives
// look cheaper than they are: bundling Chromium into a serverless function is a ~50MB layer, cold
// starts measured in seconds, and a browser launch inside a paying user's request; a hosted render
// API means a THIRD PARTY SEES FULL CLIENT REPORT CONTENT, which is a privacy decision a PDF does
// not get to make. Inngest already runs this class of work.
//
// ⛔ PUBLISH IS NEVER BLOCKED, DELAYED OR ROLLED BACK BY THIS FUNCTION. The case is already
// delivered before the event is sent. A render failure alarms; it never touches case state.
//
// ── THE RULED EMAIL SEQUENCING (a) ──
// publish completes immediately → this job renders → THE DELIVERY EMAIL SENDS FROM HERE, with the
// PDF attached. If the render fails permanently after retries, the email goes WITHOUT it and the
// client is told the report is in their portal. That is why the email moved out of the publish
// route: sending it there would either block publish on a render or send a "your report is ready"
// with no attachment while the attachment was still coming.
//
// The object key is the idempotency token: Chromium never runs twice for the same delivered
// attempt, because the immutable object already being there IS the success condition.

import { REPORT_PDF_EVENT, type ReportPdfEvent } from "@/lib/inngest/events";
export { REPORT_PDF_EVENT };

// Mirrors the pipeline function's local step type (the real step.run returns Promise<Jsonify<T>>).
interface InngestStep { run<T>(id: string, fn: () => T | Promise<T>): Promise<T> }

/**
 * PURE — should this case get a client email at all? Kept testable and out of the step body.
 *
 * ── AN EMAIL NEVER ANNOUNCES A REPORT THE CLIENT CANNOT READ (founder-authorised 2026-08-22).
 * The delivery email says "your report is ready — view it in your portal". That is TRUE when the
 * PDF is missing but the portal page renders (no_client_name: the page has its verdict and
 * findings; no_snapshot: the page still renders the verdict and per-area findings). It is FALSE
 * for `no_verdict`, where the portal page REFUSES — the client would open the link and find the
 * holding-back panel. So the render's refusal reason is an input to this decision, and the one
 * reason that makes the sentence a lie suppresses the send. The ops alert still fires either
 * way; silence toward the founder is never the trade.
 */
const REASONS_CLIENT_CANNOT_READ = ["no_verdict"] as const;

export function shouldEmailClient(
  clientId: string | null,
  email: string | null,
  renderFailureReason?: string | null,
): { send: boolean; reason?: string } {
  if (clientId === OPERATOR_HOUSE_CLIENT_ID) return { send: false, reason: "skipped:operator_house" };
  if (!email) return { send: false, reason: "skipped:no_recipient" };
  // The reason arrives prefixed ("no_verdict: case AWI-… is delivered but carries no…").
  const blocked = REASONS_CLIENT_CANNOT_READ.find((r) => (renderFailureReason ?? "").startsWith(r));
  if (blocked) return { send: false, reason: `skipped:${blocked}_unreadable` };
  return { send: true };
}

export const reportPdfRender = inngest.createFunction(
  {
    id: "report-pdf-render",
    name: "Render + store the delivered report PDF, then send the delivery email",
    // Chromium is heavy; one at a time per case, and a small global ceiling so a batch of
    // publishes cannot starve the pipeline function of workers.
    concurrency: { limit: 2 },
    retries: 3,
    triggers: [{ event: REPORT_PDF_EVENT }],
  },
  async ({ event, step }: { event: { data: ReportPdfEvent }; step: InngestStep }) => {
    const { case_id, attempt, origin } = event.data as ReportPdfEvent;

    const caseRow = await step.run("load-case", async () => {
      const { data } = await supabaseAdmin
        .from("cases")
        .select("id, case_number, client_id, status, delivered_attempt, vendor_name, clients(email)")
        .eq("id", case_id)
        .maybeSingle();
      return (data ?? null) as unknown as {
        id: string; case_number: string; client_id: string | null; status: string;
        delivered_attempt: number | null; vendor_name: string | null;
        clients: { email: string | null } | null;
      } | null;
    });

    if (!caseRow) return { ok: false, reason: "case_not_found" };
    if (caseRow.status !== "delivered" && caseRow.status !== "complete") {
      // Not an error: a re-run can enqueue against a case that has since moved.
      return { ok: false, reason: `not_delivered (${caseRow.status})` };
    }
    if (!caseRow.client_id) return { ok: false, reason: "no_client" };

    const key = reportObjectKey(caseRow.client_id, caseRow.case_number, attempt);

    // ── RENDER + STORE. Idempotent by the immutable key: a retry that finds the object already
    // there is a SUCCESS. Chromium never runs twice for the same delivered attempt.
    const render = await step.run("render-and-store", async () => {
      if (await reportExists(key)) return { ok: true as const, key, skipped: "already_stored" };
      try {
        const { pdf } = await renderCaseReportPdf({ case: case_id });
        const stored = await storeReportPdf(key, pdf);
        if (!stored.stored && stored.reason !== "already_exists") {
          throw new Error(`storage write failed: ${stored.reason}`);
        }
        return { ok: true as const, key };
      } catch (e) {
        // ReportNotRenderable is a STATE, not a transient fault — retrying cannot fix a missing
        // client name or a missing snapshot, so it is reported rather than thrown into retries.
        if (e instanceof ReportNotRenderable) return { ok: false as const, key, permanent: true, reason: `${e.reason}: ${e.message}` };
        throw e; // transient (Chromium, network, storage) → Inngest retries
      }
    });

    // ⚠ NO report_pdf_key COLUMN, DELIBERATELY — AND THAT IS WHY THERE IS NO MIGRATION HERE.
    // The key is PURE and derivable from data already on the row (client_id + case_number +
    // delivered_attempt), so the render job, the download route and any audit derive it
    // independently. Storing it would add a column that can drift from the object that actually
    // exists, and would have made this a founder-run prod action for no gain.
    if (!render.ok) {
      await step.run("alarm", async () => {
        // LOUD. A silent PDF failure looks exactly like a working system with a quiet client.
        await supabaseAdmin.from("audit_log").insert({
          table_name: "cases", record_id: case_id, action: "UPDATE", actor_type: "system",
          new_value: { report_pdf: "render_failed", attempt, reason: render.reason },
        });
        await sendAdminAlert(
          `Report PDF render failed — ${caseRow.case_number}`,
          `<p>The delivered report for <b>${caseRow.case_number}</b> (attempt ${attempt}) could not be rendered.</p>
<p><b>Reason:</b> ${render.reason}</p>
${shouldEmailClient(caseRow.client_id, caseRow.clients?.email ?? null, render.reason).send
  ? `<p>The delivery email is being sent WITHOUT the attachment; the client can read the report in their portal. The case is delivered and unaffected.</p>`
  : `<p><b>NO delivery email is being sent.</b> The portal page cannot render this report either, so an email announcing it would be a false promise. The client has NOT been told the report is ready — decide what they are told, and fix the upstream cause first.</p>`}`,
        );
      });
    }

    // ── THE DELIVERY EMAIL. Sent whether or not the render succeeded — with the attachment when
    // it is there, without it when it is not. Non-fatal like every notify path: delivery already
    // happened, and a mail failure must never look like a delivery failure.
    const emailed = await step.run("send-delivery-email", async () => {
      const gate = shouldEmailClient(caseRow.client_id, caseRow.clients?.email ?? null, render.ok ? null : render.reason);
      if (!gate.send) return { sent: false, reason: gate.reason };
      const attachment = render.ok ? await downloadReportPdf(key) : null;
      const res = await sendDeliveryNotification({
        to: caseRow.clients?.email ?? null,
        caseNumber: caseRow.case_number,
        vendorName: caseRow.vendor_name,
        caseUrl: `${origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/cases/${case_id}`,
        attachment: attachment
          ? { filename: `${caseRow.case_number}-report.pdf`, content: attachment }
          : null,
      });
      return { sent: res.sent, reason: res.reason, attached: !!attachment };
    });

    await step.run("audit", async () => {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "cases", record_id: case_id, action: "UPDATE", actor_type: "system",
        new_value: { report_pdf: render.ok ? "stored" : "failed", key, attempt, email: emailed },
      });
    });

    return { ok: render.ok, key, email: emailed };
  },
);
