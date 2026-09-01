import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readCoherenceConflicts } from "./coherenceConflicts";

const repo = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
const NL = String.fromCharCode(10);

// ── LOCK — TWO THINGS WERE CALLED "CONTRADICTIONS"; NOW ONE IS (founder-ruled 2026-09-01) ─────
//
// ⚠ THE CONFUSION THIS ENDS. On AWI-2608-045 the review screen said "3 load-bearing
// contradictions" while `sourcing_logic.contradictions` was `[]`. BOTH WERE CORRECT:
//   · Module 4's  — CROSS-TRACK assertion conflicts, load-bearing, they drive the verdict.
//   · Track 5's   — an internal COHERENCE check over one attempt's stored rows, always
//                   is_load_bearing: false, structurally verdict-inert.
// The founder's cost statement: "Two objects sharing a name, one hardcoded is_load_bearing: false
// and one that decides the verdict, will confuse whoever reads it next, and 'whoever' includes me
// in six months."
//
// ⛔ THE RENAME IS THE CONTAINER FIELD ONLY. `SourcingContradictionRecord` and its
// `contradiction_type` stay frozen at m4c-1.0.0 — that shape is shared with Module 4's reader
// (m4c-1.1.0, accepts both producers), and renaming it would break the one contract this rename
// exists to keep legible.

describe("LOCK — the tolerant read covers both shapes", () => {
  it("reads the NEW field", () => {
    const rec = [{ contradiction_type: "cross_track_signal_divergence" }];
    expect(readCoherenceConflicts({ coherence_conflicts: rec })).toHaveLength(1);
  });

  it("reads the OLD field — the 15 delivered rows are never migrated", () => {
    // The divergence law: a delivered record is investigated, never smoothed. These rows keep the
    // old key forever, so re-rendering a pre-rename report must show what it always showed.
    const rec = [{ contradiction_type: "documentation_comfort_vs_web_risk" }];
    expect(readCoherenceConflicts({ contradictions: rec })).toHaveLength(1);
  });

  it("prefers the new field when both are present", () => {
    const out = readCoherenceConflicts({ coherence_conflicts: [{ a: 1 }], contradictions: [{ b: 2 }, { b: 3 }] });
    expect(out).toHaveLength(1);
  });

  it("returns [] for null, undefined, and a non-array field — never throws", () => {
    // A reader that throws on a malformed stored row would take down the admin panel for a case
    // nobody could then inspect, which is the opposite of what an inspection surface is for.
    for (const bad of [null, undefined, {}, { coherence_conflicts: "nope" }, { contradictions: 7 }]) {
      expect(readCoherenceConflicts(bad)).toEqual([]);
    }
  });
});

describe("LOCK — the rename stayed inside its scope (the canary)", () => {
  it("Module 4's `contradictions` was NOT renamed", () => {
    // ⚠ WITHOUT THIS, "the rename worked" is indistinguishable from "the rename ran everywhere".
    // A mechanical sweep DID over-reach during this change and renamed CrossTrackView's field,
    // which is Module 4's verdict-bearing set — the compiler caught it. This keeps it caught.
    const vm = read("lib/research/verdictViewModel.ts");
    expect(vm, "CrossTrackView must still expose Module 4's records as `contradictions`")
      .toMatch(/contradictions:\s*SynthesisOutput\["module_4_contradictions"\]/);
  });

  it("the frozen record type and its contradiction_type still exist", () => {
    const c = read("lib/research/contracts.ts");
    expect(c).toMatch(/export interface SourcingContradictionRecord \{/);
    expect(c, "contradiction_type is part of the frozen m4c-1.0.0 shape").toMatch(/contradiction_type:\s*string;/);
    expect(c, "the RECORD contract must still be m4c-1.0.0").toMatch(/SOURCING_CONTRADICTION_CONTRACT_VERSION = "m4c-1\.0\.0"/);
  });

  it("the container carries its OWN version, never the record's", () => {
    // Bumping m4c for a container rename would announce that the frozen record shape had moved —
    // the exact claim the freeze exists to prevent.
    const c = read("lib/research/contracts.ts");
    expect(c).toMatch(/SOURCING_LOGIC_CONTAINER_VERSION = "sl-2\.0\.0"/);
  });

  it("no production code still reads the old container field directly", () => {
    // Tests and fixtures may name it (they assert the legacy shape reads); production must go
    // through the tolerant reader, or a pre-rename row silently reads as empty.
    const files = ["lib/research/synthesisEngine.ts", "components/admin/case-review.tsx"];
    const offenders = files.filter((f) => /sourcing_logic\??\.contradictions/.test(read(f)));
    expect(
      offenders,
      `these read Track 5's old field directly instead of readCoherenceConflicts():${NL}${offenders.join(NL)}`,
    ).toEqual([]);
  });
});

describe("LOCK — the reader never reaches a client bundle through the engine", () => {
  it("it is defined outside lib/research and imported type-only from it", () => {
    // s2.locks.test.ts forbids runtime `@/lib/research/` imports in "use client" files, and it
    // caught this on the first attempt. The function lives here so ONE definition serves both
    // bundles rather than the panel carrying its own copy.
    const src = read("lib/portal/coherenceConflicts.ts");
    expect(src, "the contracts import must stay type-only or the client bundle leaks the engine")
      .toMatch(/import type \{[^}]*\} from "@\/lib\/research\/contracts";/);
    const panel = read("components/admin/case-review.tsx");
    expect(panel, "the client panel must import the reader from lib/portal, never lib/research")
      .toMatch(/from "@\/lib\/portal\/coherenceConflicts"/);
  });
});
