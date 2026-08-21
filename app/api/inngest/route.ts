import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pipelineStart } from "@/lib/inngest/functions/pipeline";
import { pipelineWatchdog } from "@/lib/inngest/functions/watchdog";
import { outcomeCheckpoints } from "@/lib/inngest/functions/outcome-checkpoints";
import { degradedWritesWatchdog } from "@/lib/inngest/functions/degradedWrites";
import { stalledCaseAlarm } from "@/lib/inngest/functions/stalledCases";
import { reportPdfRender } from "@/lib/inngest/functions/reportPdf";
import { emailReminders } from "@/lib/inngest/functions/emailReminders";

// Inngest serve endpoint. The durable research pipeline (pipeline/run-case) runs here, outside
// the submit request, so it is not bound by the serverless 60s function cap.
//
// Vercel hands each deploy an EPHEMERAL URL (hyprriq-<hash>-…) and treats `main` as Production —
// so the auto-sync registered the wrong/stale deployment. Pin the stable branch origin instead:
// set INNGEST_SERVE_ORIGIN on the staging Vercel env to
// https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app so functions always register under a URL
// Inngest can reach on every deploy. Unset → falls back to Host-header inference (local/dev).
// §4 — the PDF render step launches Chromium inside this function's invocation. The platform
// default duration cap is far below a cold Chromium boot + render; 300s covers the worst step.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineStart, pipelineWatchdog, outcomeCheckpoints, degradedWritesWatchdog, stalledCaseAlarm, reportPdfRender, emailReminders],
  serveOrigin: process.env.INNGEST_SERVE_ORIGIN,
  servePath: "/api/inngest",
});
