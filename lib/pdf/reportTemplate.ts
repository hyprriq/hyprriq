import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import type { Finding } from "@/lib/data/cases";
import type { ClientReport } from "@/lib/portal/clientReport";
import { DOC_TITLE, ISSUER, confidentialityLine } from "@/lib/content/documentIdentity";
import {
  SECTIONS, CONTENTS_TITLE, AREAS_TABLE, CHECKLIST_TABLE, MONITOR_TABLE_CAPTION,
  BOUNDARY_CALLOUT_LABEL, SCOPE_NOTE_LABEL, COVER_META_LABELS, coverInsideLine,
} from "@/lib/content/reportDocument";
import type { ReportAssets } from "@/lib/pdf/reportAssets";

// ── THE REPORT DOCUMENT TEMPLATE (pure). One fixed model for every report: same sections, same
// grammar, same rules — only the projected content differs. No Node APIs, no browser APIs, no
// data access; hand it content + assets and it returns a complete HTML document.
//
// MEANING IS LOCKED: engine prose is emitted verbatim (escaped, never rewritten); all
// structural copy is imported from lib/content/reportDocument.ts, which the banned-language
// fixture covers. Display logic mirrors the portal's report-view.tsx exactly.
// ──

export interface ReportContent {
  caseNumber: string;
  vendor: string;
  brands: string[];
  clientName: string;
  deliveredAt: string;
  verdict: string;
  report: ClientReport;
  findings: Finding[];
}

export interface Palette {
  paper: string; ink: string; soft: string; navy: string; copper: string;
  hairline: string; zebra: string;
  tone: Record<string, { ink: string; bg: string }>;
  verdict: Record<string, string>;
}

/** The deliverable palette — the client's report is the navy/colour document. */
export const PALETTE_COLOUR: Palette = {
  paper: "#FFFFFF", ink: "#14181D", soft: "#43494F", navy: "#122E4A", copper: "#9A551F",
  hairline: "#C9CDD2", zebra: "#F2F4F6",
  tone: {
    green: { ink: "#1D5638", bg: "#E4EFEA" },
    amber: { ink: "#755110", bg: "#F7F0E2" },
    red: { ink: "#7C2622", bg: "#F5E4E1" },
    navy: { ink: "#122E4A", bg: "#EDF1F5" },
  },
  verdict: { source_clear: "#1D5638", usable_with_conditions: "#755110", verify_before_purchase: "#8A470B", do_not_rely: "#7C2622" },
};

const toGrey = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const h = Math.round(0.299 * r + 0.587 * g + 0.114 * b).toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
};

/**
 * NOT A DELIVERABLE — the mono-office-printer proof (true Rec.601 luma). Used only to verify
 * that no meaning is carried by hue: the verdict level survives on position, solid/outline and
 * label text alone. Never sent to a client; the client's report is PALETTE_COLOUR.
 */
export const PALETTE_PRINT_CHECK: Palette = {
  paper: "#FFFFFF", ink: toGrey(PALETTE_COLOUR.ink), soft: toGrey(PALETTE_COLOUR.soft),
  navy: toGrey(PALETTE_COLOUR.navy), copper: toGrey(PALETTE_COLOUR.copper),
  hairline: toGrey(PALETTE_COLOUR.hairline), zebra: toGrey(PALETTE_COLOUR.zebra),
  tone: Object.fromEntries(Object.entries(PALETTE_COLOUR.tone).map(([k, v]) => [k, { ink: toGrey(v.ink), bg: toGrey(v.bg) }])),
  verdict: Object.fromEntries(Object.entries(PALETTE_COLOUR.verdict).map(([k, v]) => [k, toGrey(v)])),
};

// Fixed label→tone map over the ENGINE'S OWN section labels — one table, every report, zero
// per-report judgement.
function toneFor(label: string): string {
  const l = label.toUpperCase();
  if (/POSITIVE|CONFIRMED/.test(l)) return "green";
  if (/RISK|ENFORCEMENT|NEGATIVE|CONCERN|RESTRICT/.test(l)) return "red";
  if (/UNKNOWN|UNRESOLVED|GAP|COULD NOT/.test(l)) return "amber";
  return "navy";
}

