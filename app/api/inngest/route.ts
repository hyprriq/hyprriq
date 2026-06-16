import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// Inngest serve endpoint. The functions array is empty in Session 1 — the
// pipeline is wired up, but the research workflow functions are added in
// Session 4.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});
