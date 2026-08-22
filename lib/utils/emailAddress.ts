// The one address-shape check for public capture surfaces (newsletter signup, partner
// requests). Deliberately loose — real validation is the reply landing; this only rejects
// strings that cannot be an address. Extracted 2026-08-22 from /api/newsletter so the partner
// request flow reuses it instead of growing a second regex.
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
