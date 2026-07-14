import { describe, it, expect, vi, beforeEach } from "vitest";

const { rows, download, updateEq, updateFn, extractText } = vi.hoisted(() => {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  return {
    rows: vi.fn(),
    download: vi.fn(),
    updateEq,
    updateFn: vi.fn(() => ({ eq: updateEq })), // captures the write-back payloads (F6 cache locks)
    extractText: vi.fn().mockResolvedValue({ text: "EXTRACTED PDF TEXT: wholesale invoice #123" }),
  };
});
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ is: () => rows() }) }),
      update: updateFn,
    }),
    storage: { from: () => ({ download }) },
  },
}));
vi.mock("unpdf", () => ({
  extractText,
  getDocumentProxy: vi.fn().mockResolvedValue({}),
}));

import { loadDocumentPack } from "./documentPack";

const file = (over: Record<string, unknown> = {}) => ({
  id: "f1", file_name: "invoice.pdf", file_type: "invoice_pdf", storage_path: "cases/c1/invoice.pdf",
  virus_scan_status: "pending", ocr_extracted_text: null, ocr_status: "pending", ...over,
});
const blob = () => new Blob([new Uint8Array([37, 80, 68, 70])]); // %PDF

beforeEach(() => {
  rows.mockReset(); download.mockReset(); updateEq.mockClear(); updateFn.mockClear();
  extractText.mockReset().mockResolvedValue({ text: "EXTRACTED PDF TEXT: wholesale invoice #123" });
});

