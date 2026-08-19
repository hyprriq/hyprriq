// ── TRACK 6 SURFACE PROBE (§2, 2026-08-19) — READ-ONLY, zero API cost.
//
// WHY: §2 builds a CLIENT-FACING component, and a component designed from one case is the defect
// the founder has now made a standing rule. Before writing the projector branch or the block, this
// answers the questions the component's correctness actually depends on, ACROSS THE WHOLE CORPUS:
//
//   · which PLAN TIERS carry a track_6 row at all (the component must be right on the tiers that
//     have none — $99 and Growth — not only on the ones that do)
//   · how many AREAS each case actually renders, and how many of those VOTE (the "6 assessment
//     areas" header bug: the count must derive from voting areas only)
//   · the real SHAPE of category_compliance — brands with no categories, categories with no flags,
//     could_not_determine, missing brand_category_note. Every one of those is an empty state the
//     component has to survive, and none of them is visible in a case that happens to be populated.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/track6-surface-probe.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

type Row = {
  track_key: string; track_number: number; compiled_findings_json: Record<string, unknown> | null;
  attempt_number: number | null; track_verdict_signal: string | null;
};

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, plan_type, status, delivered_attempt, brands_submitted")
    .is("deleted_at", null)
    .order("created_at");

  const byTier: Record<string, { total: number; withT6: number; cases: string[] }> = {};
  const areaCounts: Record<string, number> = {};
  const nonVoting: Record<string, number> = {};
  const shapes = {
    brandsWithNoCategories: 0, categoriesWithNoFlags: 0, missingBrandNote: 0,
    couldNotDetermine: 0, riskLevels: {} as Record<string, number>, perBrandCounts: {} as Record<number, number>,
  };
  let t6Rows = 0;

  for (const c of (cases ?? []) as { id: string; case_number: string; plan_type: string | null; status: string; delivered_attempt: number | null; brands_submitted: string[] | null }[]) {
    const tier = c.plan_type ?? "(none)";
    byTier[tier] ??= { total: 0, withT6: 0, cases: [] };
    byTier[tier].total++;

    const { data } = await supabaseAdmin
      .from("case_track_results")
      .select("track_key, track_number, compiled_findings_json, attempt_number, track_verdict_signal")
      .eq("case_id", c.id).gte("track_number", 1).is("deleted_at", null);
    const rows = (data as Row[]) ?? [];
    if (!rows.length) continue;
    const chosen = c.delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const mine = rows.filter((r) => (r.attempt_number ?? 1) === chosen);

    // THE HEADER BUG, MEASURED: total rows rendered vs rows that actually VOTE. Track 6 is
    // advisory (`non_voting: true`, signal "n_a"), so a count of ROWS overstates the areas sold.
    const voting = mine.filter((r) => (r.compiled_findings_json as { non_voting?: boolean } | null)?.non_voting !== true);
    areaCounts[`${tier}: ${voting.length} voting / ${mine.length} rows`] =
      (areaCounts[`${tier}: ${voting.length} voting / ${mine.length} rows`] ?? 0) + 1;

    for (const r of mine) {
      const j = r.compiled_findings_json as { non_voting?: boolean; signal?: string } | null;
      if (j?.non_voting === true || j?.signal === "n_a") nonVoting[`${r.track_key} (non_voting=${j?.non_voting === true}, signal=${j?.signal ?? "-"})`] = (nonVoting[`${r.track_key} (non_voting=${j?.non_voting === true}, signal=${j?.signal ?? "-"})`] ?? 0) + 1;
    }
    const t6 = mine.find((r) => r.track_key === "category_compliance");
    if (!t6) continue;
    byTier[tier].withT6++;
    byTier[tier].cases.push(c.case_number);
    t6Rows++;

    const cc = (t6.compiled_findings_json as { category_compliance?: unknown } | null)?.category_compliance as
      | { per_brand?: { brand?: string; categories_found?: { flags?: { risk_level?: string }[] }[]; brand_category_note?: string | null }[]; category_verdict?: string }
      | undefined;
    if (!cc) continue;
    if (cc.category_verdict === "could_not_determine") shapes.couldNotDetermine++;
    const pb = cc.per_brand ?? [];
    shapes.perBrandCounts[pb.length] = (shapes.perBrandCounts[pb.length] ?? 0) + 1;
    for (const b of pb) {
      const cats = b.categories_found ?? [];
      if (cats.length === 0) shapes.brandsWithNoCategories++;
      if (!b.brand_category_note) shapes.missingBrandNote++;
      for (const cat of cats) {
        const flags = cat.flags ?? [];
        if (flags.length === 0) shapes.categoriesWithNoFlags++;
        for (const f of flags) {
          const rl = f.risk_level ?? "(none)";
          shapes.riskLevels[rl] = (shapes.riskLevels[rl] ?? 0) + 1;
        }
      }
    }
  }

  console.log("TRACK 6 SURFACE PROBE\n");
  console.log("── WHICH TRACK KEYS ARE NON-VOTING (the count must derive from VOTING areas only) ──");
  for (const [k, n] of Object.entries(nonVoting).sort()) console.log(`  ${String(n).padStart(3)} row(s)  ${k}`);
  console.log();
  console.log("── WHICH TIERS CARRY A TRACK 6 ROW (the component must be right where there is none) ──");
  for (const [tier, d] of Object.entries(byTier)) {
    console.log(`  ${tier.padEnd(14)} ${String(d.withT6).padStart(3)}/${String(d.total).padEnd(3)} cases with track_6${d.cases.length ? `  → ${d.cases.join(", ")}` : ""}`);
  }
  console.log(`\n── AREA COUNTS PER CASE — voting vs rows (the "6 assessment areas" header bug) ──`);
  for (const [k, n] of Object.entries(areaCounts).sort()) console.log(`  ${String(n).padStart(3)} case(s)  ${k}`);

  console.log(`\n── EMPTY STATES THE COMPONENT MUST SURVIVE (${t6Rows} track_6 row(s)) ──`);
  console.log(`  brands with NO categories_found : ${shapes.brandsWithNoCategories}`);
  console.log(`  categories with NO flags        : ${shapes.categoriesWithNoFlags}`);
  console.log(`  brands with NO brand_category_note: ${shapes.missingBrandNote}`);
  console.log(`  cases with could_not_determine  : ${shapes.couldNotDetermine}`);
  console.log(`  per_brand counts                : ${JSON.stringify(shapes.perBrandCounts)}`);
  console.log(`  risk_level distribution         : ${JSON.stringify(shapes.riskLevels)}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
