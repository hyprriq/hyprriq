import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CRON_REGISTRY, assessCron, type CronId, type Heartbeat } from "./heartbeat";

const repo = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ── LOCK — EVERY CRON HAS AN UNCONDITIONAL HEARTBEAT (founder-ruled 2026-08-31) ───────────────
//
// ⚠ THE DEFECT THIS CLOSES, in the founder's words: "five of seven currently cannot be
// distinguished from never having run, and that is rule 14 at the infrastructure level."
//
// Six of the seven crons wrote to the database ONLY when they had something to report. The seventh,
// the integrity sweep, wrote unconditionally — and that is the ONLY reason anyone discovered it had
// been failing for six days on a NOT NULL violation. Had it been silent-when-clean like the others,
// it would still be failing and the health page would still look calm.
//
// A registry that silently omits a cron rebuilds exactly that blind spot, so this lock derives the
// truth from `app/api/inngest/route.ts` — the file that actually registers the functions — rather
// than trusting the registry to be complete.

const ROUTE = read("app/api/inngest/route.ts");
const FN_DIR = "lib/inngest/functions";

/** Every function file registered on the serve route, with its source. */
function registeredFunctionFiles(): { file: string; src: string }[] {
  const out: { file: string; src: string }[] = [];
  for (const m of ROUTE.matchAll(/from "@\/lib\/inngest\/functions\/([\w-]+)"/g)) {
    const file = `${FN_DIR}/${m[1]}.ts`;
    if (fs.existsSync(path.join(repo, file))) out.push({ file, src: read(file) });
  }
  return out;
}

/** Every createFunction that carries a cron trigger, by its declared id. */
function cronFunctions(): { id: string; file: string; cron: string; src: string }[] {
  const out: { id: string; file: string; cron: string; src: string }[] = [];
  for (const { file, src } of registeredFunctionFiles()) {
    for (const m of src.matchAll(/id:\s*"([\w-]+)"[\s\S]{0,400}?cron:\s*"([^"]+)"/g)) {
      out.push({ id: m[1], file, cron: m[2], src });
    }
  }
  return out;
}

const crons = cronFunctions();

describe("LOCK — the cron scanner can see (self-test)", () => {
  it("finds cron-triggered functions on the serve route at all", () => {
    // Proof of life before any assertion below is worth reading. A scanner returning [] would make
    // every completeness check pass while policing nothing.
    expect(
      crons.length,
      "no cron-triggered functions found on app/api/inngest/route.ts — the scanner is broken, " +
        "not the codebase",
    ).toBeGreaterThanOrEqual(7);
  });

  it("reads real cron expressions, not empty strings", () => {
    for (const c of crons) {
      expect(c.cron, `${c.id} parsed an empty cron expression`).toMatch(/[\d*]/);
    }
  });
});

