import { applyProseOverrides, notApplied, type ProseOverride } from "@/lib/portal/proseOverlay";

// ── THE OVERLAY'S READERS ("Show + Fix" piece 2 — the missing half) ─────────────────────────
//
// THE DEFECT THIS FILE CLOSES, stated plainly: the override feature shipped WRITE-ONLY. The
// migration, the storage layer, the pure overlay and the admin route all existed — and nothing
// anywhere LOADED an override. The publish gate scanned the engine's raw wording (so an override
// could never unblock a publish) and the client projection rendered the engine's raw wording (so
// even a published override would never reach a reader). A feature with writers and no readers
// looks finished from every test that exercises one side.
//
// ⚖ THE CANONICAL TARGET/PATH CONVENTION — one convention, defined here, used by every writer
// and reader. paths are the overlay walker's own paths over these exact composites:
//
//   target `track:<track_key>` — over the composite { ...compiled_findings_json, questions_to_ask }
//       e.g. field_path "summary", "brand_relationship_finding", "questions_to_ask[2].reason"
//   target `synthesis`         — over { decision_snapshot, vendor_questions }
//       e.g. field_path "decision_snapshot.what_to_verify[2]", "vendor_questions[1]"
//   target `identity`          — over { client_note }
//       field_path "client_note"
//
// EVERY DELIVERY SURFACE APPLIES THIS, OR NONE MAY (the one-instrument rule): the publish gate,
// the client projection (lib/data/cases.ts + lib/data/synthesis.ts), the PDF renderer, and the
// preflight/render-check instruments all consume these helpers. A surface that skips the overlay
// re-opens the defect for exactly that surface.
//
// PURE — no IO. Loading the rows is the caller's job (lib/data/proseOverrides.getProseOverrides).

export interface TrackOverlayResult {
  compiled: Record<string, unknown> | null;
  questions: unknown;
  /** target›path labels for overrides that did NOT land (stale text or vanished path). */
  failures: string[];
}

/** Apply `track:<key>` overrides to one track row's client-bound columns. */
export function overlayTrackRecord(
  trackKey: string,
  compiled: Record<string, unknown> | null,
  questions: unknown,
  overrides: ProseOverride[],
): TrackOverlayResult {
  const mine = overrides.filter((o) => o.target === `track:${trackKey}`);
  if (mine.length === 0) return { compiled, questions, failures: [] };
  const composite: Record<string, unknown> = { ...(compiled ?? {}), questions_to_ask: questions ?? null };
  const r = applyProseOverrides(composite, `track:${trackKey}`, mine);
  const { questions_to_ask, ...rest } = r.value as Record<string, unknown> & { questions_to_ask: unknown };
  // Collision guard: a compiled field literally named questions_to_ask would be shadowed by the
  // questions column in the composite. The QUESTIONS column wins the address; the compiled field
  // survives untouched (pinned by fixture — a future collision is a visible decision, not a loss).
  const outCompiled = compiled
    ? (Object.prototype.hasOwnProperty.call(compiled, "questions_to_ask")
        ? { ...rest, questions_to_ask: compiled.questions_to_ask }
        : rest)
    : null;
  return {
    compiled: outCompiled,
    questions: questions === undefined ? undefined : questions_to_ask,
    failures: notApplied(r),
  };
}

export interface SynthesisOverlayResult {
  decision_snapshot: unknown;
  vendor_questions: unknown;
  failures: string[];
}

/** Apply `synthesis` overrides to the client-bound synthesis columns (M9 + M8 only). */
export function overlaySynthesisClient(
  decisionSnapshot: unknown,
  vendorQuestions: unknown,
  overrides: ProseOverride[],
): SynthesisOverlayResult {
  const mine = overrides.filter((o) => o.target === "synthesis");
  if (mine.length === 0) return { decision_snapshot: decisionSnapshot, vendor_questions: vendorQuestions, failures: [] };
  const r = applyProseOverrides(
    { decision_snapshot: decisionSnapshot ?? null, vendor_questions: vendorQuestions ?? null },
    "synthesis",
    mine,
  );
  const v = r.value as { decision_snapshot: unknown; vendor_questions: unknown };
  return { decision_snapshot: v.decision_snapshot, vendor_questions: v.vendor_questions, failures: notApplied(r) };
}

/** Apply the `identity` override to the identity-discrepancy client note. */
export function overlayIdentityNote(
  note: string | null,
  overrides: ProseOverride[],
): { note: string | null; failures: string[] } {
  const mine = overrides.filter((o) => o.target === "identity");
  if (mine.length === 0) return { note, failures: [] };
  const r = applyProseOverrides({ client_note: note ?? "" }, "identity", mine);
  return { note: note === null ? null : (r.value as { client_note: string }).client_note, failures: notApplied(r) };
}

/** Overlay an array of track rows in place-shape (returns NEW row objects; input untouched). */
export function overlayTrackRows<
  T extends { track_key: string; compiled_findings_json?: unknown; questions_to_ask?: unknown },
>(rows: T[], overrides: ProseOverride[]): { rows: T[]; failures: string[] } {
  if (overrides.length === 0) return { rows, failures: [] };
  const failures: string[] = [];
  const out = rows.map((r) => {
    const o = overlayTrackRecord(
      r.track_key,
      (r.compiled_findings_json as Record<string, unknown> | null) ?? null,
      r.questions_to_ask,
      overrides,
    );
    failures.push(...o.failures);
    if (o.compiled === (r.compiled_findings_json ?? null) && o.questions === r.questions_to_ask) return r;
    return { ...r, compiled_findings_json: o.compiled, questions_to_ask: o.questions };
  });
  return { rows: out, failures };
}
