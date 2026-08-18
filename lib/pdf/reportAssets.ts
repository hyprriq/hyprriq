import fs from "node:fs";
import path from "node:path";

// ── REPORT PDF ASSETS (renderer switch, 2026-08-16) — fonts + wordmark, embedded as data URIs
// so the produced HTML is SELF-CONTAINED: it renders identically in headless Chromium, in a
// browser on any machine, and inside a serverless bundle. (The first cut referenced the fonts
// by file:// URL, which only resolved on the machine that built it — a portability defect.)
//
// DEPLOYMENT NOTE for the dev integration: these files must reach the server bundle. In
// next.config, add them to outputFileTracingIncludes for whichever route/job renders PDFs:
//   outputFileTracingIncludes: { "/api/**": ["./lib/pdf/fonts/**", "./public/brand/**"] }
// ──

export interface ReportAssets {
  /** @font-face block with base64-embedded faces. */
  fontCss: string;
  /** The traced wordmark (reversed variant — the cover is navy), inlined. */
  wordmarkSvg: string;
}

// Only the faces the template actually uses — italic is deliberately not embedded.
const FACES: [file: string, family: string, weight: number][] = [
  ["fraunces-600.ttf", "Fraunces", 600],
  ["source-serif-400.ttf", "SSerif", 400],
  ["source-serif-600.ttf", "SSerif", 600],
  ["instrument-400.ttf", "ISans", 400],
  ["instrument-600.ttf", "ISans", 600],
  ["instrument-700.ttf", "ISans", 700],
  ["jetbrains-400.ttf", "Mono", 400],
  ["jetbrains-600.ttf", "Mono", 600],
];

let cached: ReportAssets | null = null;

export function loadReportAssets(): ReportAssets {
  if (cached) return cached;
  const fontDir = path.join(process.cwd(), "lib/pdf/fonts");
  const fontCss = FACES.map(([file, family, weight]) => {
    const b64 = fs.readFileSync(path.join(fontDir, file)).toString("base64");
    return `@font-face{font-family:${family};font-weight:${weight};font-display:block;src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
  }).join("\n");
  const wordmarkSvg = fs
    .readFileSync(path.join(process.cwd(), "public/brand/wordmark-reversed.svg"), "utf8")
    .replace(/<svg /, '<svg class="wm" ');
  cached = { fontCss, wordmarkSvg };
  return cached;
}
