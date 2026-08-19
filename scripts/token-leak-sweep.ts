// ── TOKEN-LEAK SWEEP (§1, founder-ruled 2026-08-18) — READ-ONLY, zero API cost.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A THIRD SCANNER: `gate-census.ts` is the merged instrument
// over the RAW publish scan surface (banned language + derivation rules). It must stay merged and
// must stay on raw. This sweep measures the OPPOSITE SIDE OF THE PROJECTION — the bytes a client
// actually receives, after every existing cleaner. Raw legitimately carries `src_N` by founder
// ruling (the operator's source-checking leverage), so a token measurement on raw is meaningless;
// a token measurement on projected is the P0. Two instruments, two surfaces, on purpose.
//
// WHAT IT IS FOR: deriving FIXTURES FROM THE CORPUS. Standing rule 2026-08-18 — "a fixture that
// only carries the shape the rule was written for proves nothing about the shapes it wasn't."
// The parenthesised-only fixtures are exactly how the P0 survived "verified weeks ago". This
// script prints the real grammar shapes so the cleaner is written against them and not against
// six shapes somebody imagined at a keyboard.
//
// It writes nothing. Remediation is a founder decision per case.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/token-leak-sweep.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  projectFindingJsonForClient,
  cleanClientFindingJson,
  cleanClientProseDeep,
  projectClientReport,
} from "@/lib/portal/clientReport";

const SENT = /(?<=[.!?])\s+/;

