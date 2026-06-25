// Scenario 001 — Verify Before Purchase (contradiction-floored)
// =============================================================================
// Scenario name   : verify-before-purchase
// Purpose         : Phase 4 review-screen validation. Exercises every admin panel with a realistic
//                   mid-risk case — solid supplier identity, but an unproven sourcing channel.
// Signal spread   : T0 intake_scope_guard        = n_a
//                   T1 supplier_identity         = pass      (9/15 · high)
//                   T2 supply_chain_relationship = flag      (2/15 · low)
//                   T3 brand_risk_assessment     = infer     (7/15 · moderate)
//                   T4 documentation_review      = soft_fail (0/15 · low, absence — Hard Rule #15)
//                   T5 sourcing_logic            = n_a       (arbitration; does not vote)
// Expected verdict: Verify Before Purchase — weighted 2.40/4 (score alone → Usable-With-Conditions),
//                   FLOORED by veto. Confidence 9/15. Decision confidence: low (0.20 from boundary).
// Expected veto   : "2 load-bearing contradictions" (Module 4: one high + one moderate, both load-bearing).
//
// HOW IT WORKS: writes only the persisted INPUTS (per-track signals + synthesis); the review screen
// RECOMPUTES the verdict at read time via computeVerdict() (Fork A), so what you see is the real
// ADR-G004 output for these seeded signals — the scenario only chooses the inputs. A direct seed
// (not runPipeline) is used because the live stub tracks/synthesis return EMPTY data (bare screen).
// See scripts/scenarios/README.md for the scenario schema.
//
// RUN (from D:\Projects\Hyprriq\portal):
//   node scripts/scenarios/scenario-001-verify-before-purchase.mjs               # attaches to an admin client
//   node scripts/scenarios/scenario-001-verify-before-purchase.mjs <client_id>   # attach to a specific clients.id
//
// Reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same Supabase project
// staging reads). Throwaway: a DELETE snippet is printed at the end.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── load .env.local (tiny parser; vitest's dummy env never touches this) ──
function loadEnv() {
  const path = resolve(__dirname, "..", ".env.local");
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  // ── resolve a client to attach the case to (FK clients.id) ──
  let clientId = process.argv[2];
  if (!clientId) {
    const { data: admins } = await db.from("clients").select("id, role").neq("role", "client").limit(1);
    const pick = admins?.[0] ?? (await db.from("clients").select("id").limit(1)).data?.[0];
    if (!pick) {
      console.error("No clients found. Pass a client id: node scripts/scenarios/scenario-001-verify-before-purchase.mjs <client_id>");
      process.exit(1);
    }
    clientId = pick.id;
  }

  const caseId = randomUUID();
  const caseNumber = `SEED-REVIEW-${Date.now()}`;
  const now = new Date().toISOString();
  const sla = new Date(Date.now() + 3 * 864e5).toISOString();

  // ── 1) the case row (growth_279 → all 5 tracks render) ──
  const { error: caseErr } = await db.from("cases").insert({
    id: caseId, case_number: caseNumber, client_id: clientId,
    plan_type: "growth_279", plan_category: "subscription", submission_type: "full_review",
    vendor_name: "Meridian Wholesale Co.", vendor_website: "https://meridian-wholesale.example",
    brands_submitted: ["Acme Audio", "NorthPeak"], marketplace: "amazon_us",
    client_notes: "Seeded throwaway case for Phase 4 review-screen validation.",
    status: "awaiting_review", synthesis_status: "complete",
    track_0_status: "complete", track_1_status: "complete", track_2_status: "complete",
    track_3_status: "complete", track_4_status: "complete", track_5_status: "complete",
    verdict: "verify_before_purchase", confidence_score: 9,
    created_at: now, sla_deadline: sla,
  });
  if (caseErr) throw new Error(`cases insert: ${caseErr.message}`);

  // ── 2) track_results — rich evidence + a spread of signals (recomputed → Verify Before Purchase) ──
  const ev = (id, statement, certainty, weight_key, claimant = "independent_registry") => ({
    evidence_id: id, statement, certainty, source_type: "third_party", source_url: null,
    claimant, claimant_benefits: claimant === "vendor", supports: "supplier_identity", weight_key,
  });
  const unk = (u) => ({ unknown: u, why_unresolvable: "Not resolvable from public records.", resolvable_by_client: true });

  const tracks = [
    { n: 0, key: "intake_scope_guard", signal: "n_a", band: null, score: null,
      notes: "Intake passed scope guard: vendor + 2 brands + marketplace present.", evidence: [], unknowns: [] },
    { n: 1, key: "supplier_identity", signal: "pass", band: "high", score: 9,
      notes: "Government registration confirmed; domain 7y old; verifiable address.",
      evidence: [
        ev("e1", "State business registration on file, active and in good standing.", "verified", "government_registration"),
        ev("e2", "Domain registered 2018 (7 years), continuous ownership.", "verified", "domain_age_5_plus"),
        ev("e3", "Listed address matches a verifiable commercial premises.", "verified", "address_verifiable"),
      ], unknowns: [] },
    { n: 2, key: "supply_chain_relationship", signal: "flag", band: "low", score: 2,
      notes: "Claims authorization but unverified; some grey-market resale signals.",
      evidence: [
        ev("e4", "Vendor asserts authorized-dealer status; no corroborating dealer page found.", "inferred", "claims_authorization_unverified", "vendor"),
        ev("e5", "Two marketplaces show parallel-import / grey-market patterns for these SKUs.", "inferred", "grey_market_signals"),
      ], unknowns: [unk("Whether the distributor relationship is exclusive or arms-length.")] },
    { n: 3, key: "brand_risk_assessment", signal: "infer", band: "moderate", score: 7,
      notes: "Brand appears reseller-friendly; Keepa stable, no enforcement cliff found.",
      evidence: [
        ev("e6", "Brand has historically tolerated third-party resellers.", "inferred", "reseller_friendly"),
        ev("e7", "Keepa buy-box history stable over 12 months; no seller-count cliff.", "verified", "keepa_stable_no_cliff"),
      ], unknowns: [] },
    { n: 4, key: "documentation_review", signal: "soft_fail", band: "low", score: 0,
      notes: "No wholesale documents provided — absence of evidence, not evidence of fraud (Hard Rule #15).",
      evidence: [], unknowns: [unk("No invoice, LOA, or PO supplied to corroborate sourcing.")] },
    { n: 5, key: "sourcing_logic", signal: "n_a", band: null, score: null,
      notes: "Arbitration track: weighs cross-track coherence; does not vote in the verdict.",
      evidence: [], unknowns: [] },
  ];

  for (const t of tracks) {
    const { error } = await db.from("case_track_results").insert({
      case_id: caseId, track: `track_${t.n}`, track_key: t.key, track_number: t.n, attempt_number: 1,
      source_mode: "ai_generated",
      compiled_findings_json: { signal: t.signal, score: t.score, summary: t.notes },
      confidence_score: t.score, confidence_band: t.band,
      finding_certainty: t.signal === "pass" ? "verified" : "inferred",
      founder_review_status: "approved", manual_review_required: false,
      evidence_items: t.evidence, reasoning_notes: t.notes, unknowns: t.unknowns,
      evidence_weights_applied: t.evidence.filter((e) => e.weight_key).map((e) => ({ evidence_type: e.weight_key, points: 0 })),
      track_verdict_signal: t.signal, suggested_signal: t.signal,
    });
    if (error) throw new Error(`track_${t.n} insert: ${error.message}`);
  }

  // ── 3) case_synthesis — rich Module 9 + cross-track (2 load-bearing contradictions → veto floor) ──
  const { error: synthErr } = await db.from("case_synthesis").insert({
    case_id: caseId,
    normalized_evidence: [],
    claim_attributions: [],
    assertions: [],
    contradictions: [
      { is_load_bearing: true, risk_level: "high" },
      { is_load_bearing: true, risk_level: "moderate" },
    ],
    hypotheses: {
      hypotheses: [
        { label: "Authorized distributor", likelihood: "moderate" },
        { label: "Grey-market arbitrage reseller", likelihood: "leading" },
      ],
      what_would_change_the_leader: "A legitimate LOA or distributor invoice would move the leader to 'authorized distributor'.",
    },
    risk_gaps: [],
    doubt_calibration: {
      doubt_level: "elevated",
      doubt_focus: "the unverified authorization claim",
      rationale: "Identity is solid, but the sourcing channel cannot be corroborated from the evidence provided.",
    },
    vendor_questions: [
      "Can you provide a Letter of Authorization from the brand or its distributor?",
      "Which distributor did these units originate from, and can you share a matching invoice?",
      "Are these units sourced domestically or via parallel import?",
    ],
    decision_snapshot: {
      headline: "Identity is solid, but the sourcing channel is unproven.",
      leading_interpretation: "Most likely a legitimately-registered reseller operating partly on the grey market, not a confirmed authorized distributor.",
      the_real_risk: "Buying without a verifiable authorization trail exposes you to IP complaints and inventory lockups if the brand tightens enforcement.",
      what_to_verify: [], // UI surfaces Module 8 vendor_questions for "What to Verify"
      what_to_monitor: [
        "Keepa seller-count for sudden cliffs (enforcement onset).",
        "Any new brand IP complaints or MAP-policy changes.",
      ],
    },
    evidence_hash: "seed" + caseId.replace(/-/g, "").slice(0, 24),
    prompt_version: "v2.1",
    rubric_version: "g003-1.0.0",
    synthesis_version: "g005-0.1.0",
    corpus_version: "seed-0",
    configuration_version: "cfg-dev-sonnet",
    model_provider: "anthropic",
    model_version: "claude-sonnet-4-6",
    ios_version: "HyprrIQ IOS v0.1",
  });
  if (synthErr) throw new Error(`case_synthesis insert: ${synthErr.message}`);

  console.log("\n✅ Seeded review case");
  console.log(`   case_id     : ${caseId}`);
  console.log(`   case_number : ${caseNumber}`);
  console.log(`   client_id   : ${clientId}`);
  console.log(`   verdict     : screen recomputes → Verify Before Purchase (score 2.40/4, conf 9/15, decision-confidence low, veto: 2 load-bearing contradictions)`);
  console.log(`\n   Review URL  : ${APP_URL}/admin/cases/${caseId}/review`);
  console.log(`\n   Cleanup (throwaway): run this SQL in Supabase to remove it —`);
  console.log(`     delete from case_synthesis     where case_id = '${caseId}';`);
  console.log(`     delete from case_track_results where case_id = '${caseId}';`);
  console.log(`     delete from cases              where id      = '${caseId}';`);
}

main().catch((e) => { console.error("\n❌ Seed failed:", e.message); process.exit(1); });
