import type { AdditionalQuestion } from "@/lib/research/contracts";

// Phase 5.1c (ADR-T2-002 follow-up) — pure, deterministic mutations over the cases.additional_questions
// array (analyst/review-team questions). The API route supplies audit meta (id/created_by/created_at,
// edited_by/edited_at) and persists the result; these functions never touch I/O. Edits are NEVER silent:
// the prior field values are snapshotted into `history` before overwriting.

type Priority = "high" | "medium" | "low";
export interface AddInput { question: string; reason?: string; brand?: string; priority?: Priority; required?: boolean }
export interface AddMeta { id: string; created_by: string; created_at: string }
export interface EditInput { question?: string; reason?: string; brand?: string; priority?: Priority; required?: boolean }
export interface EditMeta { edited_by: string; edited_at: string }

const clean = (s: string | undefined): string | undefined => {
  const t = (s ?? "").trim();
  return t.length ? t : undefined;
};

export function addQuestion(list: AdditionalQuestion[], input: AddInput, meta: AddMeta): AdditionalQuestion[] {
  return [...list, {
    id: meta.id,
    question: input.question.trim(),
    reason: clean(input.reason),
    brand: clean(input.brand),
    priority: input.priority ?? "medium",
    required: input.required ?? false,
    created_by: meta.created_by,
    created_at: meta.created_at,
  }];
}

export function editQuestion(list: AdditionalQuestion[], id: string, changes: EditInput, meta: EditMeta): AdditionalQuestion[] {
  return list.map((q) => {
    if (q.id !== id) return q;
    const snapshot = {
      edited_at: meta.edited_at,
      edited_by: meta.edited_by,
      previous_question: q.question,
      previous_reason: q.reason,
      previous_brand: q.brand,
      previous_priority: q.priority,
      previous_required: q.required,
    };
    return {
      ...q,
      question: changes.question !== undefined ? changes.question.trim() : q.question,
      reason: changes.reason !== undefined ? clean(changes.reason) : q.reason,
      brand: changes.brand !== undefined ? clean(changes.brand) : q.brand,
      priority: changes.priority ?? q.priority,
      required: changes.required ?? q.required,
      history: [...(q.history ?? []), snapshot],
    };
  });
}

export function deleteQuestion(list: AdditionalQuestion[], id: string): AdditionalQuestion[] {
  return list.filter((q) => q.id !== id);
}
