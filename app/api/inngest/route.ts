import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pipelineStart } from "@/lib/inngest/functions/pipeline";

// Inngest serve endpoint. The durable research pipeline (pipeline/run-case) runs here, outside
// the submit request, so it is not bound by the serverless 60s function cap.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineStart],
});
