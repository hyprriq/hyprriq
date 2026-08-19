import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── REPORT PDF STORAGE (§4, founder-ruled) ──────────────────────────────────────────────────
//
// THE BUCKET IS PRIVATE. Founder-verified against the LIVE database 2026-08-19: `reports` and
// `case-documents` are both public=false. Nothing here may create a bucket or alter its policy —
// if the object path ever becomes publicly reachable, that is a P0, not a configuration detail.
//
// ⚠ RECORDED, NOT A §4 BLOCKER: neither bucket sets `file_size_limit` or `allowed_mime_types` at
// the BUCKET level. The upload route enforces both in code, so it is belt without braces —
// anything writing to storage outside that route is unconstrained. This module only ever writes
// application/pdf and is size-bounded by the renderer, but the bucket-level limits are still worth
// setting; it is a founder/prod action (bucket config), not a code change.
//
// ── IMMUTABILITY IS THE POINT (H1) ──
// The key carries the DELIVERED ATTEMPT: `{client_id}/{case_number}-attempt-{n}.pdf`. A dispute
// re-run creates a NEW attempt and therefore a NEW key, so the PDF a client was actually sent can
// never be rewritten underneath them. `upsert: false` makes that a storage-level guarantee rather
// than a convention someone can forget — a second render of the same attempt FAILS rather than
// silently replacing a delivered artifact.

export const REPORTS_BUCKET = "reports";

/**
 * The storage key for one delivered attempt. PURE — the same inputs always give the same key, so
 * the render job, the download route and any audit can independently derive it without sharing state.
 *
 * client_id scopes the path so a leaked key cannot be walked into another client's folder, and the
 * attempt number is IN the name so the object is per-attempt by construction.
 */
export function reportObjectKey(clientId: string, caseNumber: string, deliveredAttempt: number): string {
  return `${clientId}/${caseNumber}-attempt-${deliveredAttempt}.pdf`;
}

/** Does the immutable object already exist? Used to make the render job idempotent on retry. */
export async function reportExists(key: string): Promise<boolean> {
  const slash = key.lastIndexOf("/");
  const folder = key.slice(0, slash);
  const name = key.slice(slash + 1);
  const { data, error } = await supabaseAdmin.storage.from(REPORTS_BUCKET).list(folder, { search: name, limit: 100 });
  if (error) return false;
  return (data ?? []).some((f) => f.name === name);
}

export type StoreResult = { stored: true; key: string } | { stored: false; key: string; reason: string };

/**
 * Write the PDF once. Never overwrites.
 *
 * `upsert: false` is load-bearing: a delivered PDF is a frozen record (H1). A retry that finds the
 * object already there is a SUCCESS, not a conflict — the artifact exists and is correct — so the
 * caller can retry freely without risking a rewrite.
 */
export async function storeReportPdf(key: string, pdf: Buffer | Uint8Array): Promise<StoreResult> {
  if (await reportExists(key)) return { stored: false, key, reason: "already_exists" };
  const { error } = await supabaseAdmin.storage.from(REPORTS_BUCKET).upload(key, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) {
    // A concurrent render won the race — the object is there, which is the outcome we wanted.
    if (/exists/i.test(error.message)) return { stored: false, key, reason: "already_exists" };
    return { stored: false, key, reason: error.message };
  }
  return { stored: true, key };
}

/**
 * Minutes, not hours. The URL is re-issued per click by the authorized route, so a short life
 * costs nothing and a leaked link expires before it is useful. Never hand this to anyone whose
 * ownership of the case has not just been checked.
 */
export const SIGNED_URL_TTL_SECONDS = 300;

export async function signedReportUrl(key: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
}

/** Fetch the stored bytes — for attaching to the delivery email. */
export async function downloadReportPdf(key: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(REPORTS_BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
