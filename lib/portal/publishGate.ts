import type { SynthesisOutput, QuestionToAsk } from "@/lib/research/contracts";
import type { ProseOverride } from "@/lib/portal/proseOverlay";
import { overlayTrackRows, overlaySynthesisClient, overlayIdentityNote } from "@/lib/portal/overlayDelivery";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import { locateBannedLanguage, type BannedHit } from "@/lib/utils/bannedLanguageReport";
import { scanSynthesisAtDelivery, scanTrackProseAtDelivery } from "@/lib/research/synthesisMethodScan";
import { scanCategoryAtDelivery } from "@/lib/research/categoryLanguage";
import {
  cleanClientFindingJson, cleanClientProse, cleanClientProseDeep,
  projectClientReport, projectFindingJsonForClient, projectQuestionsForClient,
} from "@/lib/portal/clientReport";
import { findInternalTokens, type TokenPresence } from "@/lib/portal/clientTokenCheckpoint";
import { locateSynthesisMethodLeakage, locateMethodLeakage } from "@/lib/research/methodScanReport";

// ── THE PUBLISH GATE, AS ONE COMPOSITION (2026-08-20) ────────────────────────────────────────
//
// Before this file the delivery gate existed in TWO hand-kept copies — the admin review route and
// scripts/publish-preflight.ts — with a third (the operator publish script) about to be written.
// Two copies of one gate is the drift class this codebase keeps paying for (the scanner/locator
// twin, the census/attempt skew); three would have made it structural. The route, the preflight
// and any operator harness now consume THIS function, so "what blocks a publish" has exactly one
// definition.
//
// PROSE OVERRIDES ARE APPLIED HERE, before every scanner — an override can close a block, and a
// stored override that does not land (stale text, vanished path) surfaces in `overlayFailures`,
// which every caller must treat as a REFUSAL (the overlay law: never silently not apply).
//
// This function has NO IO and writes nothing — callers load rows/synthesis/overrides and own
// their own auditing, statuses and responses.

export interface PublishGateRowLike {
  track_key: string;
  compiled_findings_json?: unknown;
  questions_to_ask?: QuestionToAsk[] | null;
}

export interface PublishGateInput<R extends PublishGateRowLike> {
  rows: R[];
  synthesis: SynthesisOutput | null;
  identityNote: string | null;
  overrides: ProseOverride[];
  additionalQuestions?: { question?: unknown; source?: string }[] | null;
  /**
   * Instruments set this: the checkpoint projections REPORT tokens instead of throwing on them
   * (allowInternalTokens), so a leaky case prints its leaks. The ROUTE omits it — its projections
   * assert, exactly as they always have.
   */
  reportOnly?: boolean;
}

export interface PublishGateResult<R extends PublishGateRowLike> {
  /** The overlaid surfaces — what the gates evaluated and what a publish would ship. */
  gateRows: R[];
  gateSynthesis: SynthesisOutput | null;
  gateIdentityNote: string | null;
  /** Overrides that did NOT land (stale/unmatched). Non-empty ⇒ the publish must refuse. */
  overlayFailures: string[];
  /** The merged violation set — the route's blocking decision. */
  violations: string[];
  /** The located sentences for the operator panel (empty when violations is empty). */
  findings: BannedHit[];
  /** The presence checkpoint over the projected client payload. Non-empty ⇒ refuse. */
  tokenLeaks: TokenPresence[];
}

