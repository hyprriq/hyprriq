import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CRON_REGISTRY, assessCron, type CronId, type Heartbeat } from "./heartbeat";
import { skipOutsideProduction, isVercelProduction } from "./productionOnly";

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

describe("LOCK — the production-only gate (founder-ruled 2026-08-31)", () => {
  // THE RULE: "anything that writes, deletes or emails a client is production-only. Read-only
  // checks can run in both." Both environments schedule against the SAME database — demonstrated,
  // not theorised: pipeline-watchdog recorded two heartbeats four seconds apart within minutes of
  // shipping, one per environment.

  it("every cron is CLASSIFIED — a new one cannot ship undecided", () => {
    // The whole point. An unclassified cron would default to running everywhere, which is the
    // permissive direction, and for retention-sweep that means deleting client documents twice.
    for (const c of crons) {
      const spec = CRON_REGISTRY[c.id as CronId];
      expect(spec, `${c.id} is not in CRON_REGISTRY`).toBeDefined();
      expect(typeof spec.productionOnly, `${c.id} has no productionOnly classification`).toBe("boolean");
      expect(spec.why.length, `${c.id} has no stated reason for its classification`).toBeGreaterThan(10);
    }
  });

  it("every production-only cron actually CALLS the gate", () => {
    // Classified is not gated. The registry is documentation; this is the behaviour.
    const ungated: string[] = [];
    for (const c of crons) {
      const spec = CRON_REGISTRY[c.id as CronId];
      if (!spec?.productionOnly) continue;
      if (!/skipOutsideProduction\(\)/.test(strip(c.src))) ungated.push(`${c.id} (${c.file})`);
    }
    expect(
      ungated,
      // Joined with a separator rather than an escaped newline: writing "\n" through the tooling
      // that generated this file produced a LITERAL newline and broke the parse — standing rule 11's
      // family, and the third time this session. It fails loudly here; the backspace variant does not.
      "these are classified production-only but do NOT call skipOutsideProduction(), so they run " +
        "from staging against the shared production database: " + ungated.join(" · "),
    ).toEqual([]);
  });

  it("the destructive one is gated, named explicitly", () => {
    // retention-sweep permanently deletes client documents. It gets its own assertion so that a
     // refactor which loosens the general rule still trips on the job that matters most.
    const rs = crons.find((c) => c.id === "retention-sweep");
    expect(rs, "retention-sweep is not registered").toBeDefined();
    expect(CRON_REGISTRY["retention-sweep"].productionOnly).toBe(true);
    expect(strip(rs!.src)).toMatch(/skipOutsideProduction\(\)/);
    // and its independent RETENTION_SWEEP_ENABLED control must survive alongside the gate
    expect(strip(rs!.src), "the deliberate enable flag must remain a SECOND control")
      .toMatch(/RETENTION_SWEEP_ENABLED/);
  });

  it("uses VERCEL_ENV, never NODE_ENV", () => {
    // NODE_ENV is "production" on every deployed build, previews included — using it would defeat
    // the gate exactly where it matters. Same reasoning as the live-Stripe-key guard.
    const gate = read("lib/inngest/productionOnly.ts");
    expect(gate).toMatch(/process\.env\.VERCEL_ENV === "production"/);
    expect(/process\.env\.NODE_ENV/.test(strip(gate)), "NODE_ENV must play no part").toBe(false);
  });

  it("the gate runs BEFORE the heartbeat, so a skipped run records nothing", () => {
    // Otherwise /admin/integrity would show two beats per interval and the founder would be reading
    // staging's heartbeat as evidence that production ran.
    for (const c of crons) {
      const spec = CRON_REGISTRY[c.id as CronId];
      if (!spec?.productionOnly) continue;
      const code = strip(c.src);
      const gateAt = code.indexOf("skipOutsideProduction()");
      const beatAt = code.search(new RegExp(String.raw`recordHeartbeat\(\s*"${c.id}"`));
      if (beatAt === -1) continue;
      expect(gateAt, `${c.id}: the heartbeat is written before the gate`).toBeLessThan(beatAt);
    }
  });
});

describe("LOCK — the gate actually gates", () => {
  // ⚠ THE FUNCTION TESTS STUB VERCEL_ENV=production so they exercise the real work. That means
  // NOTHING ELSE EVER EXERCISES THE SKIP PATH — and a gate nobody tests is a gate that can silently
  // stop gating. Standing rule 14: prove the instrument looked. These four cases are the proof.
  afterEach(() => { vi.unstubAllEnvs(); });

  it("skips on preview, on staging and locally", () => {
    for (const env of ["preview", "development", ""]) {
      vi.stubEnv("VERCEL_ENV", env);
      expect(isVercelProduction(), `VERCEL_ENV=${env || "(unset)"} must not count as production`).toBe(false);
      expect(skipOutsideProduction()?.skipped).toBe("skipped:not_production");
    }
  });

  it("runs on a Vercel production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isVercelProduction()).toBe(true);
    expect(skipOutsideProduction()).toBeNull();
  });

  it("NODE_ENV=production alone does NOT open the gate", () => {
    // The trap that makes this worth a test: NODE_ENV is "production" on every deployed build,
    // previews included. A gate keyed on it would be open exactly where it must be shut.
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    expect(isVercelProduction(), "a preview build must stay gated whatever NODE_ENV says").toBe(false);
  });
});
