// ── SERVER-SIDE FILE TYPE SNIFFING (founder-ruled 2026-08-07, upload security). Extension
// checks are trivially bypassed and these are third-party commercial documents held on a
// client's behalf — the SERVER decides the type from CONTENT (magic bytes), never from the
// filename or the client-claimed contentType. Exactly the three accepted formats; anything
// else is rejected before any storage write and before charge.

export type SniffedFile = { kind: "pdf" | "jpeg" | "png"; mime: string };

export function sniffFileType(buf: Uint8Array): SniffedFile | null {
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) {
    return { kind: "pdf", mime: "application/pdf" }; // %PDF-
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: "jpeg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { kind: "png", mime: "image/png" };
  }
  return null;
}
