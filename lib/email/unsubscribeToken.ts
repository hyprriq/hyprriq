import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// ── UNSUBSCRIBE TOKEN (ADR-EMAIL-001, marketing side) ────────────────────────────────────────
//
// The permanent /unsubscribe route is tokenized PER ADDRESS so a link can only unsubscribe the
// address it was minted for — an email address alone must never be enough (or anyone could
// unsubscribe anyone). Token = HMAC-SHA256(lowercased email, UNSUBSCRIBE_TOKEN_SECRET), hex.
// The marketing tool gets each address's token at export time (the CSV export computes it), so
// campaign footers can link {SITE_URL}/unsubscribe?email=…&token=….
//
// Key-safe like every email sibling: no secret configured → tokens can neither be minted nor
// verified and the route says so plainly. Constant-time comparison, never string equality.

export function unsubscribeSecretConfigured(): boolean {
  return !!process.env.UNSUBSCRIBE_TOKEN_SECRET;
}

export function mintUnsubscribeToken(email: string): string | null {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = mintUnsubscribeToken(email);
  if (!expected || !/^[0-9a-f]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
}
