// ── SNAKE_CASE CENSUS OVER DELIVERED CLIENT PROSE — READ-ONLY ────────────────────────────────
//
// WHY (founder-ruled 2026-09-01): `(EV-011, supply_chain)` reached a client PDF. The checkpoint's
// track-key pattern matches `supply_chain_relationship`, so the TRUNCATED form walked straight
// past it. That is standing rule 11 again — a pattern that cannot match the shape that actually
// occurs — and the founder's read is the sharper one:
//
//   "The pattern list was written from full keys and the prose carries short ones."
//
// ⚠ AND IT HAD ALREADY HAPPENED ONCE. clientTokenCheckpoint's own header records a 2026-08-22
// census that found "(brand_risk)" on a delivered report — "a track key the hand-written
// substitution list did not know in its short form" — and the fix ADDED `brand_risk` to the
// alternation. It fixed the instance, not the class, so `supply_chain` leaked the same way nine
// days later. Enumerating instances is what put us here twice.
//
// ⛔ SO THIS DOES NOT LOOK FOR KNOWN TOKENS. It looks for EVERY snake_case identifier in prose a
// client actually reads, and then asks which of them the checkpoint would currently catch. Anything
// in the NOT-CAUGHT column is either a leak nobody has named yet or an ordinary English phrase —
// and a human has to decide which, which is the point: the list stops being self-certifying.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/internal-token-census.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { projectClientReport, projectFindingJsonForClient, projectQuestionsForClient } from "@/lib/portal/clientReport";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { TRACKS } from "@/lib/constants/tracks";

const NL = String.fromCharCode(10);

/** Every snake_case identifier: two or more lowercase segments joined by underscores. */
const SNAKE = /(?<![A-Za-z0-9_])[a-z][a-z0-9]*(?:_[a-z0-9]+)+(?![A-Za-z0-9_])/g;

function strings(v: unknown, path = ""): { path: string; text: string }[] {
  if (typeof v === "string") return v.trim() ? [{ path, text: v }] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`));
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k));
  }
  return [];
}

// ⚠ ASK THE REAL CHECKPOINT, NOT A SUBSET OF IT. The first version of this census tested only
// INTERNAL_CONTENT_PATTERNS and reported every src_N marker as UNCAUGHT — they are caught, by
// CHECKPOINT_TOKENS, which that list does not contain. A census that models the guard instead of
// calling it measures the model. findInternalTokens IS the guard.
const caughtByCheckpoint = (tok: string): string | null => {
  const hits = findInternalTokens({ probe: tok });
  return hits.length ? hits[0].token : null;
};

/** Multi-segment prefixes of a known track key — the shapes prose actually carries. */
function trackKeyPrefixes(): string[] {
  const out = new Set<string>();
  // Derived from the registry, plus the keys the pattern itself names that have no TRACKS row
  // (category_compliance is track 6, registered separately). Generated, never hand-listed — a new
  // track extends this automatically, which is the whole point of the 2026-09-01 rework.
  const keys = [...TRACKS.map((t) => t.track_key as string), "category_compliance"];
  for (const k of keys) {
    const parts = k.split("_");
    // ≥2 segments only: single words ("supply", "brand", "sourcing") are ordinary English and
    // would false-positive on every report. The boundary is "recognisably the key", not "a word".
    for (let n = 2; n <= parts.length; n++) out.add(parts.slice(0, n).join("_"));
  }
  return [...out].sort();
}

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, delivered_at, delivered_attempt, additional_questions")
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: true });

  const tally = new Map<string, { n: number; cases: Set<string>; sample: string }>();
  let scanned = 0;

  for (const c of (cases ?? []) as unknown as {
    id: string; case_number: string; delivered_at: string; delivered_attempt: number | null;
    additional_questions: unknown[] | null;
  }[]) {
    const attempt = c.delivered_attempt ?? undefined;
    const rows = await getCaseTrackResults(c.id, attempt);
    if (!rows.length) continue;
    let snapReport: unknown = null;
    try {
      const snap = await getClientDecisionSnapshot(c.id);
      snapReport = projectClientReport(
        (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
        snap?.vendor_questions,
        (c.additional_questions ?? []) as { question?: unknown; source?: string }[],
        { allowInternalTokens: true },
      );
    } catch { /* a pre-checkpoint case — its prose is still measured through the rows below */ }

    // EXACTLY what the client surfaces compose, not the raw rows.
    const surface = strings({
      findings: rows.map((r) => ({
        [r.track_key]: r.compiled_findings_json
          ? projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key)
          : null,
        [`${r.track_key}__questions`]: projectQuestionsForClient(r.questions_to_ask),
      })),
      report: snapReport,
    });
    scanned++;

    for (const s of surface) {
      for (const m of s.text.matchAll(SNAKE)) {
        const tok = m[0];
        const e = tally.get(tok) ?? { n: 0, cases: new Set<string>(), sample: "" };
        e.n++;
        e.cases.add(c.case_number);
        if (!e.sample) {
          e.sample = `${c.case_number} @ ${s.path} :: …${s.text.slice(Math.max(0, m.index - 50), m.index + tok.length + 50).replace(/\s+/g, " ")}…`;
        }
        tally.set(tok, e);
      }
    }
  }

  const prefixes = new Set(trackKeyPrefixes());
  const rows = [...tally.entries()].sort((a, b) => b[1].n - a[1].n);
  const caught = rows.filter(([t]) => caughtByCheckpoint(t));
  const missed = rows.filter(([t]) => !caughtByCheckpoint(t));

  console.log("SNAKE_CASE CENSUS — client-visible prose on every delivered case" + NL);
  console.log(`delivered cases measured: ${scanned}`);
  console.log(`distinct snake_case tokens found: ${rows.length}` + NL);

  console.log("── CAUGHT by INTERNAL_CONTENT_PATTERNS today ────────────────────────");
  console.log(caught.length
    ? caught.map(([t, e]) => `  ${t}  (${e.n}x, ${e.cases.size} case(s)) [${caughtByCheckpoint(t)}]`).join(NL)
    : "  none");

  console.log(NL + "── NOT CAUGHT — every one needs a human verdict ─────────────────────");
  if (!missed.length) console.log("  none");
  for (const [t, e] of missed) {
    const flag = prefixes.has(t) ? "  🔴 TRACK-KEY PREFIX" : "";
    console.log(`  ${t}  (${e.n}x, ${e.cases.size} case(s))${flag}`);
    console.log(`      ${e.sample}`);
  }

  console.log(NL + "── THE DERIVED BOUNDARY (what the pattern SHOULD cover) ─────────────");
  console.log("  multi-segment prefixes of every track key, generated not hand-listed:");
  console.log("    " + trackKeyPrefixes().join(", "));
  const uncovered = trackKeyPrefixes().filter((p) => !caughtByCheckpoint(p));
  console.log(NL + "  of those, NOT matched by the current pattern:");
  console.log(uncovered.length ? "    🔴 " + uncovered.join(", ") : "    none");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
