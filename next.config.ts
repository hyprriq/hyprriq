import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // §4 PDF render — lib/pdf/reportAssets.ts reads the font files and the wordmark from disk AT
  // RUNTIME (fs.readFileSync), so they must be traced into the serverless bundle. This include was
  // documented on reportAssets.ts from day one and never added here — without it the deployed
  // render job throws ENOENT before Chromium is even reached.
  outputFileTracingIncludes: {
    "/api/**": ["./lib/pdf/fonts/**", "./public/brand/**"],
  },
};

export default nextConfig;