// ── Locked display copy — verbatim from the shipping report (components/portal/report-view.tsx) ──
const VERDICT_META: Record<string, { name: string; level: number; means: string }> = {
  source_clear: { name: "Source Clear", level: 1, means: "The evidence supported this source at the time of research. Standard diligence still applies — the decision stays yours." },
  usable_with_conditions: { name: "Usable With Conditions", level: 2, means: "Workable — with the stated conditions handled first. The conditions are part of the verdict, not a footnote." },
  verify_before_purchase: { name: "Verify Before Purchase", level: 3, means: "Do not place a large order — resolve the listed items first. Re-submit for an updated review once resolved." },
  do_not_rely: { name: "Do Not Rely", level: 4, means: "The evidence does not support relying on this source. The report explains what drove this." },
};
const AREA_NAMES: Record<string, string> = {
  supplier_identity: "Supplier Legitimacy", supply_chain_relationship: "Supply-Chain Relationship",
  brand_risk_assessment: "Brand Risk", documentation_review: "Documentation Review", sourcing_logic: "Sourcing Logic",
};
const CHIP_DEFS = {
  verified: "Independently corroborated — multiple independent sources confirm this.",
  assessed: "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation.",
  not_assessed: "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict.",
} as const;
const CHECKLIST_INTRO = "Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.";
const CATEGORY_NOTE = "Selling these brands in their marketplace categories may require category approval or specific documentation before listing. This is a marketplace requirement independent of this report’s verdict — confirm your category status before you commit.";
const CLOSING = "This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval, account safety, or brand action. The decision to purchase is yours.";
const RISK_HEAD = "The single most important risk";
const LIMITS_HEAD = "The reading, and its limits";
const SCALE_ORDER = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"] as const;

