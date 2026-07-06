/**
 * H5 (Task 5b) — attribution behavioral sampler. FOUNDER-RUN; costs real API (~$0.03/run).
 *
 * SAMPLES (does not prove) that the Track 2 prompt's ATTRIBUTION guard steers the model: given a
 * fixture Evidence Pack containing a dealer-locator source, the model's brand_relationship_finding
 * may use authorization vocabulary ONLY inside attributed descriptions. Safety NEVER depends on
 * this passing — the presence-based assertion advisory (hold-from-auto-publish) is the backstop
 * that works even when the model drops attribution. This script is the regression probe to re-run
 * after ANY track-prompt change (and a future backtesting-harness citizen).
 *
 * Run:  npx tsx --env-file=.env.local scripts/validate-attribution.ts [runs=3]
 * PASS: every run's authorization vocabulary is attributed → exit 0. Any bare assertion → exit 1
 * (strengthen the prompt guard before freezing the phase that changed it).
 */
import { buildTrack2Prompt, parseTrack2Output } from "@/lib/research/track2.prompt";
import { runModel } from "@/lib/ai/runModel";
import { scanAssertion } from "@/lib/utils/banned-language";

const RUNS = Number(process.argv[2] ?? 3);

// Fixture pack: one official dealer-locator source + one neutral trade-press source.
const SOURCES = [
  { source_id: "src_0", url: "https://www.lenovo.com/us/en/partners/find-a-partner", title: "Lenovo Partner Locator", snippet: "Lenovo's official partner locator lists TD SYNNEX as an authorized distributor for North America." },
  { source_id: "src_1", url: "https://www.crn.com/news/channel-programs/td-synnex-lenovo", title: "CRN: TD SYNNEX expands Lenovo line", snippet: "Distributor TD SYNNEX announced expanded distribution of Lenovo commercial products." },
];

// Attribution markers: the finding may use authorization vocabulary only in sentences that carry one.
const ATTRIBUTION_MARKERS = [
  /dealer locator/i, /partner locator/i, /according to/i, /lists?\b/i, /listed\b/i,
  /the (brand|vendor|manufacturer)('s)?\s+(official\s+)?(page|site|program|locator)/i,
  /the vendor (claims|states)/i, /per (the|lenovo)/i, /trade press/i, /announced/i,
];

function bareAssertionSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => scanAssertion(sentence).length > 0)
    .filter((sentence) => !ATTRIBUTION_MARKERS.some((m) => m.test(sentence)));
}

async function main() {
  const { system, user } = buildTrack2Prompt({ vendor_name: "TD SYNNEX", brands: ["Lenovo"] }, SOURCES);
  let failures = 0;
  for (let i = 1; i <= RUNS; i++) {
    const res = await runModel({ task: "track", system, user, temperature: 0 });
    const parsed = parseTrack2Output(res.json);
    if (parsed.parse_failed) { console.log(`✘ run ${i}: model output unparseable — cannot assess`); failures++; continue; }
    const finding = parsed.brand_relationship_finding || "";
    const bare = bareAssertionSentences(finding);
    const used = scanAssertion(finding).length > 0;
    if (bare.length > 0) {
      failures++;
      console.log(`✘ run ${i}: BARE assertion (no attribution marker in sentence):`);
      for (const s of bare) console.log(`    "${s.trim()}"`);
    } else {
      console.log(`✔ run ${i}: ${used ? "authorization vocabulary present and attributed" : "no authorization vocabulary used"}`);
    }
  }
  console.log(`\n${failures === 0 ? `PASS — ${RUNS}/${RUNS} runs attributed.` : `REVIEW — ${failures}/${RUNS} run(s) need prompt-guard strengthening.`}`);
  console.log("Reminder: the presence-based advisory (hold-from-auto-publish) is the backstop either way.");
  process.exit(failures === 0 ? 0 : 1);
}
main();
