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
    "/api/inngest": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