// Track 4 (SO-A3, founder-signed) — the document-pack builder: frozen packs carry the EXTRACTED
// CONTENT, not a pointer (documents self-delete at 12 months; judgment must survive them — H1's
// freeze-the-evidence-not-the-reference, applied to documents).
describe("loadDocumentPack", () => {
  it("builds a frozen pack whose sources CARRY the extracted content (user_upload profile, storage-path pseudo-URL)", async () => {
    rows.mockResolvedValue({ data: [file()], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(1);
    const s = pack.sources[0];
    expect(s.snippet).toContain("EXTRACTED PDF TEXT");        // content IN the pack
    expect(s.url).toBe("cases/c1/invoice.pdf");               // stable pseudo-URL: dedupe + diversity counting
    expect(s.provenance.source_profile).toBe("user_upload");
    expect(s.provenance.acquisition_method).toBe("manual");
    expect(s.title).toContain("invoice.pdf");
    expect(pack.evidence_hash).toBeTruthy();
    expect(unreadable).toHaveLength(0);
  });

  it("uses cached ocr_extracted_text without downloading (idempotent re-runs stay cheap)", async () => {
    rows.mockResolvedValue({ data: [file({ ocr_extracted_text: "CACHED TEXT", ocr_status: "complete" })], error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources[0].snippet).toContain("CACHED TEXT");
    expect(download).not.toHaveBeenCalled();
  });

  it("OQ-A2(b): pending files ARE read; infected/error files are NEVER read", async () => {
    rows.mockResolvedValue({ data: [
      file(),
      file({ id: "f2", file_name: "bad.pdf", storage_path: "cases/c1/bad.pdf", virus_scan_status: "infected" }),
      file({ id: "f3", file_name: "err.pdf", storage_path: "cases/c1/err.pdf", virus_scan_status: "error" }),
    ], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(1);
    expect(pack.sources[0].url).toBe("cases/c1/invoice.pdf");
  });

  it("image-only documents are UNREADABLE v1 (OQ-A1) — reported honestly, never a source, never scored", async () => {
    rows.mockResolvedValue({ data: [file({ id: "f2", file_name: "scan.jpg", file_type: "invoice_image", storage_path: "cases/c1/scan.jpg" })], error: null });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0].file_name).toBe("scan.jpg");
  });

  it("FIVE documents → five distinct sources, each carrying its own content (the multi-doc front door)", async () => {
    rows.mockResolvedValue({ data: [1, 2, 3, 4, 5].map((n) =>
      file({ id: `f${n}`, file_name: `doc${n}.pdf`, storage_path: `cases/c1/doc${n}.pdf`, ocr_extracted_text: `DOC ${n} CONTENT`, ocr_status: "complete" })), error: null });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(5);
    expect(new Set(pack.sources.map((s) => s.url)).size).toBe(5); // distinct pseudo-URLs → distinct sources downstream
    expect(pack.sources.map((s) => s.snippet)).toEqual(expect.arrayContaining(["DOC 1 CONTENT", "DOC 5 CONTENT"]));
    expect(unreadable).toHaveLength(0);
  });

  it("zero uploads → empty pack (the OQ-A3 absence shape starts here)", async () => {
    rows.mockResolvedValue({ data: [], error: null });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable).toHaveLength(0);
  });

  // ── Sweep F6 (founder-approved 2026-07-14) — the extraction-failure branches + the OQ-A2 "clean"
  // admission + the write-back cache, all previously untested (only cached/PDF-happy/image paths were). ──
  it("F6: 'clean' virus status is EXPLICITLY admitted (OQ-A2 names clean AND pending — an allow-list tightening to pending-only must fail here)", async () => {
    rows.mockResolvedValue({ data: [file({ virus_scan_status: "clean" })], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(1);
  });

  it("F6: storage download failure → honest unreadable, never a source", async () => {
    rows.mockResolvedValue({ data: [file()], error: null });
    download.mockResolvedValue({ data: null, error: { message: "object not found" } });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable[0].reason).toMatch(/storage download failed/i);
  });

  it("F6: PDF with NO text layer → unreadable (OQ-A1 honesty), never an empty source", async () => {
    rows.mockResolvedValue({ data: [file()], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    extractText.mockResolvedValueOnce({ text: "   " });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable[0].reason).toMatch(/no text layer/i);
  });

  it("F6: PDF extraction THROW → unreadable with the failure reason, never a crash", async () => {
    rows.mockResolvedValue({ data: [file()], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    extractText.mockRejectedValueOnce(new Error("malformed xref"));
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable[0].reason).toMatch(/PDF extraction failed: malformed xref/);
  });

  it("F6: plain-text files (.txt) extract via TextDecoder", async () => {
    rows.mockResolvedValue({ data: [file({ file_name: "notes.txt", file_type: "other", storage_path: "cases/c1/notes.txt" })], error: null });
    download.mockResolvedValue({ data: new Blob([new TextEncoder().encode("PLAIN TEXT CONTENT")]), error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources[0].snippet).toBe("PLAIN TEXT CONTENT");
  });

  it("F6: unsupported file types → honest unreadable (v1 scope)", async () => {
    rows.mockResolvedValue({ data: [file({ file_name: "sheet.xlsx", file_type: "other", storage_path: "cases/c1/sheet.xlsx" })], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    const { pack, unreadable } = await loadDocumentPack("c1");
    expect(pack.sources).toHaveLength(0);
    expect(unreadable[0].reason).toMatch(/unsupported file type/i);
  });

  it("F6: the write-back cache persists (readable → ocr complete + text; unreadable → ocr unreadable) — re-runs stay cheap", async () => {
    rows.mockResolvedValue({ data: [file()], error: null });
    download.mockResolvedValue({ data: blob(), error: null });
    await loadDocumentPack("c1");
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ ocr_status: "complete", ocr_extracted_text: expect.stringContaining("EXTRACTED PDF TEXT") }));

    updateFn.mockClear();
    rows.mockResolvedValue({ data: [file({ id: "f9", file_name: "scan.jpg", file_type: "invoice_image", storage_path: "cases/c1/scan.jpg" })], error: null });
    await loadDocumentPack("c1");
    expect(updateFn).toHaveBeenCalledWith({ ocr_status: "unreadable" });
  });

  it("very long documents are capped with a truncation marker (pack size discipline)", async () => {
    rows.mockResolvedValue({ data: [file({ ocr_extracted_text: "X".repeat(20000), ocr_status: "complete" })], error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources[0].snippet.length).toBeLessThanOrEqual(8200);
    expect(pack.sources[0].snippet).toContain("[truncated");
  });
});
