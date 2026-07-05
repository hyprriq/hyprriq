import type { TrackContext } from "@/lib/research/contracts";
import { normalizeName } from "@/lib/utils/normalize-name";

// H4 — THE research identity: who the tracks investigate. One shared pure function (the H3
// one-function-all-sites rule) used by track1/track2 QUERIES and PROMPTS, so "who are we
// researching" is decided exactly once and the entered name can never leak back in as the
// research subject through a forgotten call site.
//
// Confirmed resolution → resolved_name; the entered name rides as `alias` (alias-scoped evidence
// still counts, under the prompt guard). Unconfirmed/absent identity → entered name (SO-2: those
// cases already escalate to manual review; researching what the client typed aids the reviewer).
// `domain` = resolved_domain when present (the strongest identity signal we produce).
export interface ResearchIdentity {
  name: string;
  alias: string | null;
  domain: string | null;
}

// H4 — the ONE wording of the alias guard, shared by every track prompt: alias-scoped evidence
// counts only when it clearly refers to the same company. Never merged blindly.
export function aliasGuardLine(alias: string): string {
  return `The client entered this supplier as "${alias}". Treat evidence naming "${alias}" as this entity ONLY where it clearly refers to the same company (same domain, address, or registration) — never merge evidence about a different company that happens to share the name.`;
}

export function researchIdentityFor(ctx: TrackContext): ResearchIdentity {
  const entered = ctx.vendor_name ?? "";
  const si = ctx.supplier_identity;
  const domain = si?.resolved_domain ?? null;
  if (!si || si.identity_unconfirmed || !si.resolved_name) return { name: entered, alias: null, domain };
  const alias = entered && normalizeName(entered) !== normalizeName(si.resolved_name) ? entered : null;
  return { name: si.resolved_name, alias, domain };
}
