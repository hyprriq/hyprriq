import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // §4 PDF render — lib/pdf/reportAssets.ts reads the font files and the wordmark from disk AT
  // RUNTIME (fs.readFileSync), so they must be traced into the serverless bundle. This include was
  // documented on reportAssets.ts from day one and never added here — without it the deployed
  // render job throws ENOENT before Chromium is even reached.
  outputFileTracingIncludes: {
    "/api/**": ["./lib/pdf/fonts/**", "./public/brand/**"],
    // @sparticuz/chromium is on Next's default external list, but its brotli-packed binaries are
    // opened with dynamic fs paths, so the tracer never sees them — the deployed worker then
    // throws `input directory ".../@sparticuz/chromium/bin" does not exist` (measured on the
    // first real render attempt, 2026-08-20). Scoped to the Inngest route: it is the only
    // function that launches Chromium, and the payload is ~50MB.
    "/api/inngest": [
      "./node_modules/@sparticuz/chromium/bin/**",
      // pdfjs-dist (the §4 TOC read-back) loads @napi-rs/canvas via a dynamic require the tracer
      // cannot see; without it the worker dies at import with `DOMMatrix is not defined` (measured
      // on the second real render attempt, 04:08 UTC — one failure layer deeper than the Chromium
      // binary). The platform binary lives in a separate scoped package; both must ride.
      // Both hoisting layouts: this lockfile nests them under pdfjs-dist; a future dedupe may
      // hoist them to the root. A miss is a silent revert to the DOMMatrix crash.
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/pdfjs-dist/node_modules/@napi-rs/canvas/**",
      "./node_modules/pdfjs-dist/node_modules/@napi-rs/canvas-linux-x64-gnu/**",
    ],
  },
};

export default nextConfig;
