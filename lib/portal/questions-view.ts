import type { QuestionToAsk, AdditionalQuestion } from "@/lib/research/contracts";

// Phase 5.1c (ADR-T2-002 follow-up) — the two-source questions merge for the review/report surfaces.
// System questions (immutable AI output, per Track 2 row) and additional questions (analyst/review-team,
// case-level) are NEVER mixed at the data layer — they are merged HERE with a neutral `source` tag.
// The admin UI shows literal source labels; the client-facing copy ("From our research" / "From our
// review team") is a Phase H concern applied over this same `source` tag — no schema change needed then.

export type QuestionSource = "system" | "additional";
export interface DisplayQuestion {
  question: string;
  reason: string;
  brand: string;
  priority: "high" | "medium" | "low";
  blocking_weight_key?: string; // system only
  required?: boolean;           // additional only
  id?: string;                  // additional only (edit/delete target)
  source: QuestionSource;
}

export function systemQuestions(tracks: { questions_to_ask: QuestionToAsk[] }[]): DisplayQuestion[] {
  return tracks.flatMap((t) => t.questions_to_ask ?? []).map((q) => ({
    question: q.question,
    reason: q.reason,
    brand: q.brand,
    priority: q.priority,
    blocking_weight_key: q.blocking_weight_key,
    source: "system" as const,
  }));
}

export function additionalToDisplay(items: AdditionalQuestion[]): DisplayQuestion[] {
  return items.map((a) => ({
    id: a.id,
    question: a.question,
    reason: a.reason ?? "",
    brand: a.brand ?? "",
    priority: a.priority ?? "medium",
    required: a.required ?? false,
    source: "additional" as const,
  }));
}

export function mergeCaseQuestions(
  tracks: { questions_to_ask: QuestionToAsk[] }[],
  additional: AdditionalQuestion[],
): DisplayQuestion[] {
  return [...systemQuestions(tracks), ...additionalToDisplay(additional)];
}