// ── THE FOUR MEASURED CLASSES. Patterns here are DETECTION patterns for a census, deliberately
// wider than the checkpoint's ruled assertion set (which anchors EV-\d{3} and DROPS bare E-\d+
// because it collides with real product model numbers). A census may over-report and be read by
// a human; a publish backstop may not. Do not copy these into the checkpoint.
const CLASSES: { key: string; label: string; re: RegExp }[] = [
  { key: "src_n", label: "Class 1 · src_N", re: /src_\d+/g },
  { key: "ev_id", label: "Class 1 · EV-NNN", re: /\bEV-\d{3}\b/g },
  { key: "uuid", label: "Class 2 · UUID", re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  { key: "stub_track", label: "Class 2 · stub track_N", re: /\bstub\s+track_\d+/gi },
  // Class 5 — found 2026-08-18 while reading the P0's exact text. `A05`/`A08` are internal
  // citation tokens (same vocabulary as the E02/E05/A01 fixture in synthesisMethodScan.test.ts).
  // They are NOT in the cleaner's TOKEN set, which is why the P0's parenthetical survived: the
  // group matcher requires EVERY member to be a known token, so one unknown shape defeats it and
  // the whole citation — EV- ids included — rides through.
  { key: "a_id", label: "Class 5 · A-NN citation token", re: /\bA\d{2}\b/g },
  { key: "dimension", label: "Class 3 · bare 'dimension'", re: /\bdimensions?\b/gi },
  { key: "weight_key", label: "Class 4 · weight key", re: /\bweight[_\s]?keys?\b/gi },
];

// ── GRAMMAR-SHAPE CLASSIFIER for src_N. This is the whole point of the sweep: the fix is
// "token-level strip + sentence-level drop, and GRAMMAR MUST SURVIVE", which cannot be written
// without knowing which grammatical positions the token actually occupies in the corpus.
function shapeOf(sentence: string, index: number, token: string): string {
  const before = sentence.slice(0, index);
  const after = sentence.slice(index + token.length);
  const tail = before.trimEnd();
  const lastChar = tail.slice(-1);

  if (/\(\s*$/.test(before) && /^\s*\)/.test(after)) return "parenthesised";
  if (/\[\s*$/.test(before) && /^\s*\]/.test(after)) return "bracketed";
  // An en-dash / hyphen RANGE — src_3–src_6. The corpus found this one; no hand-written set had it.
  if (/^\s*[–—-]\s*src_\d+/.test(after) || /src_\d+\s*[–—-]\s*$/.test(before)) return "range (en-dash)";
  if (tail.length === 0) return "sentence-initial";
  if (/\b(and|or|see|sources?|evidence|per|cf|via)\s*$/i.test(tail)) return "after connector word";
  if (/[,;:]$/.test(lastChar)) return "after punctuation, mid-sentence";
  return "bare inline";
}

type Bucket = { cases: Set<string>; occurrences: number; shapes: Record<string, number>; samples: Map<string, string> };
const mk = (): Bucket => ({ cases: new Set(), occurrences: 0, shapes: {}, samples: new Map() });

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, plan_type, delivered_attempt")
    .is("deleted_at", null)
    .order("created_at");

  const rowsOf = (cases ?? []) as {
    id: string; case_number: string; status: string; plan_type: string | null; delivered_attempt: number | null;
  }[];

  const agg: Record<string, Bucket> = {};
  const focusDump = new Map<string, string>();
  const perCase: { case_number: string; status: string; classes: string[] }[] = [];
  let scanned = 0;

  for (const c of rowsOf) {
    const { data: trackRows } = await supabaseAdmin
      .from("case_track_results")
      .select("track_key, compiled_findings_json, questions_to_ask, attempt_number")
      .eq("case_id", c.id)
      .gte("track_number", 1)
      .is("deleted_at", null);
    if (!trackRows?.length) continue;

    // H1 — measure what the CLIENT is pinned to: the delivered attempt once delivered, else latest.
    const chosen = c.delivered_attempt ?? Math.max(...trackRows.map((r) => r.attempt_number ?? 1));
    const chosenRows = trackRows.filter((r) => (r.attempt_number ?? 1) === chosen);
    if (!chosenRows.length) continue;

    const { data: s } = await supabaseAdmin
      .from("case_synthesis")
      .select("decision_snapshot, vendor_questions")
      .eq("case_id", c.id)
      .eq("attempt_number", chosen)
      .maybeSingle();

    // Assemble the PROJECTED client payload exactly as lib/data/cases.ts getCaseFindings does.
    // If this composition ever drifts from that one, the number below stops meaning anything —
    // that is the same "two instruments not pinned to the same thing" defect as the census skew.
    const projectedPayload = {
      findings: chosenRows.map((r) => {
        const cf = r.compiled_findings_json as Record<string, unknown> | null;
        return {
          compiled_findings_json: cf ? cleanClientFindingJson(projectFindingJsonForClient(cf, r.track_key), r.track_key) : null,
          questions_to_ask: cleanClientProseDeep(r.questions_to_ask),
        };
      }),
      // review_additions are NOT included: the ruling excludes URL-valued fields there before
      // Part B ships, so counting them now would report a number the checkpoint will not enforce.
      report: projectClientReport(
        (s?.decision_snapshot ?? null) as Record<string, unknown> | null,
        s?.vendor_questions ?? null,
        [],
      ),
    };

    scanned++;
    const texts: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === "string") texts.push(x);
      else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") Object.values(x).forEach(walk);
    };
    walk(projectedPayload);

    const hitHere = new Set<string>();
    for (const text of texts) {
      for (const sentence of text.split(SENT)) {
        for (const cls of CLASSES) {
          cls.re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = cls.re.exec(sentence)) !== null) {
            agg[cls.key] ??= mk();
            const b = agg[cls.key];
            b.cases.add(c.case_number);
            b.occurrences++;
            hitHere.add(cls.label);
            const shape = cls.key === "src_n" ? shapeOf(sentence, m.index, m[0]) : "—";
            b.shapes[shape] = (b.shapes[shape] ?? 0) + 1;
            // One sample per (shape) per class, first seen — enough to write a fixture from.
            const sampleKey = `${shape}::${b.samples.size}`;
            if (![...b.samples.keys()].some((k) => k.startsWith(`${shape}::`))) {
              b.samples.set(sampleKey, `${c.case_number} — ${sentence.trim().slice(0, 240)}`);
            }
            if (process.env.FOCUS === cls.key) {
              const t = sentence.trim();
              if (!focusDump.has(t)) focusDump.set(t, `${c.case_number} — ${t}`);
            }
          }
        }
      }
    }
    if (hitHere.size) perCase.push({ case_number: c.case_number, status: c.status, classes: [...hitHere] });
  }

  console.log(`TOKEN-LEAK SWEEP — ${scanned} case(s) with a projected client payload, measured AFTER every existing cleaner\n`);
  console.log(`Cases carrying at least one internal token: ${perCase.length}/${scanned}\n`);

  for (const cls of CLASSES) {
    const b = agg[cls.key];
    if (!b) { console.log(`${cls.label}: CLEAN (0 occurrences)\n`); continue; }
    console.log(`${cls.label} — ${b.occurrences} occurrence(s) across ${b.cases.size} case(s)`);
    const shapes = Object.entries(b.shapes).sort((a, z) => z[1] - a[1]);
    if (shapes.length > 1 || shapes[0]?.[0] !== "—") {
      for (const [shape, n] of shapes) console.log(`    ${String(n).padStart(4)}  ${shape}`);
    }
    for (const [, sample] of b.samples) console.log(`      · ${sample}`);
    console.log();
  }

  // FOCUS=<class key> dumps EVERY distinct matching sentence for one class. The samples above are
  // one-per-shape and are enough to see the grammar; they are NOT enough to write a substitution
  // against, because a word can carry a legitimate ordinary-English sense in the same corpus.
  // Deriving a rule from the one sample that happened to print first is the fixture-shaped defect.
  const focus = process.env.FOCUS;
  if (focus) {
    const cls = CLASSES.find((x) => x.key === focus);
    if (!cls) { console.log(`FOCUS=${focus} is not a class key (${CLASSES.map((x) => x.key).join(", ")})`); }
    else {
      console.log(`FOCUS — every distinct sentence matching ${cls.label}:`);
      for (const [k, sent] of focusDump) console.log(`  [${k}] ${sent}`);
      console.log();
    }
  }

  console.log("PER-CASE:");
  for (const p of perCase) console.log(`  ${p.case_number} (${p.status}) — ${p.classes.join(" · ")}`);
  console.log(`\nRead with the incomplete-attempt sweep: empty records scan clean, so stubs make the corpus look safer than it is.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
