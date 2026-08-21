import "server-only";

// ── CLOUDMERSIVE VIRUS SCAN (founder-ruled: BLOCKING at upload, FAIL-CLOSED) ─────────────────
//
// The ruled wiring (ADR-EMAIL-001 §virus-scanning + the Cloudmersive key ruling):
//   · BLOCKING: every uploaded document is scanned BEFORE any storage write and BEFORE charge.
//   · FAIL-CLOSED: no key, scanner unreachable, timeout, or a malformed answer → the upload is
//     REFUSED with a plain client-facing message. An unscanned file never enters the bucket.
//     STATED CONSEQUENCE (founder-acknowledged): a Cloudmersive outage stops document uploads on
//     every plan that takes them (single_149 and up) until it recovers — deliberate, because the
//     alternative is unscanned files in the bucket.
//   · The verdict is AUDITED either way (the caller writes audit_log; this module only scans).
//
// Env: CLOUDMERSIVE_API_KEY (one var, the `Apikey` header). Free-tier friendly: one call per file.
//
// TESTING WITHOUT REAL MALWARE: the EICAR test file — the industry-standard, harmless antivirus
// test string. Every scanner (Cloudmersive included) reports it as infected by convention.
//   printf 'X5O!P%%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
// (Then wrap it in a PDF/PNG if the type sniffer rejects .txt — or scan it directly via curl.)

export type ScanVerdict =
  | { verdict: "clean" }
  | { verdict: "infected"; viruses: string[] }
  | { verdict: "unavailable"; reason: string };

export function virusScanConfigured(): boolean {
  return !!process.env.CLOUDMERSIVE_API_KEY;
}

const SCAN_URL = "https://api.cloudmersive.com/virus/scan/file";
const SCAN_TIMEOUT_MS = 30_000;

export async function scanFileForViruses(buffer: Buffer | Uint8Array, fileName: string): Promise<ScanVerdict> {
  const key = process.env.CLOUDMERSIVE_API_KEY;
  if (!key) return { verdict: "unavailable", reason: "no_api_key" };

  const form = new FormData();
  form.append("inputFile", new Blob([Buffer.from(buffer)]), fileName || "upload");

  try {
    const res = await fetch(SCAN_URL, {
      method: "POST",
      headers: { Apikey: key },
      body: form,
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
    });
    if (!res.ok) return { verdict: "unavailable", reason: `http_${res.status}` };
    const body = (await res.json().catch(() => null)) as { CleanResult?: boolean; FoundViruses?: { FileName?: string; VirusName?: string }[] | null } | null;
    // FAIL-CLOSED on shape: only an explicit CleanResult:true is clean.
    if (body?.CleanResult === true) return { verdict: "clean" };
    if (body?.CleanResult === false) {
      return { verdict: "infected", viruses: (body.FoundViruses ?? []).map((v) => v.VirusName ?? "unknown").filter(Boolean) };
    }
    return { verdict: "unavailable", reason: "malformed_response" };
  } catch (e) {
    return { verdict: "unavailable", reason: e instanceof Error && e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/** Plain client-facing refusal copy — no jargon, no scanner branding, no alarm vocabulary. */
export const SCAN_UNAVAILABLE_MESSAGE =
  "Document scanning is temporarily unavailable, so we can't accept uploads right now. Please try again shortly, or submit without documents.";
export const SCAN_INFECTED_MESSAGE =
  "One of your files didn't pass our security screening and can't be accepted. Please check the file and try a clean copy.";
