// ── UPLOAD SECURITY (2026-08-07) — content sniffing, not extensions. ──
import { describe, it, expect } from "vitest";
import { sniffFileType } from "./fileSniff";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe("sniffFileType — magic bytes decide, nothing else", () => {
  it("recognizes the three accepted formats", () => {
    expect(sniffFileType(pdf)).toEqual({ kind: "pdf", mime: "application/pdf" });
    expect(sniffFileType(jpeg)).toEqual({ kind: "jpeg", mime: "image/jpeg" });
    expect(sniffFileType(png)).toEqual({ kind: "png", mime: "image/png" });
  });

  it("rejects a renamed executable / script / html regardless of what the client claims", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);           // MZ
    const html = new TextEncoder().encode("<html><script>");
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);           // PK (zip/docx)
    for (const b of [exe, html, zip]) expect(sniffFileType(b)).toBeNull();
  });

  it("rejects empty and truncated payloads", () => {
    expect(sniffFileType(new Uint8Array([]))).toBeNull();
    expect(sniffFileType(new Uint8Array([0x25, 0x50]))).toBeNull(); // partial %P
  });
});
