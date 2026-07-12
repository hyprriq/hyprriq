import { describe, it, expect, vi, beforeEach } from "vitest";

const { rows, download, updateEq } = vi.hoisted(() => ({
  rows: vi.fn(),
  download: vi.fn(),
  updateEq: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ is: () => rows() }) }),
      update: () => ({ eq: updateEq }),
    }),
    storage: { from: () => ({ download }) },
  },
}));
vi.mock("unpdf", () => ({
  extractText: vi.fn().mockResolvedValue({ text: "EXTRACTED PDF TEXT: wholesale invoice #123" }),
  getDocumentProxy: vi.fn().mockResolvedValue({}),
}));

import { loadDocumentPack } from "./documentPack";

const file = (over: Record<string, unknown> = {}) => ({
  id: "f1", file_name: "invoice.pdf", file_type: "invoice_pdf", storage_path: "cases/c1/invoice.pdf",
  virus_scan_status: "pending", ocr_extracted_text: null, ocr_status: "pending", ...over,
});
const blob = () => new Blob([new Uint8Array([37, 80, 68, 70])]); // %PDF

beforeEach(() => { rows.mockReset(); download.mockReset(); updateEq.mockClear(); });

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

  it("very long documents are capped with a truncation marker (pack size discipline)", async () => {
    rows.mockResolvedValue({ data: [file({ ocr_extracted_text: "X".repeat(20000), ocr_status: "complete" })], error: null });
    const { pack } = await loadDocumentPack("c1");
    expect(pack.sources[0].snippet.length).toBeLessThanOrEqual(8200);
    expect(pack.sources[0].snippet).toContain("[truncated");
  });
});
