// ── TRACK-PROSE CLASS CENSUS (engine-prose pass scoping, 2026-08-19) — READ-ONLY, zero API cost.
//
// WHY THIS EXISTS RATHER THAN REUSING MY LAST ANSWER: I reported TWO classes from the Class 4
// commit (corroboration vocabulary, weight_key) because those were the two the diff surfaced.
// Scoping an engine-prose pass from the classes I happened to mention is the same failure as
// designing a cleaner from one case. This enumerates EVERY blocking label in track prose, with
// per-label case counts and real sentences, so the prompt work is scoped from the corpus.
//
// IT SEPARATES THE TWO SCANNERS ON PURPOSE. Both block, but they need DIFFERENT remedies:
//   · LANGUAGE labels have been blocking track prose all along — they are not new, and a case
//     blocked on them was already blocked before Class 4 landed.
//   · DERIVATION labels are the ones Class 4 newly surfaced. These are what took the census from
//     8/39 to 17/39, and these are what the prose pass has to retire to bring it back down.
// Reading them as one number is what makes a rise look like a regression.
//
// SURFACE: the ALLOWLIST projection of each track row — what actually crosses to a client, which
// is also what the derivation scanner reads. Internal machinery is excluded by construction.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/track-prose-class-census.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scanHard } from "@/lib/utils/banned-language";
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import { projectFindingJsonForClient } from "@/lib/portal/clientReport";

const SENT = /(?<=[.!?])\s+/;
type Tier = "LANGUAGE (blocking before Class 4)" | "DERIVATION (surfaced by Class 4)";

interface Bucket { cases: Set<string>; occurrences: number; samples: { case: string; path: string; text: string }[] }
const mk = (): Bucket => ({ cases: new Set(), occurrences: 0, samples: [] });

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, plan_type, status, delivered_attempt")
    .is("deleted_at", null).order("created_at");

  const agg: Record<Tier, Record<string, Bucket>> = {
    "LANGUAGE (blocking before Class 4)": {},
    "DERIVATION (surfaced by Class 4)": {},
  };
  const blockedBy: Record<Tier, Set<string>> = {
    "LANGUAGE (blocking before Class 4)": new Set(),
    "DERIVATION (surfaced by Class 4)": new Set(),
  };
  let scanned = 0;

  for (const c of (cases ?? []) as { id: string; case_number: string; plan_type: string | null; delivered_attempt: number | null }[]) {
    const { data } = await supabaseAdmin
      .from("case_track_results")
      .select("track_key, compiled_findings_json, questions_to_ask, attempt_number")
      .eq("case_id", c.id).gte("track_number", 1).is("deleted_at", null);
    const rows = data ?? [];
    if (!rows.length) continue;
    const chosen = c.delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const mine = rows.filter((r) => (r.attempt_number ?? 1) === chosen);
    if (!mine.length) continue;
    scanned++;

    for (const r of mine) {
      const projected = r.compiled_findings_json
        ? projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key)
        : {};
      const surface: Record<string, unknown> = { [r.track_key]: projected, [`${r.track_key} (questions)`]: r.questions_to_ask ?? null };

      // Walk to STRINGS so every label can be anchored to the sentence that produced it — a label
      // with no sentence is what left AWI-2608-034 held with no actionable diagnosis.
      const strings: { path: string; value: string }[] = [];
      const walk = (v: unknown, path: string) => {
        if (typeof v === "string") strings.push({ path, value: v });
        else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
        else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      };
      walk(surface, "");

      for (const { path, value } of strings) {
        for (const sentence of value.split(SENT)) {
          const record = (tier: Tier, label: string) => {
            agg[tier][label] ??= mk();
            const b = agg[tier][label];
            b.cases.add(c.case_number);
            b.occurrences++;
            blockedBy[tier].add(c.case_number);
            if (b.samples.length < 4 && !b.samples.some((s) => s.text === sentence.trim())) {
              b.samples.push({ case: c.case_number, path: path.replace(/^\./, ""), text: sentence.trim().slice(0, 260) });
            }
          };
          for (const label of scanHard(sentence)) record("LANGUAGE (blocking before Class 4)", label);
          for (const v of scanForMethodLeakage({ _: sentence })) {
            record("DERIVATION (surfaced by Class 4)", /^_: (.+?) \(/.exec(v)?.[1] ?? v);
          }
        }
      }
    }
  }

  console.log(`TRACK-PROSE CLASS CENSUS — ${scanned} case(s), allowlisted client-facing track fields only\n`);
  for (const tier of Object.keys(agg) as Tier[]) {
    const labels = Object.entries(agg[tier]).sort((a, z) => z[1].cases.size - a[1].cases.size);
    console.log(`\n══ ${tier} — ${blockedBy[tier].size} case(s) blocked by this tier ══`);
    if (!labels.length) { console.log("   (none)"); continue; }
    for (const [label, b] of labels) {
      console.log(`\n  ▸ ${label} — ${b.cases.size} case(s), ${b.occurrences} occurrence(s)`);
      console.log(`    cases: ${[...b.cases].join(", ")}`);
      for (const s of b.samples) console.log(`      · [${s.case} ${s.path}] ${s.text}`);
    }
  }
  const both = [...blockedBy["DERIVATION (surfaced by Class 4)"]].filter((x) => blockedBy["LANGUAGE (blocking before Class 4)"].has(x));
  console.log(`\n\n── WHAT A PROSE PASS WOULD ACTUALLY BUY ──`);
  console.log(`  blocked by DERIVATION only (retiring these UNBLOCKS the case): ${[...blockedBy["DERIVATION (surfaced by Class 4)"]].filter((x) => !blockedBy["LANGUAGE (blocking before Class 4)"].has(x)).length}`);
  console.log(`  blocked by BOTH tiers (still blocked after a derivation-only pass): ${both.length}`);
  console.log(`  blocked by LANGUAGE only: ${[...blockedBy["LANGUAGE (blocking before Class 4)"]].filter((x) => !blockedBy["DERIVATION (surfaced by Class 4)"].has(x)).length}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
