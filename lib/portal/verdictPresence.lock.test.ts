import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── CALLER LOCK (founder-locked 2026-08-22, item 4 — the grant-validity lock pattern, reused
// by name): NO render-layer file may fall back TO A VERDICT VALUE. The four fabrication sites
// (report-view ×2, renderReportPdf, reportTemplate) are gone; this walk keeps the next one from
// being written. Falling back to an honest NON-verdict ("pending", "—") stays legal — absence
// may be NAMED, never REPLACED.
//
// Scope is the RENDER LAYERS on purpose: app/, components/, lib/pdf, lib/portal, lib/email,
// lib/content. The engine (lib/research) computes verdicts and is frozen — it is not a render
// surface and this lock must never create pressure to edit it.

const repo = path.resolve(__dirname, "../..");
const SCOPES = ["app", "components", "lib/pdf", "lib/portal", "lib/email", "lib/content"];
const SHARED = "lib/portal/verdictPresence.ts";

// A `?? <verdict literal>` or `?? SOMETHING.<verdict key>` is a fabricated verdict.
const VERDICT_KEYS = "source_clear|usable_with_conditions|verify_before_purchase|do_not_rely";
const FABRICATIONS = [
  new RegExp(`\\?\\?\\s*["'](?:${VERDICT_KEYS})["']`),
  new RegExp(`\\?\\?\\s*[A-Za-z_$][\\w$.]*\\.(?:${VERDICT_KEYS})\\b`),
];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p);
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) return [];
    return [path.relative(repo, p).replace(/\\/g, "/")];
  });
}

describe("LOCK — a missing verdict is never replaced by a verdict, anywhere in the render layers", () => {
  it("no file falls back to a verdict value", () => {
    const offenders: string[] = [];
    for (const scope of SCOPES) {
      for (const f of walk(path.join(repo, scope))) {
        if (f === SHARED) continue;
        const src = fs.readFileSync(path.join(repo, f), "utf8");
        for (const re of FABRICATIONS) {
          if (re.test(src)) { offenders.push(`${f} → ${re}`); break; }
        }
      }
    }
    expect(offenders, `these files fabricate a verdict on absence — import lib/portal/verdictPresence instead:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the guarded surfaces read the shared module", () => {
    for (const f of [
      "lib/pdf/renderReportPdf.ts",
      "lib/pdf/reportTemplate.ts",
      "components/portal/report-view.tsx",
      "components/admin/case-review.tsx",
      "app/(portal)/portal/cases/[id]/page.tsx",
    ]) {
      const src = fs.readFileSync(path.join(repo, f), "utf8");
      expect(src.includes('from "@/lib/portal/verdictPresence"'), `${f} must derive verdict presence from the shared module`).toBe(true);
    }
  });

  it("the honest non-verdict fallback stays legal (badges' 'pending') — absence named, not replaced", () => {
    const src = fs.readFileSync(path.join(repo, "components/portal/badges.tsx"), "utf8");
    expect(src).toContain('?? "pending"'); // if this changes shape, re-examine — do not silently drop the distinction
  });
});