function areaStatus(f: Finding): { label: string; tone: string } {
  if (f.track_key === "sourcing_logic") return { label: "Informational", tone: "navy" };
  const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
  const notAssessed = typeof j.summary === "string" && /not (?:assessed|evaluated)|no documents were provided/i.test(j.summary) && f.track_key === "documentation_review";
  if (notAssessed || (f.track_key === "documentation_review" && !j.documentation_finding && typeof j.summary === "string" && /excluded from scoring/.test(j.summary))) {
    return { label: "Not assessed", tone: "navy" };
  }
  return f.finding_certainty === "verified" ? { label: "Verified", tone: "green" } : { label: "Assessed", tone: "amber" };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The document's running footer text (Chromium renders it natively from page 2). */
export const footerText = (clientName: string) => `${DOC_TITLE} · Prepared for ${clientName}`;

function toneBox(tone: string, heading: string | null, inner: string, keep = true): string {
  return `<div class="tonebox tone-${tone}${keep ? " keep" : ""}">${heading ? `<div class="tb-head">${esc(heading)}</div>` : ""}${inner}</div>`;
}

// The engine's labelled sections become toned callout boxes; enumerations become lists inside
// them; unlabelled text stays body prose. Presentation only — the parser is lossless.
function structuredProse(text: string): string {
  const blocks = parseFindingStructure(text);
  const groups: { heading: string | null; parts: string[] }[] = [];
  const bodyHtml = (b: (typeof blocks)[number]): string => {
    if (b.type === "list") return `<ul class="dash">${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    if (b.type === "prose") return `<p>${esc(b.text)}</p>`;
    return "";
  };
  for (const b of blocks) {
    if (b.type === "heading") groups.push({ heading: b.text, parts: [] });
    else {
      if (groups.length === 0) groups.push({ heading: null, parts: [] });
      groups[groups.length - 1].parts.push(bodyHtml(b));
    }
  }
  return groups
    .map((g) => {
      if (!g.heading) return g.parts.join("");
      const inner = g.parts.join("");
      // Short boxes stay whole across page breaks; long ones may split rather than strand a
      // heading over whitespace.
      return toneBox(toneFor(g.heading), g.heading, inner, inner.length < 900);
    })
    .join("");
}

export interface BuildOptions {
  palette?: Palette;
  /** Section number → printed page. Empty on the measuring pass; filled on the final pass. */
  toc?: Record<string, number | string>;
  assets: ReportAssets;
}

export function buildReportHtml(c: ReportContent, opts: BuildOptions): string {
  const P = opts.palette ?? PALETTE_COLOUR;
  const toc = opts.toc ?? {};
  const meta = VERDICT_META[c.verdict] ?? VERDICT_META.verify_before_purchase;
  const vInk = P.verdict[c.verdict] ?? P.verdict.verify_before_purchase;
  const vTone = ({ source_clear: "green", usable_with_conditions: "amber", verify_before_purchase: "amber", do_not_rely: "red" } as Record<string, string>)[c.verdict] ?? "amber";
  const r = c.report;
  const scale = SCALE_ORDER.map((k) => {
    const active = k === c.verdict;
    return `<div class="slot"><div class="bar" style="${active ? `background:${vInk};border:0` : `background:${P.paper};border:1px solid ${P.hairline}`}"></div><div class="slot-label" style="${active ? `color:${vInk};font-weight:700` : `color:${P.soft}`}">${VERDICT_META[k].name}</div></div>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(DOC_TITLE)} — ${esc(c.caseNumber)}</title><style>
${opts.assets.fontCss}
@page{size:letter;margin:56pt 0 64pt 0}
@page:first{margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:ISans,sans-serif;color:${P.ink};background:${P.paper};font-size:10pt}
p{font-family:SSerif,serif;font-size:10pt;line-height:1.5;color:${P.ink};margin-bottom:5pt;orphans:2;widows:2}
ul.dash{list-style:none;margin-bottom:4pt}
ul.dash li{font-family:SSerif,serif;font-size:10pt;line-height:1.45;color:${P.ink};padding-left:13pt;position:relative;margin-bottom:2.5pt;orphans:2;widows:2}
ul.dash li::before{content:"–";position:absolute;left:0}
.pagebody{padding:0 60pt}
.cover{width:8.5in;height:11in;background:${P.navy};padding:60pt 62pt 0;position:relative;page-break-after:always}
.wm{height:21pt;width:auto;display:block}
.cover-rule{width:46pt;height:3.5pt;background:${P.copper};margin:86pt 0 16pt}
.cover h1{font-family:Fraunces,serif;font-weight:600;font-size:34pt;line-height:1.12;color:#fff;max-width:400pt}
.cover .who{font-weight:600;font-size:13.5pt;color:#fff;opacity:.9;margin-top:12pt}
.vbox{border:1.25pt solid #fff;border-radius:6pt;padding:16pt;margin-top:44pt;max-width:470pt}
.vbox .k{font-weight:700;font-size:9pt;color:#fff;opacity:.8;letter-spacing:1.5pt;text-transform:uppercase}
.vbox .name{font-family:Fraunces,serif;font-weight:600;font-size:22pt;color:#fff;margin-top:5pt}
.vbox p{color:#fff;opacity:.93;font-size:10.5pt;margin:8pt 0 0}
.cover-foot{position:absolute;bottom:38pt;left:62pt;right:62pt}
.cover-foot .rule{height:.75pt;background:#fff;opacity:.4;margin-bottom:12pt}
.cover-foot .cols{display:flex;justify-content:space-between}
.cover-foot .k{font-weight:700;font-size:7pt;color:#fff;opacity:.65;text-transform:uppercase;margin-bottom:2pt}
.cover-foot .v{font-size:8.5pt;color:#fff;max-width:150pt}
.cover-foot .v.mono{font-family:Mono,monospace}
.section{page-break-before:always}
.sec-open{display:flex;align-items:baseline;gap:12pt;margin-bottom:8pt}
.sec-open .no{font-family:Mono,monospace;font-weight:600;font-size:16pt;color:${P.copper}}
.sec-open .t{font-weight:700;font-size:23pt;color:${P.ink}}
.sec-rule{height:3pt;background:${P.ink};margin-bottom:18pt}
.tocrow{display:flex;gap:14pt;border-radius:5pt;padding:10pt 12pt;margin-bottom:4pt}
.tocrow:nth-child(even){background:${P.zebra}}
.tocrow .no{font-family:Mono,monospace;font-weight:600;font-size:12pt;color:${P.copper};width:26pt;flex:none}
.tocrow .mid{flex:1}
.tocrow .line1{display:flex;align-items:flex-end}
.tocrow .t{font-weight:700;font-size:12pt;color:${P.ink}}
.tocrow .leader{flex:1;border-bottom:1.5pt dotted ${P.hairline};margin:0 8pt 3pt}
.tocrow .pg{font-family:Mono,monospace;font-weight:600;font-size:11pt;color:${P.ink}}
.tocrow .d{font-size:8.5pt;color:${P.soft};margin-top:2.5pt}
.tonebox{border-left:4.5pt solid;border-radius:6pt;overflow:hidden;padding:11pt 13pt;margin:10pt 0 6pt}
.tonebox.keep{break-inside:avoid}
.tb-head{font-weight:700;font-size:10.5pt;margin-bottom:5pt}
${Object.entries(P.tone).map(([k, v]) => `.tone-${k}{background:${v.bg};border-color:${v.ink}}.tone-${k} .tb-head{color:${v.ink}}`).join("\n")}
.tiles{display:flex;gap:10pt;margin-bottom:16pt}
.tile{flex:1;background:${P.zebra};border-radius:6pt;overflow:hidden}
.tile .bar{height:3.5pt}
.tile .inner{padding:10pt 11pt}
.tile .v{font-weight:700;font-size:19pt;color:${P.ink}}
.tile .c{font-size:8pt;color:${P.soft};margin-top:3pt;line-height:1.35}
.v-name{font-family:Fraunces,serif;font-weight:600;font-size:27pt;margin-top:5pt}
.v-kick{font-weight:700;font-size:9pt;text-transform:uppercase;letter-spacing:1pt}
.scalerow{display:flex;gap:4pt;margin-top:12pt}
.slot{flex:1}
.slot .bar{height:10pt;border-radius:2pt}
.slot-label{font-size:7.2pt;margin-top:3pt}
table{width:100%;border-collapse:collapse}
thead th{background:${P.navy};color:#fff;font-weight:700;font-size:9.5pt;text-align:left;padding:7pt 10pt}
thead th:first-child{border-top-left-radius:5pt}
thead th:last-child{border-top-right-radius:5pt}
tbody td{padding:6.5pt 10pt;border-bottom:.5pt solid ${P.hairline};font-size:10pt;vertical-align:top}
tbody tr:nth-child(even){background:${P.zebra}}
tbody tr{break-inside:avoid}
td.num{font-family:Mono,monospace;font-weight:600;font-size:9pt;color:${P.copper};width:34pt}
td.serif{font-family:SSerif,serif;line-height:1.45}
td.status{font-weight:700;font-size:9.5pt;width:100pt}
.area{margin-bottom:14pt}
.area.keep{break-inside:avoid}
.area-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5pt solid ${P.ink};padding-bottom:4pt;margin-bottom:5pt;break-after:avoid}
.area-head .n{font-weight:700;font-size:14pt;color:${P.ink}}
.area-head .s{font-weight:700;font-size:9.5pt}
h4.sub{font-weight:700;font-size:13pt;color:${P.ink};margin-bottom:6pt;break-after:avoid}
.closing{margin-top:22pt;border-top:1.5pt solid ${P.ink};padding-top:12pt}
.closing .fine{font-family:ISans;font-size:8.5pt;line-height:1.5;color:${P.soft};margin-top:10pt}
.closing .mono{font-family:Mono,monospace;font-size:7.5pt;color:${P.soft};margin-top:6pt}
.footnote{font-size:8pt;color:${P.soft};margin-top:8pt}
.conf{font-size:8.5pt;line-height:1.5;color:${P.soft};margin-top:22pt}
</style></head><body>

<div class="cover">
  ${opts.assets.wordmarkSvg}
  <div class="cover-rule"></div>
  <h1>${esc(DOC_TITLE)}</h1>
  <div class="who">${esc(c.vendor)} · ${c.brands.map(esc).join(" · ")}</div>
  <div class="vbox">
    <div class="k">Verdict · Level ${meta.level} of 4</div>
    <div class="name">${esc(meta.name)}</div>
    <p>${esc(r.headline)}</p>
  </div>
  <div class="cover-foot">
    <div class="rule"></div>
    <div class="cols">
      ${[[COVER_META_LABELS.preparedFor, esc(c.clientName), ""], [COVER_META_LABELS.delivered, esc(c.deliveredAt), ""], [COVER_META_LABELS.caseRef, esc(c.caseNumber), "mono"], [COVER_META_LABELS.inside, esc(coverInsideLine(r.questions.length)), ""]]
        .map(([k, v, cls]) => `<div><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`).join("")}
    </div>
  </div>
</div>

<div class="pagebody">
  <div class="sec-open"><span class="t">${esc(CONTENTS_TITLE)}</span></div>
  <div class="sec-rule"></div>
  ${SECTIONS.map((s) => `<div class="tocrow"><span class="no">${s.no}</span><span class="mid"><span class="line1"><span class="t">${esc(s.title)}</span><span class="leader"></span><span class="pg">${toc[s.no] ?? "·"}</span></span><span class="d" style="display:block">${esc(s.toc)}</span></span></div>`).join("")}
  <div class="conf">${esc(confidentialityLine(c.clientName))} ${esc(ISSUER)}</div>
</div>

<div class="section pagebody">
  <div class="sec-open"><span class="no">01</span><span class="t">${esc(SECTIONS[0].title)}</span></div>
  <div class="sec-rule"></div>
  <div class="tiles">
    <div class="tile"><div class="bar" style="background:${vInk}"></div><div class="inner"><div class="v">${meta.level} / 4</div><div class="c">Verdict level on the four-level scale</div></div></div>
    <div class="tile"><div class="bar" style="background:${P.navy}"></div><div class="inner"><div class="v">${c.findings.length}</div><div class="c">Assessment areas examined</div></div></div>
    <div class="tile"><div class="bar" style="background:${P.navy}"></div><div class="inner"><div class="v">${r.questions.length}</div><div class="c">Verification questions to put to the supplier</div></div></div>
    <div class="tile"><div class="bar" style="background:${P.navy}"></div><div class="inner"><div class="v">${c.brands.length}</div><div class="c">Brands in scope of this research</div></div></div>
  </div>
  ${toneBox(vTone, null, `
    <div class="v-kick" style="color:${vInk}">Verdict · Level ${meta.level} of 4</div>
    <div class="v-name" style="color:${vInk}">${esc(meta.name)}</div>
    <div class="scalerow">${scale}</div>
    <p style="margin-top:12pt">${esc(meta.means)}</p>`)}
  ${toneBox("red", RISK_HEAD, `<p>${esc(r.the_real_risk)}</p>`)}
</div>

<div class="section pagebody">
  <div class="sec-open"><span class="no">02</span><span class="t">${esc(SECTIONS[1].title)}</span></div>
  <div class="sec-rule"></div>
  <table style="margin-bottom:18pt"><thead><tr><th>${esc(AREAS_TABLE.colArea)}</th><th style="width:100pt">${esc(AREAS_TABLE.colStatus)}</th></tr></thead><tbody>
    ${c.findings.map((f) => { const st = areaStatus(f); return `<tr><td style="font-weight:600">${esc(AREA_NAMES[f.track_key] ?? f.track_key)}</td><td class="status" style="color:${(P.tone[st.tone] ?? P.tone.navy).ink}">${esc(st.label)}</td></tr>`; }).join("")}
  </tbody></table>
  ${c.findings.map((f) => {
    const { detail } = findingText(f);
    const notes = findingNotes(f);
    const st = areaStatus(f);
    const isScope = st.label === "Not assessed" || st.label === "Informational";
    const head = `<div class="area-head"><span class="n">${esc(AREA_NAMES[f.track_key] ?? f.track_key)}</span><span class="s" style="color:${(P.tone[st.tone] ?? P.tone.navy).ink}">${esc(st.label)}</span></div>`;
    const bodyH = detail ? (isScope ? toneBox("navy", SCOPE_NOTE_LABEL, `<p style="font-size:9.5pt">${esc(detail)}</p>`) : structuredProse(detail)) : "";
    const notesH = notes.length ? toneBox("navy", BOUNDARY_CALLOUT_LABEL, notes.map((n) => `<p style="font-size:9.5pt;margin-bottom:2pt"><strong style="font-family:ISans">${esc(n.label)}:</strong> ${esc(n.text)}</p>`).join("")) : "";
    return `<div class="area${isScope ? " keep" : ""}">${head}${bodyH}${notesH}</div>`;
  }).join("")}
</div>

<div class="section pagebody">
  <div class="sec-open"><span class="no">03</span><span class="t">${esc(SECTIONS[2].title)}</span></div>
  <div class="sec-rule"></div>
  <h4 class="sub">${esc(LIMITS_HEAD)}</h4>
  ${r.leading_interpretation ? structuredProse(r.leading_interpretation) : ""}
  ${r.what_to_monitor.length ? `<table style="margin-top:14pt"><thead><tr><th style="width:34pt">No.</th><th>${esc(MONITOR_TABLE_CAPTION)}</th></tr></thead><tbody>
    ${r.what_to_monitor.map((m, i) => `<tr><td class="num">${String(i + 1).padStart(2, "0")}</td><td class="serif">${esc(m)}</td></tr>`).join("")}
  </tbody></table>` : ""}
</div>

<div class="section pagebody">
  <div class="sec-open"><span class="no">04</span><span class="t">${esc(SECTIONS[3].title)}</span></div>
  <div class="sec-rule"></div>
  <p style="margin-bottom:12pt">${esc(CHECKLIST_INTRO)}</p>
  <table><thead><tr><th style="width:34pt">${esc(CHECKLIST_TABLE.colNo)}</th><th>${esc(CHECKLIST_TABLE.colQuestion)}</th></tr></thead><tbody>
    ${r.questions.map((q, i) => `<tr><td class="num">${String(i + 1).padStart(2, "0")}</td><td class="serif">${esc(q.question)}${q.source === "additional" ? " †" : ""}</td></tr>`).join("")}
  </tbody></table>
  ${r.questions.some((q) => q.source === "additional") ? `<div class="footnote">† ${esc(CHECKLIST_TABLE.analystNote)}</div>` : ""}
</div>

<div class="section pagebody">
  <div class="sec-open"><span class="no">05</span><span class="t">${esc(SECTIONS[4].title)}</span></div>
  <div class="sec-rule"></div>
  ${([["Verified", "green", CHIP_DEFS.verified], ["Assessed", "amber", CHIP_DEFS.assessed], ["Not assessed", "navy", CHIP_DEFS.not_assessed]] as const)
    .map(([k, tone, def]) => toneBox(tone, k, `<p style="font-size:9.5pt">${esc(def)}</p>`)).join("")}
  ${toneBox("red", "Category requirements", `<p style="font-size:9.5pt">${esc(CATEGORY_NOTE)}</p>`)}
  <div class="closing">
    <p style="font-size:9.5pt;line-height:1.55">${esc(CLOSING)}</p>
    <div class="fine">${esc(confidentialityLine(c.clientName))}</div>
    <div class="mono">${esc(c.caseNumber)} · ${esc(c.vendor)} · delivered ${esc(c.deliveredAt)} · ${esc(ISSUER)}</div>
  </div>
</div>

</body></html>`;
}
