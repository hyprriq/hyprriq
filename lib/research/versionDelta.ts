// ── S-2 (c) — R1, founder-RULED principle (2026-07-17): the replay preflight's job is
// ATTRIBUTION, NOT PREVENTION. rerun-batch's hard STOP stays correct for a batch spending money
// under changed rules; the replay seam (the canary's replay leg + A5's backtest) MUST run across
// versions — the backtest replays frozen attempts spanning VALIDATION 1.3.0 → 1.7.0 by design.
// What it must never do is let a version-driven divergence masquerade as extraction noise: the
// delta below is computed, printed, and written onto the replay's audit marker on EVERY replay,
// so any divergence is attributable forever. Pure functions; unit-locked. ──

export interface VersionDelta {
  changed: { key: string; stored: string; current: string }[];
  same: string[];
  unknown: string[]; // stored value unavailable (pre-IOS attempts) — stated honestly, never guessed
}

export function buildVersionDelta(
  stored: Record<string, string | null | undefined>,
  current: Record<string, string>,
): VersionDelta {
  const delta: VersionDelta = { changed: [], same: [], unknown: [] };
  for (const key of Object.keys(current)) {
    const s = stored[key];
    if (s == null || s === "") delta.unknown.push(key);
    else if (s === current[key]) delta.same.push(key);
    else delta.changed.push({ key, stored: s, current: current[key] });
  }
  return delta;
}

export function formatVersionDelta(d: VersionDelta): string {
  if (d.changed.length === 0 && d.unknown.length === 0) {
    return `✔ version delta: no version drift (${d.same.length} pinned version(s) identical to the stored attempt)`;
  }
  const parts: string[] = [];
  if (d.changed.length > 0) {
    parts.push(
      `⚠ VERSION DELTA — ATTRIBUTION RECORD (a signal divergence on this replay may be version-driven, NOT extraction noise): ` +
      d.changed.map((c) => `${c.key} ${c.stored} → ${c.current}`).join("; "),
    );
  }
  if (d.unknown.length > 0) {
    parts.push(`· stored versions unavailable for: ${d.unknown.join(", ")} (pre-IOS attempt — delta unknown, stated not guessed)`);
  }
  return parts.join("\n");
}
