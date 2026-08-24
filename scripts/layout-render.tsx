// ── LAYOUT QA, HALF 2 (render) — renders the REAL ReportView over the JSON half 1 dumped, into a
// standalone HTML file a browser can open. Tailwind's browser build compiles the utilities at
// load; the app's @theme tokens are inlined so colors/radii match; Google Fonts approximate the
// next/font faces (Fraunces, Instrument Sans, JetBrains Mono, Source Serif 4).
//
// ⚠ RUN WITHOUT --conditions=react-server (react-dom/server is forbidden under it):
//   npx tsx --tsconfig tsconfig.json scripts/layout-render.tsx <dumpdir> <outdir>
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "@/components/portal/report-view";

const [dumpDir, outDir] = process.argv.slice(2);
if (!dumpDir || !outDir) { console.error("usage: layout-render.tsx <dumpdir> <outdir>"); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const THEME = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
  .split("@theme inline")[0]                 // the token block only — next/font vars replaced below
  .replace('@import "tailwindcss";', "");

for (const f of readdirSync(dumpDir).filter((x) => x.endsWith(".json"))) {
  const { c, findings, report, plan } = JSON.parse(readFileSync(join(dumpDir, f), "utf8"));
  const body = renderToStaticMarkup(
    React.createElement(ReportView, { c, findings, report, preview: true }),
  );
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.case_number} · ${plan}</title>
<script src="https://unpkg.com/@tailwindcss/browser@4"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400..600&family=Source+Serif+4:opsz,wght@8..60,400..600&display=swap" rel="stylesheet">
<style type="text/tailwindcss">
${THEME}
@theme inline {
  --font-display: "Fraunces";
  --font-sans: "Instrument Sans";
  --font-mono: "JetBrains Mono";
  --font-reading: "Source Serif 4", Georgia, serif;
}
body { background-color: var(--color-canvas); color: var(--color-ink); font-family: "Instrument Sans", system-ui, sans-serif; }
h1,h2,h3,h4 { font-family: "Fraunces", Georgia, serif; letter-spacing: -0.01em; }
</style>
</head><body>
<div class="mx-auto max-w-[1080px] p-6">
<div class="mb-4 rounded bg-amber-100 px-3 py-1 text-[12px] font-semibold text-amber-900">LAYOUT QA HARNESS · ${plan} · ${c.case_number} · not a client surface</div>
${body}
</div></body></html>`;
  const out = join(outDir, basename(f, ".json") + ".html");
  writeFileSync(out, html);
  console.log(`✔ ${out}`);
}