export function composePublishGate<R extends PublishGateRowLike>(
  input: PublishGateInput<R>,
): PublishGateResult<R> {
  const { rows, synthesis, identityNote, overrides } = input;

  const { rows: gateRows, failures: trackOverlayFailures } = overlayTrackRows(rows, overrides);
  const synthOverlay = synthesis
    ? overlaySynthesisClient(synthesis.module_9_decision_snapshot, synthesis.module_8_vendor_questions, overrides)
    : { decision_snapshot: null, vendor_questions: null, failures: [] as string[] };
  const gateSynthesis: SynthesisOutput | null = synthesis
    ? {
        ...synthesis,
        module_9_decision_snapshot: synthOverlay.decision_snapshot as SynthesisOutput["module_9_decision_snapshot"],
        module_8_vendor_questions: synthOverlay.vendor_questions as SynthesisOutput["module_8_vendor_questions"],
      }
    : null;
  const identityOverlay = overlayIdentityNote(identityNote, overrides);
  const gateIdentityNote = identityOverlay.note;
  const overlayFailures = [...trackOverlayFailures, ...synthOverlay.failures, ...identityOverlay.failures];

  // The merged violation set — composed exactly as the route has always composed it.
  const violations = [...new Set([
    ...gateRows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json)),
    ...gateRows.flatMap((r) => scanFindingsForBannedLanguage(r.questions_to_ask)),
    ...scanFindingsForBannedLanguage(gateIdentityNote ? { client_note: gateIdentityNote } : null),
    ...(gateSynthesis ? scanFindingsForBannedLanguage({ decision_snapshot: gateSynthesis.module_9_decision_snapshot, vendor_questions: gateSynthesis.module_8_vendor_questions }) : []),
    ...(gateSynthesis ? scanSynthesisAtDelivery(gateSynthesis) : []),
    ...scanTrackProseAtDelivery(gateRows),
    ...scanCategoryAtDelivery(gateRows),
  ])];

  // The locators — the operator's worklist, kept in lockstep with the scanners above by living in
  // the same composition (the 16-vs-3 over-report happened because they were maintained apart).
  const findings: BannedHit[] = violations.length === 0 ? [] : [
    ...gateRows.flatMap((r) => locateBannedLanguage(r.compiled_findings_json, r.track_key)),
    ...gateRows.flatMap((r) => locateBannedLanguage(r.questions_to_ask, `${r.track_key} (questions)`)),
    ...locateBannedLanguage(gateIdentityNote ? { client_note: gateIdentityNote } : null, "supplier identity"),
    ...(gateSynthesis ? locateBannedLanguage({
      decision_snapshot: gateSynthesis.module_9_decision_snapshot,
      vendor_questions: gateSynthesis.module_8_vendor_questions,
    }, "synthesis") : []),
    ...(gateSynthesis ? locateSynthesisMethodLeakage(gateSynthesis) : []),
    ...gateRows.flatMap((r) =>
      locateMethodLeakage(
        {
          // ⚠ THE PROJECTION, NOT THE RAW ROW — the scanner and this locator stay in lockstep.
          [r.track_key]: r.compiled_findings_json
            ? projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key)
            : null,
          [`${r.track_key} (questions)`]: projectQuestionsForClient(r.questions_to_ask),
        },
        r.track_key,
      ),
    ),
  ];

  // The presence checkpoint — asserted over the PROJECTED payload, exactly as the client surfaces
  // compose it (lib/data/cases.ts getCaseFindings + lib/pdf/renderReportPdf.ts).
  const opts = input.reportOnly ? { allowInternalTokens: true } : undefined;
  const projectedForClient = {
    findings: gateRows.map((r) => ({
      compiled_findings_json: r.compiled_findings_json
        ? cleanClientFindingJson(
            projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key),
            r.track_key,
            opts,
          )
        : null,
      questions_to_ask: cleanClientProseDeep(projectQuestionsForClient(r.questions_to_ask)),
    })),
    client_note: gateIdentityNote ? cleanClientProse(gateIdentityNote) : null,
    report: gateSynthesis
      ? projectClientReport(
          (gateSynthesis.module_9_decision_snapshot ?? null) as unknown as Record<string, unknown> | null,
          gateSynthesis.module_8_vendor_questions,
          input.additionalQuestions ?? [],
          opts,
        )
      : null,
  };
  const tokenLeaks = findInternalTokens(projectedForClient);

  return { gateRows, gateSynthesis, gateIdentityNote, overlayFailures, violations, findings, tokenLeaks };
}
