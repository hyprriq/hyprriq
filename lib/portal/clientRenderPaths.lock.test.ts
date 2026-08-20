import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE LOCK: NO CLIENT-FACING RENDER PATH MAY READ RAW TRACK ROWS.
// (Founder-ruled 2026-08-18, §1 — "PLUS a lock test", freeze-test pattern.)
//
// WHY A SOURCE-LEVEL LOCK AND NOT A UNIT TEST: the P0 was not a wrong value, it was a ROUTE — and
// the ruling was explicit that the render-path inventory is part of the fix, because "the cleaner
// defect explains the leak but does not rule out a second uncleaned route". A unit test proves the
// projection cleans what it is given. Only a lock proves nobody built a path that never gives it
// anything. The inventory that produced this list is in the commit; this keeps it true.
//
// The rule: raw `compiled_findings_json` is the OPERATOR's surface. It legitimately carries src_N
// (the founder's ruled source-checking leverage). Any file that renders to a CLIENT must reach it
// only through the projection — projectFindingJsonForClient + cleanClientFindingJson — which is
// where the presence checkpoint is bound.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const REPO = path.resolve(__dirname, "../..");
const RAW_FIELD = "compiled_findings_json";

// Client-facing render paths, as inventoried 2026-08-18. Adding a client surface means adding it
// here — that is the point of the list, not an inconvenience.
const CLIENT_RENDER_PATHS = [
  "lib/data/cases.ts",                    // portal — getCaseFindings
  "lib/pdf/renderReportPdf.ts",           // PDF — the delivered artifact
  "lib/pdf/reportTemplate.ts",            // PDF — the pure template
  "lib/portal/finding-view.ts",           // portal — per-finding view helpers
  "components/portal/report-view.tsx",    // portal — the report component
  "lib/email/notify.ts",                  // email — delivery notification
];

// The sanctioned projection entry points. A client path touching the raw field is only acceptable
// if it hands it straight to one of these in the same file.
const PROJECTION_ENTRY = /projectFindingJsonForClient|cleanClientFindingJson|buildClientFindings/;

const read = (rel: string): string => fs.readFileSync(path.join(REPO, rel), "utf8");

describe("LOCK — client render paths reach findings only through the projection", () => {
  for (const rel of CLIENT_RENDER_PATHS) {
    it(`${rel} does not read raw track rows outside the projection`, () => {
      const src = read(rel);
      if (!src.includes(RAW_FIELD)) return; // never touches it — trivially safe

      // It touches the field. Then either it projects in this file, or it only reads the field off
      // an ALREADY-PROJECTED Finding object (the portal components' shape), never off a DB row.
      const projectsHere = PROJECTION_ENTRY.test(src);
      const selectsFromTrackRows = /\.from\(\s*["'`]case_track_results["'`]\s*\)/.test(src);

      expect(
        projectsHere || !selectsFromTrackRows,
        `${rel} reads ${RAW_FIELD} straight from case_track_results without going through the ` +
          `projection. Raw rows carry src_N by founder ruling — that is the operator's leverage, ` +
          `not client bytes. Route it through projectFindingJsonForClient + cleanClientFindingJson.`,
      ).toBe(true);
    });
  }
});

describe("LOCK — the checkpoint stays bound to the sanctioned projection entry points", () => {
  it("cleanClientFindingJson and projectClientReport both assert at their tails", () => {
    const src = read("lib/portal/clientReport.ts");
    expect(src).toContain("assertNoInternalTokens");
    // Both bindings present — if either is deleted, everything built on it silently loses the
    // backstop it was supposed to inherit BY CONSTRUCTION.
    expect(src).toMatch(/checkpoint\(out, `cleanClientFindingJson/);
    expect(src).toMatch(/checkpoint\(report, "projectClientReport"/);
  });

  it("the publish route asserts over the PROJECTED payload, not the raw rows", () => {
    // 2026-08-20: the checkpoint composition moved into the ONE shared gate (publishGate.ts); the
    // route consumes it and still REFUSES. The lock follows: the projection walk lives in the
    // gate, the refusal lives in the route.
    const gateSrc = read("lib/portal/publishGate.ts");
    expect(gateSrc).toContain("findInternalTokens");
    expect(gateSrc).toContain("projectedForClient");
    const src = read("app/api/admin/cases/[id]/review/route.ts");
    expect(src).toContain("composePublishGate");
    // The refusal must be a real refusal, not an advisory log.
    expect(src).toMatch(/error:\s*"internal_tokens"/);
  });

  it("the PDF render asserts before returning content", () => {
    expect(read("lib/pdf/renderReportPdf.ts")).toContain("assertNoInternalTokens");
  });

  it("⛔ the PDF template does NOT strip tokens — widening it into a cleaner is the ruled defect", () => {
    const tpl = read("lib/pdf/reportTemplate.ts");
    expect(tpl).not.toMatch(/src_\\d|stripInternalRefs|cleanClientProse/);
  });
});
