// Text-level inspection of fetched report PDFs: page count, cover identity, TOC page numbers
// (proves the pdfjs read-back resolved sections on the DEPLOYED render), and an internal-token
// sweep over every page's text.
//   FILES=<glob-dir> npx tsx --tsconfig tsconfig.json scripts/inspect-report-pdf.ts <pdf> [<pdf>…]
import { readFileSync } from "node:fs";

async function main() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const file of process.argv.slice(2)) {
    const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      pages.push((tc.items as { str: string }[]).map((i) => i.str).join(" ").replace(/\s+/g, " "));
    }
    const all = pages.join("\n");
    const tokens = [...all.matchAll(/\b(?:src_\d+|EV-\d{3}\b|reasoning_notes|weight_key|blocking_weight_key)\b/g)].map((m) => m[0]);
    const tocLine = pages[1]?.slice(0, 400) ?? "";
    console.log(`\n══ ${file}`);
    console.log(`  pages: ${doc.numPages}`);
    console.log(`  cover: ${pages[0]?.slice(0, 220)}`);
    console.log(`  toc:   ${tocLine}`);
    console.log(`  internal tokens: ${tokens.length ? "✗ " + [...new Set(tokens)].join(", ") : "✓ none"}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
