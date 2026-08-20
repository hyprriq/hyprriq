// ── THE CLIENT NAME ON A PAID DELIVERABLE (founder-ruled 2026-08-20) ─────────────────────────
//
// The PDF cover printed clients.full_name — a value copied from Clerk ONCE at first visit and
// never refreshed. A client who updates their name in Clerk got the old one on the document they
// hand to their accountant. RESOLVE-DON'T-STORE, with the ruled chain:
//
//   1. the live Clerk name (what the client says their name is TODAY)
//   2. the stored clients.full_name (the fallback cache — kept, never dropped)
//   3. nothing → the renderer's existing no_client_name refusal stands unchanged
//
// company_name stays stored-only: it is OUR intake field (portal settings), not a Clerk fact.
// PURE — the Clerk lookup is the caller's job (lib/data/operatorNames.resolveOperatorName, which
// resolves any Clerk user and fails soft to null). One composer, used by the render job AND
// publish-preflight, so the instrument can never disagree with the deliverable.

export function composeClientName(
  clerkName: string | null | undefined,
  storedFullName: string | null | undefined,
  companyName: string | null | undefined,
): string {
  const person = clerkName?.trim() || storedFullName?.trim() || "";
  const company = companyName?.trim() || "";
  if (person && company) return `${person} (${company})`;
  // Company alone is a name — the old inline logic produced "(Acme)" here, brackets and all.
  return person || company;
}
