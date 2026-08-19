// ── DOUBT-FOCUS SHAPE PROBE (Module 9 composition defect, 2026-08-19) — READ-ONLY.
//
// WHY, AND WHY IT IS A PROBE RATHER THAN A FIX: this concatenation has now been diagnosed THREE
// times — "two fields joined with no separator" (wrong), "an unguarded connector expecting a list
// that rendered empty" (wrong, mine), and "a run-on inside the stored headline" (true but not the
// cause). The cause is `shapeSnapshot` in synthesisCallC.ts interpolating `doubt.doubt_focus` into
// NOUN-PHRASE SLOTS:
//
//   targeted : the_real_risk          = `The open question: ${focus}. …`
//   elevated : headline               = `… — subject to verification of ${focus}`
//   elevated : leading_interpretation = `… This reading rests on ${focus} holding.`
//   broad    : headline               = `Key items could not be verified (${focus}). …`
//
// Every one of those reads correctly ONLY if `focus` is a noun phrase ("the Chapter 11 resolution
// status"). Module 7 writes doubt_focus as PROSE, so on real cases it is a full sentence — often
// several — and the slot produces "This reading rests on The most concentrated doubt lands on …
// holding." FOUR SLOTS, THREE DOUBT LEVELS. I only ever saw one, on one case.
//
// This measures the WHOLE corpus so the fix is scoped to what is actually stored: how many cases
// sit at each doubt level, and for each, whether doubt_focus is a phrase or a sentence.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/doubt-focus-shape-probe.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

// A slot-safe focus is a NOUN PHRASE. The templates assume it can sit inside "verification of
// ___" and "rests on ___ holding".
//
// ⚠ THE FIRST VERSION OF THIS HEURISTIC COUNTED >14 WORDS AS A SENTENCE AND OVER-REPORTED. Two
// corpus cases (AWI-2608-032, -033) are LONG NOUN PHRASES — "Supply chain legitimacy and
// downstream marketplace risk for Sterilite products sourced through Four Seasons General
// Merchandise" — which are ugly in a slot but perfectly grammatical. Length is not the property
// that breaks the template; SENTENCE PUNCTUATION is. Reported both ways below rather than
// collapsing them, because "4 cases broken" and "2 cases broken, 2 merely long" are different
// facts and only one of them is a defect.
const isSentenceShaped = (s: string): boolean => /[.!?]/.test(s.trim());
const isLongPhrase = (s: string): boolean => !isSentenceShaped(s) && s.trim().split(/\s+/).length > 14;

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, plan_type, status, delivered_attempt")
    .is("deleted_at", null).order("created_at");

  const byLevel: Record<string, { total: number; sentenceShaped: number; longPhrase: number; samples: string[]; cases: string[] }> = {};
  let withDoubt = 0;

  for (const c of (cases ?? []) as { id: string; case_number: string; status: string; delivered_attempt: number | null }[]) {
    const { data: rows } = await supabaseAdmin
      .from("case_synthesis").select("doubt_calibration, attempt_number")
      .eq("case_id", c.id).order("attempt_number", { ascending: false }).limit(1);
    const s = rows?.[0];
    const dc = (s?.doubt_calibration ?? null) as { doubt_level?: string; doubt_focus?: string } | null;
    if (!dc?.doubt_level) continue;
    withDoubt++;
    const level = dc.doubt_level;
    byLevel[level] ??= { total: 0, sentenceShaped: 0, longPhrase: 0, samples: [], cases: [] };
    const b = byLevel[level];
    b.total++;
    b.cases.push(c.case_number);
    const focus = (dc.doubt_focus ?? "").trim();
    if (isSentenceShaped(focus)) {
      b.sentenceShaped++;
      if (b.samples.length < 4) b.samples.push(`${c.case_number} [SENTENCE — BREAKS THE SLOT]: «${focus.slice(0, 200)}»`);
    } else if (isLongPhrase(focus)) {
      b.longPhrase++;
      if (b.samples.length < 4) b.samples.push(`${c.case_number} [long phrase — grammatical, just ugly]: «${focus.slice(0, 200)}»`);
    } else if (b.samples.length < 4 && focus) {
      b.samples.push(`${c.case_number} [clean phrase]: «${focus.slice(0, 200)}»`);
    }
  }

  console.log(`DOUBT-FOCUS SHAPE PROBE — ${withDoubt} case(s) carrying a doubt calibration\n`);
  // Which slots each level actually uses — so the blast radius is stated, not guessed.
  const SLOTS: Record<string, string[]> = {
    minimal: [],
    targeted: ["the_real_risk"],
    elevated: ["headline", "leading_interpretation"],
    broad: ["headline"],
  };
  let affected = 0;
  for (const [level, b] of Object.entries(byLevel).sort()) {
    const slots = SLOTS[level] ?? ["(unknown level — check shapeSnapshot)"];
    const broken = slots.length > 0 ? b.sentenceShaped : 0;
    affected += broken;
    console.log(`▸ ${level} — ${b.total} case(s); interpolates into: ${slots.length ? slots.join(", ") : "(no slot — safe)"}`);
    console.log(`    SENTENCE-shaped (BREAKS the slot): ${b.sentenceShaped}/${b.total} → ${broken} broken · long-but-grammatical phrases: ${b.longPhrase}`);
    console.log(`    cases: ${b.cases.join(", ")}`);
    for (const s of b.samples) console.log(`      · ${s}`);
    console.log();
  }
  console.log(`── ${affected} case(s) across the corpus render a mangled slot today ──`);
  console.log(`A "minimal" case is safe by construction: it interpolates focus nowhere.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
