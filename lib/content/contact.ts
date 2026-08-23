// ── /contact — COPY AND SERVER-SIDE VALIDATION ────────────────────────────────────────────────
//
// "One form. A person reads it." — so it is a real form with a real endpoint. A control that only
// exists in the UI is not a control, and a contact form that silently goes nowhere is worse than a
// mailto, because the sender believes they have been heard.
//
// NO POSTAL ADDRESS ON THIS PAGE, on purpose (dev brief build note 5). The footer and the legal
// pages carry it. Do not add it back.
//
// NO DATABASE WRITE. There is no contact table and creating one is a migration, which stops and
// goes to the founder. The endpoint pages the founder by email instead — which is exactly what the
// copy promises. FLAGGED: that makes email the only record, so a send failure loses the message.
// A durable table is the right fix when the founder runs a migration.
//
// ⛔ CLIENT-FACING COPY. The banned-language lock scans every literal in this directory.

export const TOPICS = [
  "A supplier I'm assessing",
  "A report I've already had",
  "Billing",
  "Partner access",
  "Something else",
] as const;

export type ContactTopic = (typeof TOPICS)[number];

export const contactCopy = {
  title: "Contact",
  lede: "One form. A person reads it.",
  submit: "Send",
  /** ⚠ UNBACKED PROMISE — flagged 2026-08-24. Nothing in the system measures or enforces this the
   *  way CASE_SLA_HOURS is enforced for reports. It is a commitment about conduct, and it is the
   *  founder's to keep or to change. Kept verbatim from the closed copy. */
  hint: "We answer within 12 hours.",
  success: "Thanks — that reached us. A person will read it and reply.",
  failure: "That didn't go through. Try again in a moment, or write to us directly.",
  fields: {
    name: "Your name",
    email: "Email",
    company: "Business name (optional)",
    topic: "What's this about?",
    message: "Your message",
  },
} as const;

export const beforeYouWrite = [
  {
    lead: "If you have a case in progress",
    body: "your case page shows which area is running and the deadline on screen. That is usually faster than asking us.",
  },
  {
    lead: "If you are wondering whether we can assess a particular supplier",
    body: "we can. The supplier can be anywhere in the world. It is our clients who need to be US-based at launch.",
  },
  {
    lead: "If you have been suspended",
    body: "we are not the right people — no appeals, no plans of action, and we are not lawyers. HyprrIQ assesses suppliers before a purchase, not after one.",
  },
] as const;

export type ContactInput = {
  name: string;
  email: string;
  company: string | null;
  topic: ContactTopic;
  message: string;
};

/**
 * Server-side validation. The form is advisory; THIS is the gate — same posture as the partner
 * request intake, which learned it the same way.
 */
export function parseContactRequest(
  body: Record<string, unknown>,
): { error: string; input: null } | { error: null; input: ContactInput } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const company = str(body.company);
  const topic = str(body.topic);
  const message = str(body.message);

  if (name.length < 2 || name.length > 120) return { error: "name", input: null };
  // Deliberately permissive: an over-clever address regex rejects real addresses, and the reply
  // bounces anyway if it is wrong. Shape only.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return { error: "email", input: null };
  }
  if (company.length > 160) return { error: "company", input: null };
  if (!TOPICS.includes(topic as ContactTopic)) return { error: "topic", input: null };
  if (message.length < 10 || message.length > 4000) return { error: "message", input: null };

  return {
    error: null,
    input: { name, email, company: company || null, topic: topic as ContactTopic, message },
  };
}
