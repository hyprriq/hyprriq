import { Inngest } from "inngest";

// Inngest client — the async job queue that runs the research pipeline
// outside the Vercel request/response cycle (avoids the serverless timeout).
// Research functions are registered in Session 4.
export const inngest = new Inngest({
  id: "hyprriq",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