describe("LOCK — every registered cron has a heartbeat", () => {
  it("appears in CRON_REGISTRY", () => {
    const missing = crons.filter((c) => !(c.id in CRON_REGISTRY)).map((c) => `${c.id} (${c.file})`);
    expect(
      missing,
      "a cron is registered on the serve route but missing from CRON_REGISTRY, so it would never " +
        "appear on /admin/integrity — the exact blind spot the heartbeats exist to close:\n" +
        missing.join("\n"),
    ).toEqual([]);
  });

  it("and the registry carries no cron that is NOT registered", () => {
    // The mirror. A stale registry entry would render a permanently "never ran" row on the health
    // page for a job that no longer exists — a false alarm that trains the founder to ignore the page.
    const ids = new Set(crons.map((c) => c.id));
    const ghosts = (Object.keys(CRON_REGISTRY) as CronId[]).filter((id) => !ids.has(id));
    expect(ghosts, "CRON_REGISTRY lists a cron that is not registered on the serve route").toEqual([]);
  });

  it("actually CALLS recordHeartbeat with its own id", () => {
    // Being in the registry is not enough — the function has to write the row.
    const silent: string[] = [];
    for (const c of crons) {
      const code = strip(c.src);
      // WHITESPACE-TOLERANT, and the first version was not: three of the seven calls wrap their
      // arguments onto the next line, and a same-line substring check reported all three as silent.
      // A false positive in a lock is not harmless — it is the thing that gets the lock deleted.
      const calls = new RegExp(String.raw`recordHeartbeat\(\s*"${c.id}"`);
      if (!calls.test(code)) silent.push(`${c.id} (${c.file})`);
    }
    expect(
      silent,
      "these crons record no heartbeat, so a failed or missed run is indistinguishable from a " +
        "clean one:\n" + silent.join("\n"),
    ).toEqual([]);
  });

  it("the registry's declared interval matches the actual cron expression", () => {
    // A registry interval that drifts from the schedule makes the overdue threshold meaningless —
    // it would either cry wolf every day or never fire at all.
    const expected: Record<string, number> = {};
    for (const c of crons) {
      const [min, hour] = c.cron.split(/\s+/);
      if (min.startsWith("*/")) expected[c.id] = Number(min.slice(2)) / 60;
      else if (hour === "*") expected[c.id] = 1;
      else expected[c.id] = 24;
    }
    for (const c of crons) {
      const spec = CRON_REGISTRY[c.id as CronId];
      if (!spec) continue;
      expect(
        spec.intervalHours,
        `${c.id}: cron is "${c.cron}" (${expected[c.id]}h) but the registry says ${spec.intervalHours}h`,
      ).toBeCloseTo(expected[c.id], 5);
    }
  });
});

describe("LOCK — the overdue rule", () => {
  const beat = (isoOffsetHours: number): Heartbeat => ({
    cron_id: "integrity-sweep",
    ran_at: new Date(Date.UTC(2026, 7, 31, 12) - isoOffsetHours * 3_600_000).toISOString(),
    summary: "x",
  });
  const NOW = Date.UTC(2026, 7, 31, 12);

  it("overdue at MORE than twice the interval, not at twice (founder-ruled)", () => {
    // integrity-sweep is daily → the threshold is 48h.
    expect(assessCron("integrity-sweep", beat(47), NOW).state).toBe("ok");
    expect(assessCron("integrity-sweep", beat(49), NOW).state).toBe("overdue");
  });

  it("a cron that has NEVER recorded a run is its own state, never 'ok'", () => {
    // The whole point of the page: absence is not health. Same ruling as "never checked" on the
    // sweep — the absence of a finding is not the presence of a check.
    const health = assessCron("retention-sweep", null, NOW);
    expect(health.state).toBe("never");
    expect(health.lastRun).toBeNull();
  });

  it("the hourly alarm is judged on hours, not days", () => {
    expect(assessCron("stalled-case-alarm", beat(1.5), NOW).state).toBe("ok");
    expect(assessCron("stalled-case-alarm", beat(3), NOW).state).toBe("overdue");
  });
});

describe("LOCK — the integrity sweep's read matches its write", () => {
  // ⚠ THE BUG THAT STARTED THIS. The sweep wrote `record_id: null` into a NOT NULL column and threw
  // on every run for six days. Fixing it moved the row to table_name "system" — and the READ had to
  // move with it, in TWO places. A mismatch returns null forever and the page says "Never checked"
  // while the sweep works perfectly, which is the same false reading in a new costume.
  const sweep = read("lib/inngest/functions/integritySweep.ts");
  const latest = read("lib/integrity/latest.ts");

  it("never writes a null record_id again", () => {
    expect(
      /record_id:\s*null/.test(strip(sweep)),
      "audit_log.record_id is text NOT NULL — a null here throws on every single run",
    ).toBe(false);
  });

  it("write and read agree on the table name", () => {
    expect(strip(sweep), "the sweep must write with SYSTEM_TABLE").toMatch(/table_name:\s*SYSTEM_TABLE/);
    expect(strip(sweep), "load-previous must read SYSTEM_TABLE").toMatch(/eq\("table_name",\s*SYSTEM_TABLE\)/);
    expect(strip(latest), "the page's reader must read SYSTEM_TABLE").toMatch(/eq\("table_name",\s*SYSTEM_TABLE\)/);
  });
});
