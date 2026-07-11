import { supabaseAdmin } from "@/lib/supabase/admin";
import { finalizePack } from "./pack";
import type { EvidencePack, RawSource, AcquisitionMetric } from "./types";

// Track 4 (SO-A3, founder-signed 2026-07-11) — the document-pack builder: a new acquisition MODE on
// the same frozen-pack spine. Documents self-delete at 12 months (uploaded_files.delete_after), so
// the frozen Evidence Pack carries the EXTRACTED CONTENT, never a pointer — judgment, rejudge, and
// replay survive the file's deletion (H1's freeze-the-evidence-not-the-reference, for documents).
//
// Rules (all founder-ruled):
// - OQ-A2(b): 'clean' AND 'pending' files are read (virus scanning is schema-only today — logged to
//   the security phase; text EXTRACTION of a hostile file is low-risk vs executing it). 'infected'
//   and 'error' are NEVER read.
// - OQ-A1: text-layer extraction only (PDF text layer + plain text). Image-only documents are
//   UNREADABLE v1 — reported honestly to the track (an unknown + a question), never a source,
//   never scored negative. Model-vision extraction is a scoped fast-follow gate.
// - Sources carry the storage path as a stable pseudo-URL so distinct documents count as distinct
//   sources (pack dedupe + the H7 source-diversity cap both key on canonical URLs).
// - Extracted text is written back to uploaded_files (ocr_* columns) as a non-fatal cache, so
//   re-runs are cheap and idempotent.

const MAX_DOC_CHARS = 8000;
const TRUNCATION_MARKER = "\n[truncated — full text exceeds the pack budget; the frozen excerpt above is the reviewed content]";

interface UploadedFileRow {
  id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  virus_scan_status: string | null;
  ocr_extracted_text: string | null;
  ocr_status: string | null;
}

export interface DocumentPackResult {
  pack: EvidencePack;
  metrics: AcquisitionMetric[];
  unreadable: { file_name: string; reason: string }[];
}

const cap = (text: string): string =>
  text.length > MAX_DOC_CHARS ? text.slice(0, MAX_DOC_CHARS) + TRUNCATION_MARKER : text;

const isPdf = (f: UploadedFileRow): boolean =>
  f.file_type === "invoice_pdf" || f.file_type === "loa_pdf" || /\.pdf$/i.test(f.file_name);
const isPlainText = (f: UploadedFileRow): boolean => /\.(txt|csv|md)$/i.test(f.file_name);
const isImage = (f: UploadedFileRow): boolean =>
  f.file_type === "invoice_image" || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.file_name);

async function extractContent(f: UploadedFileRow): Promise<{ text: string | null; reason?: string }> {
  // Cache hit — a prior run (or a future OCR pipeline) already extracted this document.
  if (f.ocr_extracted_text && f.ocr_extracted_text.trim()) return { text: f.ocr_extracted_text };
  if (isImage(f)) return { text: null, reason: "image-only document — text extraction deferred to the model-vision fast-follow (OQ-A1); request a text-bearing copy" };

  const { data, error } = await supabaseAdmin.storage.from("case-documents").download(f.storage_path);
  if (error || !data) return { text: null, reason: `storage download failed: ${error?.message ?? "no data"}` };
  const buffer = new Uint8Array(await data.arrayBuffer());

  if (isPdf(f)) {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const doc = await getDocumentProxy(buffer);
      const { text } = await extractText(doc, { mergePages: true });
      const merged = Array.isArray(text) ? text.join("\n") : text;
      if (!merged || !merged.trim()) return { text: null, reason: "PDF has no text layer (scanned image?) — unreadable v1 (OQ-A1)" };
      return { text: merged };
    } catch (e) {
      return { text: null, reason: `PDF extraction failed: ${e instanceof Error ? e.message : "unknown"}` };
    }
  }
  if (isPlainText(f)) return { text: new TextDecoder().decode(buffer) };
  return { text: null, reason: "unsupported file type for text extraction (v1: PDF text layer + plain text)" };
}

export async function loadDocumentPack(caseId: string): Promise<DocumentPackResult> {
  const started = Date.now();
  const collected_at = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("uploaded_files")
    .select("id, file_name, file_type, storage_path, virus_scan_status, ocr_extracted_text, ocr_status")
    .eq("case_id", caseId)
    .is("deleted_at", null);
  if (error) throw new Error(`document pack: uploaded_files query failed: ${error.message}`);

  const files = ((data ?? []) as UploadedFileRow[])
    // OQ-A2(b): pending is readable; infected/error never are.
    .filter((f) => f.virus_scan_status !== "infected" && f.virus_scan_status !== "error");

  const sources: RawSource[] = [];
  const unreadable: { file_name: string; reason: string }[] = [];
  for (const f of files) {
    const { text, reason } = await extractContent(f);
    if (text === null) {
      unreadable.push({ file_name: f.file_name, reason: reason ?? "unreadable" });
      // Cache the outcome (non-fatal) so re-runs don't retry a known-unreadable file.
      await supabaseAdmin.from("uploaded_files").update({ ocr_status: "unreadable" }).eq("id", f.id);
      continue;
    }
    const capped = cap(text);
    if (!f.ocr_extracted_text) {
      // Non-fatal write-back cache (the schema's dormant OCR columns finally earn their keep).
      await supabaseAdmin.from("uploaded_files").update({ ocr_extracted_text: capped, ocr_status: "complete" }).eq("id", f.id);
    }
    const expires = new Date(new Date(collected_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    sources.push({
      url: f.storage_path, // stable pseudo-URL: distinct documents = distinct sources (dedupe + diversity)
      title: `${f.file_name} (${f.file_type ?? "other"})`,
      snippet: capped,
      raw: { file_id: f.id, file_type: f.file_type },
      provenance: {
        provider: "ClientUpload", provider_version: "v1", plugin: "manual", acquisition_method: "manual",
        source_profile: "user_upload", source_type: "vendor_self_assertion", authority_score: "low",
        freshness_days: null, collected_at, expires_at: expires, refresh_required: false,
      },
    });
  }

  const pack = finalizePack(caseId, "documentation_review", sources, collected_at);
  const metrics: AcquisitionMetric[] = [{
    plugin_id: "manual", latency_ms: Date.now() - started, api_cost_usd: 0,
    evidence_items_returned: sources.length, retry_count: 0, final_status: sources.length ? "ok" : "empty",
  }];
  return { pack, metrics, unreadable };
}
