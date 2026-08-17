import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { checkRepairInvariants } from "@/lib/research/proseRepair";

// ── THE SIXTH INVARIANT IS LAW, NOT A SETTING (founder ruling, 2026-08-17):
// "Localized-edit enforcement is the ruling, not an option."
//
// It was born as an option because I proposed it as one. The ruling closed that, so the escape
// hatch is now named TEST_ONLY_disableLocalizedEdit and this file is the lock: production code
// that reaches for it fails the build. Precedent and pattern: TEST_ONLY_GAP_THRESHOLDS in
// s1f.freeze.test.ts — a test-only fixture is only safe while something enforces "test only".
//
// A change to this file is a founder ruling, not a refactor. ──

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["lib", "app", "components", "scripts"];
const CODE = /\.tsx?$/;
const IS_TEST = /\.(test|spec)\.tsx?$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CODE.test(entry) && !IS_TEST.test(entry)) out.push(p);
  }
  return out;
}

describe("the localized-edit invariant cannot be switched off in production", () => {
  it("NO non-test file CONSUMES the test-only escape hatch", () => {
    // proseRepair.ts DECLARES the option — declaring is not using, and the precedent test checks
    // consumers too (s1f: "synthesisEngine.ts must not import TEST_ONLY_GAP_THRESHOLDS"). Every
    // other production file is an offender the moment the string appears in it.
    const DECLARING_FILE = join(ROOT, "lib", "research", "proseRepair.ts");
    const offenders = SCAN_DIRS
      .flatMap((d) => walk(join(ROOT, d)))
      .filter((f) => f !== DECLARING_FILE)
      .filter((f) => readFileSync(f, "utf8").includes("TEST_ONLY_disableLocalizedEdit"));
    expect(offenders, `production code must never disable the sixth invariant:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the default path enforces it — no options object means the sixth is ON", () => {
    // The founder's own softening example: faithful on all five, refused by the sixth.
    const claim = "No positive confirmation of authorization exists for Belgium (src_3).";
    const softened = "Authorization was not fully documented for Belgium (src_3).";
    expect(checkRepairInvariants(claim, softened).map((f) => f.invariant)).toContain("localized_edit");
  });

  it("passing an unrelated option does not silently drop it", () => {
    const claim = "No positive confirmation of authorization exists for Belgium (src_3).";
    const softened = "Authorization was not fully documented for Belgium (src_3).";
    expect(checkRepairInvariants(claim, softened, { lengthFloor: 0.1 }).map((f) => f.invariant))
      .toContain("localized_edit");
  });
});
