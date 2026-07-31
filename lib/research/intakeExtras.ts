// ── Intake extras that ride TrackContext WITHOUT touching the frozen contracts.ts ──
//
// WHY THIS FILE EXISTS: TrackContext lives in lib/research/contracts.ts, which is a FROZEN
// surface (byte-identical by standing law). The ASIN intake (tracker §1.3) must thread the
// per-brand ASINs to where Keepa will consume them, so the field is declared HERE as an
// additive intersection instead of editing the frozen interface.
//
// HOW THE VALUE TRAVELS: every enqueue site sends the Inngest payload typed as
// TrackContextWithIntake; pipelineHandler spreads `...event.data` into ctx (pipeline.ts),
// so brand_asins rides through at RUNTIME even though downstream code typed against plain
// TrackContext doesn't see it. Keepa (unbuilt) reads it by typing its context parameter as
// TrackContextWithIntake — no contracts.ts change now or then.
//
// SHAPE: { [brand]: ASIN } — one ASIN per brand (guard: lib/portal/asinIntake.ts).
// null/absent = the client provided none (entry tiers never collect it).

import type { TrackContext } from "@/lib/research/contracts";

export interface IntakeExtras {
  brand_asins?: Record<string, string> | null;
}

export type TrackContextWithIntake = TrackContext & IntakeExtras;
