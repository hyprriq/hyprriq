import { runIntegritySweep } from "@/lib/integrity/sweep";
import { CHECK_BY_ID } from "@/lib/integrity/checks";

async function main() {
  const r = await runIntegritySweep();
  console.log(`\n=== INTEGRITY SWEEP — ${r.cases_total} cases — ${r.ran_at} ===\n`);
  for (const c of r.checks) {
    const spec = CHECK_BY_ID.get(c.checkId);
    const state = c.findings.length === 0 ? "CLEAN" : `${c.findings.length} FINDING(S)`;
    console.log(`${c.checkId.padEnd(28)} ${state.padEnd(16)} scanned=${c.casesScanned}  unevaluated=${c.notEvaluated.length}`);
    console.log(`    ${spec?.title ?? ""}`);
    for (const f of c.findings.slice(0, 8)) console.log(`      • ${f.case_number}: ${f.detail}`);
    for (const n of c.notEvaluated.slice(0, 4)) console.log(`      ~ unevaluated: ${n}`);
    if (c.notEvaluated.length > 4) console.log(`      ~ …and ${c.notEvaluated.length - 4} more unevaluated`);
    console.log("");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
