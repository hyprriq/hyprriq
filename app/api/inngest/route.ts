import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pipelineStart } from "@/lib/inngest/functions/pipeline";
import { pipelineWatchdog } from "@/lib/inngest/functions/watchdog";
import { outcomeCheckpoints } from "@/lib/inngest/functions/outcome-checkpoints";
import { degradedWritesWatchdog } from "@/lib/inngest/functions/degradedWrites";
import { stalledCaseAlarm } from "@/lib/inngest/functions/stalledCases";

// Inngest serve endpoint. The durable research pipeline (pipeline/run-case) runs here, outside
// the submit request, so it is not bound by the serverless 60s function cap.
//
// Vercel hands each deploy an EPHEMERAL URL (hyprriq-<hash>-…) and treats `main` as Production —
// so the auto-sync registered the wrong/stale deployment. Pin the stable branch origin instead:
// set INNGEST_SERVE_ORIGIN on the staging Vercel env to
// https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app so functions always register under a URL
// Inngest can reach on every deploy. Unset → falls back to Host-header inference (local/dev).
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineStart, pipelineWatchdog, outcomeCheckpoints, degradedWritesWatchdog, stalledCaseAlarm],
  serveOrigin: process.env.INNGEST_SERVE_ORIGIN,
  servePath: "/api/inngest",
});
