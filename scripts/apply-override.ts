// ── GENERIC PROSE-OVERRIDE APPLIER (operator harness) ────────────────────────────────────────
// Applies one override: fetches the CURRENT stored text at the given location (byte-exact — the
// overlay refuses drift, so originals are never pasted by hand), replaces ONE exact substring,
// and saves through the same storage helper + scanHard gate the admin route uses.
//
//   CASE=AWI-2608-037 ATTEMPT=2 TARGET=track:brand_risk_assessment FIELD=brand_risk_finding \
//   FIND="..." REPLACE="..." REASON="..." \
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/apply-override.ts
//
// TARGET forms: track:<track_key> (FIELD = compiled field or questions_to_ask[n].reason),
//               synthesis (FIELD = decision_snapshot.<...> | vendor_questions[n]...),
//               identity (FIELD = client_note).
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveProseOverride } from "@/lib/data/proseOverrides";
import { scanHard } from "@/lib/utils/banned-language";

const ACTOR = "claude-fable-5-session-2026-08-20";
const env = (k: string): string => {
  const v = process.env[k];
  if (!v) { console.error(`missing env ${k}`); process.exit(1); }
  return v;
};

function valueAtPath(root: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

async function main() {
  const caseNumber = env("CASE"), attempt = Number(env("ATTEMPT"));
  const target = env("TARGET"), field = env("FIELD");
  const find = env("FIND"), replace = env("REPLACE");
  const reason = process.env.REASON ?? null;

  const { data: c } = await supabaseAdmin.from("cases").select("id, supplier_identity").eq("case_number", caseNumber).maybeSingle();
  if (!c) throw new Error("case not found");
  const caseId = (c as { id: string }).id;

  let original: unknown;
  if (target.startsWith("track:")) {
    const trackKey = target.slice("track:".length);
    const { data: r } = await supabaseAdmin
      .from("case_track_results").select("compiled_findings_json, questions_to_ask")
      .eq("case_id", caseId).eq("track_key", trackKey).eq("attempt_number", attempt)
      .is("deleted_at", null).maybeSingle();
    if (!r) throw new Error(`no ${trackKey} row for attempt ${attempt}`);
    const composite = { ...((r as { compiled_findings_json: Record<string, unknown> | null }).compiled_findings_json ?? {}), questions_to_ask: (r as { questions_to_ask: unknown }).questions_to_ask ?? null };
    original = valueAtPath(composite, field);
  } else if (target === "synthesis") {
    const { data: s } = await supabaseAdmin
      .from("case_synthesis").select("decision_snapshot, vendor_questions")
      .eq("case_id", caseId).eq("attempt_number", attempt).is("deleted_at", null).maybeSingle();
    if (!s) throw new Error(`no synthesis for attempt ${attempt}`);
    original = valueAtPath({ decision_snapshot: (s as Record<string, unknown>).decision_snapshot, vendor_questions: (s as Record<string, unknown>).vendor_questions }, field);
  } else if (target === "identity") {
    original = (c as { supplier_identity?: { identity_discrepancy?: { client_note?: string } } }).supplier_identity?.identity_discrepancy?.client_note;
  } else {
    throw new Error(`unknown target ${target}`);
  }

  if (typeof original !== "string" || !original) throw new Error(`no string at ${target}›${field}`);
  if (!original.includes(find)) throw new Error(`FIND text not present at ${target}›${field} — stored text differs`);
  const replacement = original.split(find).join(replace);
  if (replacement === original) throw new Error("replacement identical to original");
  const violations = scanHard(replacement);
  if (violations.length) throw new Error(`replacement still trips the gate: ${violations.join(", ")}`);

  const { error } = await saveProseOverride({
    caseId, attempt, target, fieldPath: field,
    originalText: original, replacementText: replacement, reason, actorId: ACTOR,
  });
  if (error) throw new Error(`save failed: ${error}`);
  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_prose_overrides", record_id: caseId, action: "INSERT",
    actor_id: ACTOR, actor_type: "admin",
    old_value: { target, field_path: field, text: original },
    new_value: { target, field_path: field, text: replacement, attempt, reason },
  });
  console.log(`✔ override saved: ${target}›${field} (${caseNumber} attempt ${attempt})`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
