// ── PROSE DIFF (2026-08-17, engine-prose-pass acceptance) — READ-ONLY, zero writes, zero API.
// Puts TWO attempts of one case side by side: the client-prose fields the pass touches, each
// attempt's HARD + ASSERTION scan labels, each track's signal, and the case verdict — so a
// before/after read answers both founder questions at once: did the WORDS change, and did the
// SIGNALS stay byte-identical (the firewall guarantees it structurally; this shows it).
//
// It also prints each attempt's stored version vector, which is how you tell WHICH prompts wrote
// an attempt: prompt_version "0.0.0" = pre-pass, "p001-1.0.0" = post-pass. A track row carries no
// version stamp — only case_synthesis does — so an attempt with no synthesis row cannot be
// attributed from the DB alone and is reported as INCOMPLETE rather than guessed at.
//
// Run: npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local \
//        scripts/prose-diff.ts <case-id-or-number> [oldAttempt] [newAttempt]
//      (defaults: the two highest attempts present)
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scanHard, scanAssertion } from "@/lib/utils/banned-language";

// The client-prose fields this pass touches, per track, in reading order.
const TRACK_FIELDS: Record<string, string[]> = {
  supply_chain_relationship: ["brand_relationship_finding", "auth_level_reasoning", "summary"],
  brand_risk_assessment: ["brand_risk_finding", "analyst_reading", "summary"],
  documentation_review: ["documentation_finding", "analyst_reading", "summary"],
};
const M9_FIELDS = ["headline", "leading_interpretation", "the_real_risk"];

const flat = (v: unknown): string =>
  typeof v === "string" ? v
    : Array.isArray(v) ? v.map(flat).filter(Boolean).join(" · ")
    : v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k}: ${flat(x)}`).join(" · ")
    : "";

const labels = (t: string): string => {
  const h = scanHard(t), a = scanAssertion(t);
  if (!h.length && !a.length) return "clean";
  return [h.length ? `HARD[${h.join("; ")}]` : "", a.length ? `A[${a.join("; ")}]` : ""].filter(Boolean).join(" ");
};

function show(title: string, text: string) {
  console.log(`\n  ── ${title} — ${labels(text)}`);
  console.log(text ? text.replace(/\s+/g, " ").slice(0, 700) : "    (empty)");
}

async function main() {
  const [ref, oldArg, newArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!ref) { console.error("usage: prose-diff.ts <case-id-or-number> [oldAttempt] [newAttempt]"); process.exit(1); }
  const col = /^[0-9a-f-]{36}$/i.test(ref) ? "id" : "case_number";
  const { data: c } = await supabaseAdmin.from("cases")
    .select("id, case_number, plan_type, status, verdict, reinvestigation_pending")
    .eq(col, ref).is("deleted_at", null).maybeSingle();
  if (!c) { console.error(`STOP: no case for ${col}=${ref}`); process.exit(1); }

  const { data: rows } = await supabaseAdmin.from("case_track_results")
    .select("attempt_number, track_key, track_verdict_signal, compiled_findings_json, questions_to_ask")
    .eq("case_id", c.id).is("deleted_at", null);
  const { data: syn } = await supabaseAdmin.from("case_synthesis")
    .select("attempt_number, prompt_version, ios_version, model_version, decision_snapshot, vendor_questions")
    .eq("case_id", c.id).is("deleted_at", null);

  const attempts = [...new Set((rows ?? []).map((r) => r.attempt_number ?? 1))].sort((a, b) => a - b);
  const B = Number(newArg) || attempts[attempts.length - 1];
  const A = Number(oldArg) || attempts[attempts.length - 2] || B;
  console.log(`= ${c.case_number} (${c.plan_type}, status=${c.status}, verdict=${c.verdict}, reinvestigation_pending=${c.reinvestigation_pending})`);
  console.log(`  attempts present: ${attempts.join(", ")} — comparing ${A} → ${B}\n`);

  for (const n of [A, B]) {
    const trackRows = (rows ?? []).filter((r) => (r.attempt_number ?? 1) === n);
    const s = (syn ?? []).find((x) => x.attempt_number === n);
    const sigs = trackRows.map((r) => `${r.track_key}=${r.track_verdict_signal}`).join(", ");
    console.log(`ATTEMPT ${n}: ${trackRows.length} track row(s) — ${sigs}`);
    console.log(`  synthesis: ${s ? `prompt_version=${s.prompt_version}, ios_version=${s.ios_version}, model=${s.model_version}` : "NONE — INCOMPLETE ATTEMPT (nothing can be attributed to a prompt version, and the census scans it anyway)"}`);
  }

  for (const n of [A, B]) {
    console.log(`\n${"=".repeat(78)}\nATTEMPT ${n} — PROSE\n${"=".repeat(78)}`);
    const trackRows = (rows ?? []).filter((r) => (r.attempt_number ?? 1) === n);
    for (const [track, fields] of Object.entries(TRACK_FIELDS)) {
      const r = trackRows.find((x) => x.track_key === track);
      if (!r) { console.log(`\n[${track}] — no row at this attempt`); continue; }
      console.log(`\n[${track}] signal=${r.track_verdict_signal}`);
      const cf = (r.compiled_findings_json ?? {}) as Record<string, unknown>;
      for (const f of fields) if (cf[f] !== undefined) show(f, flat(cf[f]));
      const qs = (r.questions_to_ask ?? []) as unknown[];
      if (qs.length) show(`questions_to_ask (${qs.length})`, flat(qs));
    }
    const s = (syn ?? []).find((x) => x.attempt_number === n);
    if (!s) { console.log(`\n[synthesis] — NO SYNTHESIS ROW at attempt ${n}`); continue; }
    console.log(`\n[synthesis M9/M8]`);
    const ds = (s.decision_snapshot ?? {}) as Record<string, unknown>;
    for (const f of M9_FIELDS) show(f, flat(ds[f]));
    show("vendor_questions (M8)", flat(s.vendor_questions));
  }

  // The byte-identity check the founder asked for, stated plainly.
  const sig = (n: number) => Object.fromEntries((rows ?? [])
    .filter((r) => (r.attempt_number ?? 1) === n)
    .map((r) => [r.track_key, r.track_verdict_signal]));
  const a = sig(A), b = sig(B);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const drift = keys.filter((k) => a[k] !== b[k]);
  console.log(`\n${"=".repeat(78)}\nSIGNAL IDENTITY ${A} vs ${B}`);
  for (const k of keys) console.log(`  ${a[k] === b[k] ? "=" : "!"} ${k}: ${a[k] ?? "(absent)"} -> ${b[k] ?? "(absent)"}`);
  console.log(drift.length
    ? `  DRIFT on ${drift.length}: ${drift.join(", ")} — a prose pass must not move a signal; investigate before trusting this replay.`
    : `  IDENTICAL across all ${keys.length} tracks.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
