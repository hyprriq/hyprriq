import type { TrackContext } from "@/lib/research/contracts";

// New Intelligence-OS pipeline (Layers 1→5). NOT wired into submit/Inngest yet — Stage 2 wires
// the stub data flow (submit → tracks → normalize → synthesis → judgment → report-ready,
// autonomously, no human gate). This will replace the G1 synchronous orchestrator once the
// skeleton flow is proven. Stage-1 scaffold: signature + intent only.
export function runPipeline(ctx: TrackContext): Promise<void> {
  return Promise.reject(new Error(`runPipeline not wired yet (Stage 2) — case ${ctx.case_id}`));
}
