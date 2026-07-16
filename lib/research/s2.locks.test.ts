import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { modelFor } from "@/lib/ai/runModel";
import { priceFor } from "@/lib/ai/providers/anthropic";
import { IOS } from "./ios";

// ── S-2 locks (founder-ruled scope, 2026-07-17). ──

describe("S-2 (a) — the ios model string is DERIVED from MODEL_CONFIG, never hardcoded", () => {
  it("modelFor exposes the config (flipping synthesis to another model is config-only, and ios follows)", () => {
    const syn = modelFor("synthesis");
    expect(syn.provider).toBe("anthropic");
    expect(typeof syn.model).toBe("string");
    expect(syn.model.length).toBeGreaterThan(0);
  });
  it("pipeline.steps.ts contains NO hardcoded model literal (the stale-memo drift rider, closed)", () => {
    const src = readFileSync(join(process.cwd(), "lib/research/pipeline.steps.ts"), "utf8");
    expect(src.includes('"claude-'), "pipeline.steps.ts hardcodes a model string — ios_version would go stale on a config flip").toBe(false);
    expect(src).toContain('modelFor("synthesis")');
  });
});

describe("S-2 (b) — synthesis_version joins the version pins (pin-first discipline)", () => {
  it("the pinned value (S-1 bumps it and updates pins in the same commit)", () => {
    expect(IOS.synthesis_version).toBe("0.0.0");
  });
  it("rerun-batch and dispute-rerun preflight the synthesis pin like the VALIDATION pin", () => {
    for (const script of ["scripts/rerun-batch.ts", "scripts/dispute-rerun.ts"]) {
      const src = readFileSync(join(process.cwd(), script), "utf8");
      expect(src.includes("IOS.synthesis_version"), `${script} must pin IOS.synthesis_version`).toBe(true);
    }
  });
  it("replay-attempt reports the version delta on every replay (R1 — attribution, never a hard stop)", () => {
    const src = readFileSync(join(process.cwd(), "scripts/replay-attempt.ts"), "utf8");
    expect(src.includes("buildVersionDelta"), "replay-attempt.ts must build the version delta").toBe(true);
    expect(src.includes("versions_delta"), "the delta must ride the replay audit marker").toBe(true);
    expect(src.includes("process.exit(1)") && /version/i.test(src) && src.includes("STOP: this code is"), "replay must NOT adopt rerun-batch's hard version STOP").toBe(false);
  });
});

// ── S-2 (e) — the client-boundary lock (ADDENDUM-2 Move 6a, delivered as a DERIVED lock: the npm
// server-only marker throws on plain-Node import and would break every founder script + vitest
// without --conditions churn; constraint on record, founder may override). Any "use client" file
// with a RUNTIME import of the engine fails BY NAME. `import type` is erased and legal. ──
describe("S-2 (e) — no client component imports the engine at runtime", () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (!name.startsWith(".") && name !== "node_modules") walk(p, out); }
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
    }
    return out;
  };
  it("every 'use client' file is free of runtime @/lib/research imports", () => {
    const root = process.cwd();
    const files = ["app", "components"].flatMap((r) => walk(join(root, r)));
    const RUNTIME_IMPORT = /import\s+(?!type\b)[^;]*?from\s+["']@\/lib\/research\//;
    const DYNAMIC_IMPORT = /import\(\s*["']@\/lib\/research\//;
    for (const p of files) {
      const src = readFileSync(p, "utf8");
      if (!/^\s*["']use client["']/m.test(src.slice(0, 200))) continue;
      const relPath = p.slice(root.length + 1).replace(/\\/g, "/");
      expect(RUNTIME_IMPORT.test(src) || DYNAMIC_IMPORT.test(src),
        `CLIENT-BUNDLE LEAK: ${relPath} is "use client" and imports @/lib/research at RUNTIME — the engine must never reach a client bundle (import type is fine)`).toBe(false);
    }
  });
});

// ── S-2 (d) — R3: cost derives from the model actually called; no price entry = LOUD zero. ──
describe("S-2 (d) — per-model pricing (AT-SYN-COST must feed OQ-S3 correct numbers)", () => {
  it("the configured track/synthesis models HAVE price entries (a config flip without a price is caught here)", () => {
    for (const task of ["track", "synthesis"] as const) {
      const { model } = modelFor(task);
      const p = priceFor(model);
      expect(p.known, `no price entry for configured model ${model} — AT-SYN-COST would misreport`).toBe(true);
      expect(p.inPerToken).toBeGreaterThan(0);
      expect(p.outPerToken).toBeGreaterThan(0);
    }
  });
  it("an unknown model prices LOUD-ZERO (attributable, never silently wrong)", () => {
    const p = priceFor("some-future-model");
    expect(p.known).toBe(false);
    expect(p.inPerToken).toBe(0);
    expect(p.outPerToken).toBe(0);
  });
});
