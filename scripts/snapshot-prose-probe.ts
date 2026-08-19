// ── SNAPSHOT PROSE PROBE (§3, 2026-08-19) — READ-ONLY.
//
// WHY: the concatenation defect ("…in the current evidence record. — subject to verification of"
// running into the risk text) must be traced to a NAMED FIELD before it is fixed — founder's
// instruction, and the only way to know whether the seam is in the ENGINE's stored string or in
// the RENDERER's composition. Those need opposite fixes and the screenshot cannot tell them apart.
//
// It prints each client-bound snapshot field SEPARATELY, with visible delimiters, so a run-on
// INSIDE one stored field is distinguishable from two fields joined at render.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/snapshot-prose-probe.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

const FIELDS = ["headline", "the_real_risk", "leading_interpretation"] as const;
// The connector the founder saw. If it lands at the END of a stored field, the engine emitted a
// dangling connector; if it only appears once fields are concatenated, the renderer joined them.
const DANGLING = /(?:—|-)\s*subject to verification(?:\s+of)?\s*$/i;
const MID_RUNON = /(?:—|-)\s*subject to verification\s+of\s+[A-Z]/;

async function main() {
  const { data } = await supabaseAdmin
    .from("cases").select("id, case_number, plan_type, status, delivered_attempt")
    .in("status", ["delivered", "complete"]).is("deleted_at", null).order("delivered_at");

  let checked = 0, dangling = 0, runon = 0;
  for (const c of (data ?? []) as { id: string; case_number: string; plan_type: string | null; status: string; delivered_attempt: number | null }[]) {
    const { data: s } = await supabaseAdmin
      .from("case_synthesis").select("decision_snapshot, attempt_number")
      .eq("case_id", c.id).eq("attempt_number", c.delivered_attempt ?? 1).maybeSingle();
    const snap = (s?.decision_snapshot ?? null) as Record<string, unknown> | null;
    if (!snap) continue;
    checked++;
    const flags: string[] = [];
    for (const f of FIELDS) {
      const v = typeof snap[f] === "string" ? (snap[f] as string) : "";
      if (!v) continue;
      if (DANGLING.test(v)) { flags.push(`${f}: ENDS on a dangling connector`); dangling++; }
      if (MID_RUNON.test(v)) { flags.push(`${f}: RUN-ON inside the stored field`); runon++; }
    }
    if (!flags.length) continue;
    console.log(`\n${c.case_number} (${c.plan_type})  — ${flags.join(" · ")}`);
    for (const f of FIELDS) {
      const v = typeof snap[f] === "string" ? (snap[f] as string) : "";
      console.log(`  [${f}] «${v.slice(0, 300)}»`);
    }
  }
  console.log(`\n${checked} delivered snapshot(s) checked · ${dangling} field(s) ending on a dangling connector · ${runon} run-on(s) INSIDE a stored field`);
  console.log(`A run-on INSIDE a stored field = the ENGINE emitted it. Zero of those, with a dangling`);
  console.log(`connector present, = the RENDERER joined two fields. Fix the one the data names.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
