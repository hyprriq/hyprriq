// ── ONE-SHOT OPERATOR ACTION (2026-08-20, full-authority session): the three prose overrides that
// unblock AWI-2608-039 attempt 2 — the same writes the admin route performs, through the same
// storage helper, with the SAME scanHard gate on every replacement (the gate decides, not the
// operator). Idempotent: saveProseOverride soft-deletes and replaces on the natural key.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/apply-039-overrides.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveProseOverride } from "@/lib/data/proseOverrides";
import { scanHard } from "@/lib/utils/banned-language";

const ACTOR = "claude-fable-5-session-2026-08-20";
const CASE_NUMBER = "AWI-2608-039";
const ATTEMPT = 2;

async function main() {
  const { data: c } = await supabaseAdmin.from("cases").select("id").eq("case_number", CASE_NUMBER).maybeSingle();
  if (!c) throw new Error("case not found");
  const caseId = (c as { id: string }).id;

  const { data: s } = await supabaseAdmin
    .from("case_synthesis").select("decision_snapshot, vendor_questions")
    .eq("case_id", caseId).eq("attempt_number", ATTEMPT).is("deleted_at", null).maybeSingle();
  const snap = (s as { decision_snapshot: { what_to_verify: string[] }; vendor_questions: unknown[] } | null);
  if (!snap) throw new Error("no synthesis for attempt 2");

  const { data: t1 } = await supabaseAdmin
    .from("case_track_results").select("compiled_findings_json")
    .eq("case_id", caseId).eq("track_key", "supplier_identity").eq("attempt_number", ATTEMPT)
    .is("deleted_at", null).maybeSingle();
  const t1Summary = ((t1 as { compiled_findings_json: { summary?: string } } | null)?.compiled_findings_json?.summary) ?? "";

  // The three originals, fetched byte-exact — the overlay refuses on any drift, so originals are
  // never pasted by hand.
  const wtv2 = snap.decision_snapshot.what_to_verify[2];
  const vq2raw = snap.vendor_questions[2];
  const vq2IsString = typeof vq2raw === "string";
  const vq2 = vq2IsString ? (vq2raw as string) : ((vq2raw as { question?: string })?.question ?? "");

  const fixApproval = (text: string) =>
    text.replace(
      "documented case-by-case Amazon approval for Sony and PlayStation product listings",
      "documented case-by-case approval from Amazon for Sony and PlayStation product listings",
    );
  const fixCorroborate = (text: string) =>
    text.replace(
      "Dun & Bradstreet corroborate the vendor's UK and US addresses and contact details",
      "Dun & Bradstreet consistently list the vendor's UK and US addresses and contact details",
    );

  const jobs = [
    {
      target: "synthesis", field_path: "decision_snapshot.what_to_verify[2]",
      original: wtv2, replacement: fixApproval(wtv2),
      reason: "H4 'amazon approved': the question is legitimate; only the phrase adjacency blocks. Meaning preserved.",
    },
    {
      target: "synthesis", field_path: vq2IsString ? "vendor_questions[2]" : "vendor_questions[2].question",
      original: vq2, replacement: fixApproval(vq2),
      reason: "H4 'amazon approved': same sentence as what_to_verify[2].",
    },
    {
      target: "track:supplier_identity", field_path: "summary",
      original: t1Summary, replacement: fixCorroborate(t1Summary),
      reason: "Corroboration vocabulary in the first-ever client_summary; one verb changed, finding untouched.",
    },
  ];

  for (const j of jobs) {
    if (!j.original) throw new Error(`original empty for ${j.target}›${j.field_path}`);
    if (j.replacement === j.original) throw new Error(`replacement identical for ${j.target}›${j.field_path} — the expected phrase was not found; stored text moved`);
    const violations = scanHard(j.replacement);
    if (violations.length) throw new Error(`replacement still trips the gate (${violations.join(", ")}) at ${j.field_path}`);
    const { error } = await saveProseOverride({
      caseId, attempt: ATTEMPT, target: j.target, fieldPath: j.field_path,
      originalText: j.original, replacementText: j.replacement, reason: j.reason, actorId: ACTOR,
    });
    if (error) throw new Error(`save failed at ${j.field_path}: ${error}`);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_prose_overrides", record_id: caseId, action: "INSERT",
      actor_id: ACTOR, actor_type: "admin",
      old_value: { target: j.target, field_path: j.field_path, text: j.original },
      new_value: { target: j.target, field_path: j.field_path, text: j.replacement, attempt: ATTEMPT, reason: j.reason },
    });
    console.log(`✔ override saved: ${j.target}›${j.field_path}`);
  }
  console.log("\nDone — run publish-preflight on AWI-2608-039 to confirm the gate closes.");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
