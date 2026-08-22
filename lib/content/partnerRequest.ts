import { EMAIL_RE } from "@/lib/utils/emailAddress";

// ── PARTNER REQUEST — options, copy, and validation in ONE module (founder-ruled 2026-08-22,
// item 1: the /partners mailto is dead; a cold visitor files an in-page request instead).
//
// This module is deliberately isomorphic (no server imports): the form renders from it, the API
// validates with it, the SQL CHECK constraints mirror its option values, and the MUST_PASS
// banned-language fixture imports its copy — one source, nothing re-typed.
//
// RULED HARD (1c): a request is a request. Nothing here — copy included — creates, reserves, or
// promises a grant. The confirmation says we'll read it and reply, with a real timeframe, and
// never "your free assessment is on the way": the founder may say no, and copy must not promise
// an outcome the flow doesn't control. Tier names never appear ("a full assessment" only).

export const ROLE_OPTIONS = [
  { value: "va", label: "Sourcing VA" },
  { value: "agency", label: "Sourcing agency" },
  { value: "consultant", label: "Consultant" },
  { value: "other", label: "Something else" },
] as const;

export const CLIENTS_BAND_OPTIONS = [
  { value: "1-2", label: "1–2 clients" },
  { value: "3-10", label: "3–10 clients" },
  { value: "11-50", label: "11–50 clients" },
  { value: "50+", label: "More than 50" },
] as const;

export type PartnerRole = (typeof ROLE_OPTIONS)[number]["value"];
export type ClientsBand = (typeof CLIENTS_BAND_OPTIONS)[number]["value"];

export interface PartnerRequestInput {
  name: string;
  email: string;
  role: PartnerRole;
  clientsBand: ClientsBand;
  note: string | null;
  marketingOptIn: boolean;
}

// ── Copy (every client-facing string joins MUST_PASS in the same commit — standing rule 8) ──
export const PARTNER_REQUEST_COPY = {
  intro:
    "Tell us what you source and for how many clients. We read every request personally and reply within 2 business days, whatever the answer — if it's a fit, we'll set you up to try a full assessment on a supplier you're actually evaluating.",
  submit: "Request access",
  confirmed:
    "Got it — your request is in. We read every request personally and you'll hear back within 2 business days, whatever the answer.",
  unavailable: "Requests aren't open quite yet — check back soon.",
  error: "That didn't go through — try again in a moment.",
  rateLimited: "Too many requests from this connection — try again in an hour.",
  consentLabel: "Also send me occasional notes on supplier verification and sourcing. Unsubscribe any time.",
} as const;

// Shown when an invite link is clicked after it was revoked, expired, or fully used (click-time
// honesty, 2026-08-22): no banner, no false promise — just the truth and the open path.
export const INVITE_LINK_INACTIVE_COPY =
  "This invite link is no longer active. If it was sent to you directly, reply to whoever sent it — or request an assessment below.";

const roleValues = ROLE_OPTIONS.map((o) => o.value);
const bandValues = CLIENTS_BAND_OPTIONS.map((o) => o.value);

/**
 * Server-side validation — the API trusts THIS, never the form (1h). Returns the cleaned input
 * or a field-named error string. Length caps are hard: every field is attacker-writable.
 */
export function parsePartnerRequest(body: unknown): { input: PartnerRequestInput; error: null } | { input: null; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 120) return { input: null, error: "invalid_name" };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return { input: null, error: "invalid_email" };
  const role = typeof b.role === "string" && (roleValues as string[]).includes(b.role) ? (b.role as PartnerRole) : null;
  if (!role) return { input: null, error: "invalid_role" };
  const clientsBand =
    typeof b.clientsBand === "string" && (bandValues as string[]).includes(b.clientsBand) ? (b.clientsBand as ClientsBand) : null;
  if (!clientsBand) return { input: null, error: "invalid_clients_band" };
  const rawNote = typeof b.note === "string" ? b.note.trim() : "";
  if (rawNote.length > 1000) return { input: null, error: "invalid_note" };
  return {
    input: { name, email, role, clientsBand, note: rawNote || null, marketingOptIn: b.marketingOptIn === true },
    error: null,
  };
}

export function roleLabel(role: PartnerRole): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export function clientsBandLabel(band: ClientsBand): string {
  return CLIENTS_BAND_OPTIONS.find((o) => o.value === band)?.label ?? band;
}
