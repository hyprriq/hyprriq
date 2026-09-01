// ── BANNED-LANGUAGE CORPUS SWEEP — READ-ONLY. Every DELIVERED case, the real gate, real payloads.
//
// WHY (founder-ruled 2026-09-01, from the first real delivered report): "ungating" reached a client
// in AWI-2608-045. The sentence was fine, but the question was about the GATE, not the report:
// is the word on the list, does the gate scan that field, and did it warn instead of blocking?
//
// ⚠ IT ANSWERS A QUESTION THE PUBLISH GATE CANNOT. The gate reports what it WOULD BLOCK. This also
// reports what it DELIBERATELY ALLOWS — every rule's bare pattern matched against the same
// client-visible bytes, with the rule's refinement (`test`) switched off. The difference between the
// two columns IS the carve-out surface: terms present in delivered prose that the gate saw and let
// through by ruling. A blind spot and a carve-out look identical from the outside; only this
// separation tells them apart.
//
// ⛔ NOT A LINTER AND NOT A BLOCKER. It measures shipped prose after the fact. A hit in the ALLOWED
// column is not automatically a defect — it is a question for the founder about whether the ruling
// that permits it still reads correctly at the client's eye.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/banned-language-corpus.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getCaseIntelligence } from "@/lib/data/synthesis";
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { composePublishGate } from "@/lib/portal/publishGate";
import { HARD_PATTERNS, ASSERTION_PATTERNS } from "@/lib/utils/banned-language";

/** Walk every string in a projected payload, with a path, so a hit can be located not just counted. */
function strings(v: unknown, path = ""): { path: string; text: string }[] {
  if (typeof v === "string") return v.trim() ? [{ path, text: v }] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`));
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k));
  }
  return [];
}

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, plan_type, status, verdict, delivered_at, supplier_identity, additional_questions")
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: true });

  const rowsOut: string[] = [];
  const allowedTally = new Map<string, number>();
  const blockedTally = new Map<string, number>();
  const threw: string[] = [];
  const tokenLeakCases: string[] = [];
  let scanned = 0;

  for (const c of (cases ?? []) as unknown as {
    id: string; case_number: string; plan_type: string; status: string; verdict: string | null;
    delivered_at: string; supplier_identity: { identity_discrepancy?: { client_note?: string } | null } | null;
    additional_questions: { question?: unknown; source?: string }[] | null;
  }[]) {
    const rows = await getCaseTrackResults(c.id);
    if (!rows.length) { rowsOut.push(`${c.case_number}  — no track rows (skipped)`); continue; }
    const attempt = Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const intel = await getCaseIntelligence(c.id, attempt);
    const overrides = await getProseOverrides(c.id, attempt);

    // ⚠ reportOnly: the presence checkpoint THROWS inside projectClientReport for cases delivered
    // before it tightened, and an exception would end the sweep at the first such case — measuring
    // the corpus up to the first problem and calling it the corpus. Token leaks are recorded
    // SEPARATELY below, so nothing is hidden by making the walk survivable.
    let gate;
    try {
      gate = composePublishGate({
        rows,
        synthesis: intel?.synthesis ?? null,
        identityNote: c.supplier_identity?.identity_discrepancy?.client_note ?? null,
        overrides,
        additionalQuestions: c.additional_questions ?? [],
        reportOnly: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message.split(String.fromCharCode(10))[0] : String(e);
      rowsOut.push(`${String.fromCharCode(10)}══ ${c.case_number} — GATE THREW: ${msg}`);
      threw.push(c.case_number);
      continue;
    }
    scanned++;
    if (gate.tokenLeaks.length) {
      const kinds = [...new Set(gate.tokenLeaks.map((t) => t.token))].join(", ");
      tokenLeakCases.push(`${c.case_number} — ${gate.tokenLeaks.length} occurrence(s): ${kinds}`);
    }

    // THE CLIENT-VISIBLE SURFACE, composed by the gate itself — never a second projection that
    // could drift from what the gate and the PDF actually ship.
    const surface = strings({
      findings: gate.gateRows.map((r) => ({
        [r.track_key]: r.compiled_findings_json,
        [`${r.track_key}__questions`]: r.questions_to_ask,
      })),
      client_note: gate.gateIdentityNote,
      decision_snapshot: gate.gateSynthesis?.module_9_decision_snapshot ?? null,
      vendor_questions: gate.gateSynthesis?.module_8_vendor_questions ?? null,
    });

    // BARE PATTERN, refinement OFF — what the vocabulary sweep sees before any ruling applies.
    const raw: string[] = [];
    for (const { re, label } of [...HARD_PATTERNS, ...ASSERTION_PATTERNS]) {
      for (const s of surface) {
        const m = new RegExp(re.source, re.flags.includes("i") ? "gi" : "g").exec(s.text);
        if (!m) continue;
        const around = s.text.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\s+/g, " ");
        raw.push(`${label} @ ${s.path} :: …${around}…`);
      }
    }

    const blocked = gate.violations;
    for (const b of blocked) blockedTally.set(b, (blockedTally.get(b) ?? 0) + 1);
    // ALLOWED = matched the vocabulary but the gate did not raise it. That is the carve-out surface.
    const allowedLabels = [...new Set(raw.map((r) => r.split(" @ ")[0]))].filter(
      (l) => !blocked.some((b) => b.includes(l)),
    );
    for (const a of allowedLabels) allowedTally.set(a, (allowedTally.get(a) ?? 0) + 1);

    if (raw.length || blocked.length) {
      rowsOut.push(`${String.fromCharCode(10)}══ ${c.case_number} (delivered ${c.delivered_at.slice(0, 10)}, verdict ${c.verdict ?? "—"})`);
      if (blocked.length) rowsOut.push(`   ⛔ WOULD BLOCK TODAY: ${blocked.join(" · ")}`);
      for (const r of raw) rowsOut.push(`   • ${r}`);
    }
  }

  const NL = String.fromCharCode(10);
  console.log("BANNED-LANGUAGE CORPUS SWEEP — delivered cases only, real gate, real payloads" + NL);
  console.log(rowsOut.join(NL));
  console.log(NL + "──────── SUMMARY ────────");
  console.log(`delivered cases measured: ${scanned}   (threw: ${threw.length})`);
  console.log(NL + "WOULD BLOCK TODAY (a real gate failure on shipped prose):");
  console.log(blockedTally.size ? [...blockedTally].map(([k, n]) => `  ${n}x  ${k}`).join(NL) : "  none");
  console.log(NL + "ALLOWED BY RULING (vocabulary present, gate saw it, ruling permitted it):");
  console.log(allowedTally.size ? [...allowedTally].map(([k, n]) => `  ${n} case(s)  ${k}`).join(NL) : "  none");
  console.log(NL + "DELIVERED CASES WHOSE PAYLOAD THE CURRENT CHECKPOINT WOULD REFUSE:");
  console.log(tokenLeakCases.length ? tokenLeakCases.map((t) => `  ${t}`).join(NL) : "  none");
  console.log(NL + "GATE THREW (could not be measured):");
  console.log(threw.length ? threw.map((t) => `  ${t}`).join(NL) : "  none");
  console.log(NL + "⚠ An ALLOWED row is not a defect. It is the carve-out surface — the question is");
  console.log("  whether each ruling still reads correctly at the client's eye.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
