/**
 * THE REPORT AS A DOCUMENT — full PDF build, v2 (founder redirection 2026-08-16).
 * Visual grammar matched to the founder's reference documents: bold sans headings with
 * coloured numerals and thick rules, TONED CALLOUT BOXES (tinted fill + accent bar + coloured
 * heading) for the engine's labelled sections, dark navy table header bars with light zebra,
 * and a stat-tile strip on the verdict page. Same locked content, same projection chain, same
 * deterministic template as v1 — only the dress changed.
 *
 * Run (founder): npx tsx scripts/pdf/report-document.tsx [case_number]
 * Output: docs/pdf-samples/<case>-report.pdf + <case>-report-grey.pdf (true Rec.601 luma).
 *
 * DETERMINISM: every visual decision is a pure function of the projection. The label→tone map
 * below colours the engine's OWN section labels by fixed keyword rules (POSITIVE→green,
 * UNKNOWN→amber, RISK/ENFORCEMENT→red, else navy) — one table, applied identically to every
 * report. No new prose; structural copy stays in lib/content/reportDocument.ts (fixture-bound).
 * HARD RULE (§7): a missing client name fails the build loudly (PDF_ALLOW_MISSING_NAME=1
 * renders a visibly-marked internal proof only).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import React from "react";
import { Document, Page, Text, View, Svg, Path, Font, renderToFile, type DocumentProps } from "@react-pdf/renderer";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { projectClientReport, type ClientReport } from "@/lib/portal/clientReport";
import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import type { Finding } from "@/lib/data/cases";
import type { TrackResultRow } from "@/lib/data/track-results";
import { DOC_TITLE, ISSUER, confidentialityLine } from "@/lib/content/documentIdentity";
import {
  SECTIONS, CONTENTS_TITLE, AREAS_TABLE, CHECKLIST_TABLE, MONITOR_TABLE_CAPTION,
  BOUNDARY_CALLOUT_LABEL, SCOPE_NOTE_LABEL, COVER_META_LABELS, coverInsideLine, documentFooter,
} from "@/lib/content/reportDocument";

// ── Palette: print inks + reference-style tint fills ──
const COLOUR = {
  paper: "#FFFFFF", ink: "#14181D", soft: "#43494F", navy: "#122E4A", copper: "#9A551F",
  hairline: "#C9CDD2", zebra: "#F2F4F6",
  tone: {
    green: { ink: "#1D5638", bg: "#E4EFEA" },
    amber: { ink: "#755110", bg: "#F7F0E2" },
    red: { ink: "#7C2622", bg: "#F5E4E1" },
    navy: { ink: "#122E4A", bg: "#EDF1F5" },
  } as Record<string, { ink: string; bg: string }>,
  verdict: { source_clear: "#1D5638", usable_with_conditions: "#755110", verify_before_purchase: "#8A470B", do_not_rely: "#7C2622" } as Record<string, string>,
};
const toGrey = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const h = Math.round(0.299 * r + 0.587 * g + 0.114 * b).toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
};
const GREY: typeof COLOUR = {
  paper: "#FFFFFF", ink: toGrey(COLOUR.ink), soft: toGrey(COLOUR.soft), navy: toGrey(COLOUR.navy),
  copper: toGrey(COLOUR.copper), hairline: toGrey(COLOUR.hairline), zebra: toGrey(COLOUR.zebra),
  tone: Object.fromEntries(Object.entries(COLOUR.tone).map(([k, v]) => [k, { ink: toGrey(v.ink), bg: toGrey(v.bg) }])),
  verdict: Object.fromEntries(Object.entries(COLOUR.verdict).map(([k, v]) => [k, toGrey(v)])),
};
type Palette = typeof COLOUR;

// Fixed label→tone map over the ENGINE'S OWN labels — one rule, every report.
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

// ── Fonts (ligature-stripped) — Instrument Sans returns as the heading voice (reference grammar) ──
const F = (f: string) => path.join(process.cwd(), "scripts/pdf/fonts", f);
Font.register({ family: "Fraunces", fonts: [{ src: F("fraunces-600.ttf"), fontWeight: 600 }] });
Font.register({ family: "Serif", fonts: [
  { src: F("source-serif-400.ttf"), fontWeight: 400 },
  { src: F("source-serif-600.ttf"), fontWeight: 600 },
  { src: F("source-serif-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
] });
Font.register({ family: "Sans", fonts: [
  { src: F("instrument-400.ttf"), fontWeight: 400 },
  { src: F("instrument-600.ttf"), fontWeight: 600 },
  { src: F("instrument-700.ttf"), fontWeight: 700 },
] });
Font.register({ family: "Mono", fonts: [{ src: F("jetbrains-400.ttf"), fontWeight: 400 }, { src: F("jetbrains-600.ttf"), fontWeight: 600 }] });
Font.registerHyphenationCallback((w) => [w]);

const wmSvg = fs.readFileSync(path.join(process.cwd(), "public/brand/wordmark.svg"), "utf8");
const wmPaths = [...wmSvg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const wmVb = /viewBox="([^"]+)"/.exec(wmSvg)![1];
const [, , wmW, wmH] = wmVb.split(" ").map(Number);
function Wordmark({ h, P, onNavy }: { h: number; P: Palette; onNavy: boolean }) {
  return (
    <Svg width={(h * wmW) / wmH} height={h} viewBox={wmVb}>
      <Path d={wmPaths[0]} fill={onNavy ? "#FFFFFF" : P.navy} />
      <Path d={wmPaths[1]} fill={P.copper} />
    </Svg>
  );
}

// ── Content (unchanged pipeline) ──
interface CaseRow {
  id: string; case_number: string; vendor_name: string | null; brands_submitted: string[] | null;
  status: string; verdict: string | null; delivered_at: string | null; delivered_attempt: number | null;
  created_at: string; additional_questions: { question?: string }[] | null;
  clients: { full_name: string | null; company_name: string | null } | null;
}
interface Dump { row: CaseRow; rows: TrackResultRow[]; snap: { decision_snapshot: unknown; vendor_questions: unknown } | null }
interface Content { caseNumber: string; vendor: string; brands: string[]; clientName: string; deliveredAt: string; verdict: string; report: ClientReport; findings: Finding[] }

const dumpPath = (n: string) => path.join(os.tmpdir(), `hyprriq-pdf-dump-${n}.json`);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—");

async function dumpCase(caseNumber: string): Promise<void> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { getCaseTrackResults } = await import("@/lib/data/track-results");
  const { getClientDecisionSnapshot } = await import("@/lib/data/synthesis");
  const { data: c } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, delivered_at, delivered_attempt, created_at, additional_questions, clients(full_name, company_name)")
    .eq("case_number", caseNumber).is("deleted_at", null).maybeSingle();
  if (!c) throw new Error(`case ${caseNumber} not found`);
  const row = c as unknown as CaseRow;
  const rows = await getCaseTrackResults(row.id, row.delivered_attempt ?? undefined);
  const snap = await getClientDecisionSnapshot(row.id);
  fs.writeFileSync(dumpPath(caseNumber), JSON.stringify({ row, rows, snap } satisfies Dump));
}

function buildContent(d: Dump): Content {
  const findings = buildClientFindings(d.rows);
  const report = projectClientReport((d.snap?.decision_snapshot ?? null) as Record<string, unknown> | null, d.snap?.vendor_questions, d.row.additional_questions ?? []);
  if (!report) throw new Error("no decision snapshot for the delivered attempt");
  const cl = d.row.clients;
  const clientName = cl?.company_name ? `${cl?.full_name ?? ""} (${cl.company_name})`.trim() : (cl?.full_name ?? "");
  if (!clientName || clientName === "—") {
    if (process.env.PDF_ALLOW_MISSING_NAME === "1") {
      return build({ ...d.row, clients: { full_name: "[Client name missing — internal proof]", company_name: null } });
    }
    throw new Error("Client name is missing on this case — refusing to render a deliverable addressed to nobody. (Root cause is the Stripe-webhook name gap; set PDF_ALLOW_MISSING_NAME=1 for an internal proof copy.)");
  }
  return build(d.row);
  function build(row: CaseRow): Content {
    const cl2 = row.clients;
    return {
      caseNumber: row.case_number, vendor: row.vendor_name ?? "—",
      brands: row.brands_submitted ?? [],
      clientName: cl2?.company_name ? `${cl2?.full_name ?? ""} (${cl2.company_name})`.trim() : (cl2?.full_name ?? ""),
      deliveredAt: fmt(row.delivered_at), verdict: row.verdict ?? "verify_before_purchase",
      report: report!, findings,
    };
  }
}

// ── Two-pass TOC ──
const sectionPages: Record<string, number> = {};
function PageCapture({ id }: { id: string }) {
  return <Text style={{ height: 0 }} render={({ pageNumber }) => { sectionPages[id] = pageNumber; return ""; }} />;
}

const PAGE = { paddingTop: 64, paddingBottom: 78, paddingLeft: 72, paddingRight: 72 };

function RunningFooter({ c, P }: { c: Content; P: Palette }) {
  return (
    <Text fixed style={{ position: "absolute", bottom: 36, left: 72, right: 72, fontFamily: "Mono", fontSize: 7, color: P.soft }}
      render={({ pageNumber, totalPages }) => documentFooter(c.clientName, pageNumber, totalPages)} />
  );
}

// Reference grammar: coloured numeral · bold sans heading · thick rule.
function SectionOpen({ no, title, P }: { no: string; title: string; P: Palette }) {
  return (
    <View minPresenceAhead={90}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <Text style={{ fontFamily: "Mono", fontWeight: 600, fontSize: 16, color: P.copper }}>{no}</Text>
        <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 23, color: P.ink }}>{title}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: P.ink, marginBottom: 18 }} />
    </View>
  );
}

// Toned callout box — tinted fill, accent bar, coloured bold heading (the reference grammar).
function ToneBox({ tone, heading, P, children, wrapOk = false }: { tone: string; heading: string | null; P: Palette; children: React.ReactNode; wrapOk?: boolean }) {
  const t = P.tone[tone] ?? P.tone.navy;
  return (
    <View wrap={wrapOk} style={{ flexDirection: "row", marginTop: 10, marginBottom: 4 }}>
      <View style={{ width: 4.5, backgroundColor: t.ink, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
      <View style={{ flex: 1, backgroundColor: t.bg, paddingVertical: 11, paddingHorizontal: 13, borderTopRightRadius: 6, borderBottomRightRadius: 6 }}>
        {heading ? <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 10.5, color: t.ink, marginBottom: 5 }}>{heading}</Text> : null}
        {children}
      </View>
    </View>
  );
}

function StatTile({ value, caption, barColour, P }: { value: string; caption: string; barColour: string; P: Palette }) {
  return (
    <View style={{ flex: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: P.zebra }}>
      <View style={{ height: 3.5, backgroundColor: barColour, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      <View style={{ paddingVertical: 10, paddingHorizontal: 11 }}>
        <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 19, color: P.ink }}>{value}</Text>
        <Text style={{ fontFamily: "Sans", fontSize: 8, color: P.soft, marginTop: 3, lineHeight: 1.35 }}>{caption}</Text>
      </View>
    </View>
  );
}

// Dark table header bar + light zebra rows (reference grammar).
function TableHeader({ cols, P }: { cols: [string, number | "flex"][]; P: Palette }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: P.navy, paddingVertical: 7, paddingHorizontal: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
      {cols.map(([label, w]) => (
        <Text key={label} style={{ ...(w === "flex" ? { flex: 1 } : { width: w }), fontFamily: "Sans", fontWeight: 700, fontSize: 9.5, color: "#FFFFFF" }}>{label}</Text>
      ))}
    </View>
  );
}

// Engine-structured prose in reference grammar: labelled sections become toned callout boxes
// (tone from the fixed label map), enumerations become lists inside them, bare prose stays body.
function StructuredProse({ text, P }: { text: string; P: Palette }) {
  const blocks = parseFindingStructure(text);
  // Group: heading + following blocks until next heading.
  const groups: { heading: string | null; blocks: typeof blocks }[] = [];
  for (const b of blocks) {
    if (b.type === "heading") groups.push({ heading: b.text, blocks: [] });
    else if (groups.length === 0 || groups[groups.length - 1].heading === null) {
      if (groups.length === 0) groups.push({ heading: null, blocks: [] });
      groups[groups.length - 1].blocks.push(b);
    } else groups[groups.length - 1].blocks.push(b);
  }
  const body = (b: (typeof blocks)[number], i: number, inkColor: string) => {
    if (b.type === "list") {
      return (
        <View key={i} style={{ marginBottom: 3 }}>
          {b.items.map((item, j) => (
            <View key={j} style={{ flexDirection: "row", marginBottom: 2.5 }}>
              <Text style={{ fontFamily: "Serif", fontSize: 10, lineHeight: 1.45, color: inkColor, width: 12 }}>–</Text>
              <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10, lineHeight: 1.45, color: inkColor }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (b.type === "prose") {
      return <Text key={i} orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10, lineHeight: 1.48, color: inkColor, marginBottom: 4 }}>{b.text}</Text>;
    }
    return null;
  };
  return (
    <View>
      {groups.map((g, gi) => {
        if (!g.heading) return <View key={gi}>{g.blocks.map((b, i) => body(b, i, P.ink))}</View>;
        const chars = g.blocks.reduce((s, b) => s + (b.type === "list" ? b.items.join("").length : b.type === "prose" ? b.text.length : 0), 0);
        // v2 fix §1: boxes above ~600 chars may split across pages — an unsplittable near-page
        // box was what stranded area headings over blank pages.
        return (
          <ToneBox key={gi} tone={toneFor(g.heading)} heading={g.heading} P={P} wrapOk={chars > 600}>
            {g.blocks.map((b, i) => body(b, i, P.ink))}
          </ToneBox>
        );
      })}
    </View>
  );
}

function ReportDoc({ c, P, mono }: { c: Content; P: Palette; mono: boolean }) {
  const meta = VERDICT_META[c.verdict];
  const verdictInk = P.verdict[c.verdict];
  const vTone = { source_clear: "green", usable_with_conditions: "amber", verify_before_purchase: "amber", do_not_rely: "red" }[c.verdict] ?? "amber";
  const r = c.report;
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber}${mono ? " (greyscale)" : ""}`} author="Hyprr Retail LLC">
      {/* ═══ COVER ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.navy, paddingTop: 60, paddingBottom: 0, paddingHorizontal: 68, fontFamily: "Sans" }}>
        <Wordmark h={21} P={P} onNavy />
        <View style={{ marginTop: 86 }}>
          <View style={{ width: 46, height: 3.5, backgroundColor: P.copper, marginBottom: 16 }} />
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 34, lineHeight: 1.12, color: "#FFFFFF", maxWidth: 390 }}>{DOC_TITLE}</Text>
          <Text style={{ fontFamily: "Sans", fontWeight: 600, fontSize: 13.5, color: "#FFFFFF", opacity: 0.9, marginTop: 12 }}>{c.vendor} · {c.brands.join(" · ")}</Text>
        </View>
        <View style={{ borderWidth: 1.25, borderColor: "#FFFFFF", borderRadius: 6, padding: 16, marginTop: 44, maxWidth: 470 }}>
          <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 9, color: "#FFFFFF", opacity: 0.8, marginBottom: 5, letterSpacing: 1.5, textTransform: "uppercase" }}>Verdict · Level {meta.level} of 4</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 22, color: "#FFFFFF" }}>{meta.name}</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: "#FFFFFF", opacity: 0.93, marginTop: 8 }}>{r.headline}</Text>
        </View>
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 68, paddingBottom: 38 }}>
          <View style={{ height: 0.75, backgroundColor: "#FFFFFF", opacity: 0.4, marginBottom: 12 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[[COVER_META_LABELS.preparedFor, c.clientName], [COVER_META_LABELS.delivered, c.deliveredAt], [COVER_META_LABELS.caseRef, c.caseNumber], [COVER_META_LABELS.inside, coverInsideLine(r.questions.length)]].map(([k, v]) => (
              <View key={k} style={{ maxWidth: 150 }}>
                <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 7, color: "#FFFFFF", opacity: 0.65, marginBottom: 2, textTransform: "uppercase" }}>{k}</Text>
                <Text style={{ fontFamily: k === COVER_META_LABELS.caseRef ? "Mono" : "Sans", fontSize: 8.5, color: "#FFFFFF" }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ═══ CONTENTS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 23, color: P.ink }}>{CONTENTS_TITLE}</Text>
        </View>
        <View style={{ height: 3, backgroundColor: P.ink, marginBottom: 16 }} />
        {SECTIONS.map((s, i) => (
          /* v2 fix §6 — page number right-aligned behind a dotted leader, never trailing the text */
          <View key={s.no} style={{ flexDirection: "row", backgroundColor: i % 2 ? P.zebra : P.paper, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 12, gap: 14, marginBottom: 4 }}>
            <Text style={{ fontFamily: "Mono", fontWeight: 600, fontSize: 12, color: P.copper, width: 26 }}>{s.no}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 12, color: P.ink }}>{s.title}</Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: P.hairline, borderStyle: "dotted", marginHorizontal: 8, marginBottom: 2.5 }} />
                <Text style={{ fontFamily: "Mono", fontWeight: 600, fontSize: 11, color: P.ink }}>{sectionPages[s.no] ?? "·"}</Text>
              </View>
              <Text style={{ fontFamily: "Sans", fontSize: 8.5, color: P.soft, marginTop: 2.5 }}>{s.toc}</Text>
            </View>
          </View>
        ))}
        <Text style={{ fontFamily: "Sans", fontSize: 8.5, lineHeight: 1.5, color: P.soft, marginTop: 22 }}>{confidentialityLine(c.clientName)} {ISSUER}</Text>
      </Page>

      {/* ═══ 01 · THE VERDICT ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="01" />
        <SectionOpen no="01" title={SECTIONS[0].title} P={P} />
        {/* Stat tiles — the document's numbers at a glance (all projection-derived) */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <StatTile value={`${meta.level} / 4`} caption="Verdict level on the four-level scale" barColour={verdictInk} P={P} />
          <StatTile value={`${c.findings.length}`} caption="Assessment areas examined" barColour={P.navy} P={P} />
          <StatTile value={`${r.questions.length}`} caption="Verification questions to put to the supplier" barColour={P.navy} P={P} />
          <StatTile value={`${c.brands.length}`} caption="Brands in scope of this research" barColour={P.navy} P={P} />
        </View>
        {/* The verdict box */}
        <ToneBox tone={vTone} heading={null} P={P}>
          <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 9, color: verdictInk, textTransform: "uppercase", letterSpacing: 1 }}>Verdict · Level {meta.level} of 4</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 27, color: verdictInk, marginTop: 5 }}>{meta.name}</Text>
          <View style={{ flexDirection: "row", gap: 4, marginTop: 12 }}>
            {SCALE_ORDER.map((k) => {
              const active = k === c.verdict;
              return (
                <View key={k} style={{ flex: 1 }}>
                  <View style={{ height: 10, borderRadius: 2, backgroundColor: active ? verdictInk : P.paper, borderWidth: active ? 0 : 0.75, borderColor: P.hairline }} />
                  <Text style={{ fontFamily: "Sans", fontWeight: active ? 700 : 400, fontSize: 7.2, color: active ? verdictInk : P.soft, marginTop: 3 }}>{VERDICT_META[k].name}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: P.ink, marginTop: 12 }}>{meta.means}</Text>
        </ToneBox>
        <ToneBox tone="red" heading={RISK_HEAD} P={P}>
          <Text orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10, lineHeight: 1.5, color: P.ink }}>{r.the_real_risk}</Text>
        </ToneBox>
      </Page>

      {/* ═══ 02 · ASSESSMENT FINDINGS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="02" />
        <SectionOpen no="02" title={SECTIONS[1].title} P={P} />
        {/* Areas × certainty — dark-header table */}
        <View wrap={false} style={{ marginBottom: 18 }}>
          <TableHeader cols={[[AREAS_TABLE.colArea, "flex"], [AREAS_TABLE.colStatus, 100]]} P={P} />
          {c.findings.map((f, i) => {
            const st = areaStatus(f);
            return (
              <View key={f.id} style={{ flexDirection: "row", backgroundColor: i % 2 ? P.zebra : P.paper, paddingVertical: 6.5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: P.hairline }}>
                <Text style={{ flex: 1, fontFamily: "Sans", fontWeight: 600, fontSize: 10, color: P.ink }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
                <Text style={{ width: 100, fontFamily: "Sans", fontWeight: 700, fontSize: 9.5, color: (P.tone[st.tone] ?? P.tone.navy).ink }}>{st.label}</Text>
              </View>
            );
          })}
        </View>
        {c.findings.map((f) => {
          const { detail } = findingText(f);
          const notes = findingNotes(f);
          const st = areaStatus(f);
          // v2 fix §4 — Not-assessed / Informational areas carry a one-line engine statement,
          // not findings prose: present it as a scope-note callout (deterministic: by status).
          const isScopeNote = st.label === "Not assessed" || st.label === "Informational";
          // v2 fix §1 — keep-with-next must cover the heading PLUS its first content. For short
          // (scope-note) areas the heading and box bind ATOMICALLY in one unsplittable view —
          // minPresenceAhead alone proved unreliable across sibling boundaries.
          const headingRow = (
            <View minPresenceAhead={150} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, borderBottomWidth: 1.5, borderBottomColor: P.ink, paddingBottom: 4 }}>
              <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 14, color: P.ink }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
              <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 9.5, color: (P.tone[st.tone] ?? P.tone.navy).ink }}>{st.label}</Text>
            </View>
          );
          return (
            <View key={f.id} style={{ marginBottom: 14 }}>
              {isScopeNote ? (
                <View wrap={false}>
                  {headingRow}
                  {detail ? (
                    <ToneBox tone="navy" heading={SCOPE_NOTE_LABEL} P={P}>
                      <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.5, color: P.ink }}>{detail}</Text>
                    </ToneBox>
                  ) : null}
                </View>
              ) : (
                <>
                  {headingRow}
                  {detail ? <StructuredProse text={detail} P={P} /> : null}
                </>
              )}
              {notes.length > 0 && (
                <ToneBox tone="navy" heading={BOUNDARY_CALLOUT_LABEL} P={P}>
                  {notes.map((n) => (
                    <Text key={n.label} style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.45, color: P.ink, marginBottom: 2 }}>
                      <Text style={{ fontFamily: "Sans", fontWeight: 700 }}>{n.label}: </Text>{n.text}
                    </Text>
                  ))}
                </ToneBox>
              )}
            </View>
          );
        })}
      </Page>

      {/* ═══ 03 · WHAT WE COULD NOT CONFIRM ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="03" />
        <SectionOpen no="03" title={SECTIONS[2].title} P={P} />
        <Text style={{ fontFamily: "Sans", fontWeight: 700, fontSize: 13, color: P.ink, marginBottom: 6 }}>{LIMITS_HEAD}</Text>
        {r.leading_interpretation ? <StructuredProse text={r.leading_interpretation} P={P} /> : null}
        {r.what_to_monitor.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <TableHeader cols={[["No.", 34], [MONITOR_TABLE_CAPTION, "flex"]]} P={P} />
            {r.what_to_monitor.map((m, i) => (
              <View key={i} wrap={false} style={{ flexDirection: "row", backgroundColor: i % 2 ? P.zebra : P.paper, paddingVertical: 6.5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: P.hairline }}>
                <Text style={{ width: 34, fontFamily: "Mono", fontWeight: 600, fontSize: 9, color: P.copper }}>{String(i + 1).padStart(2, "0")}</Text>
                <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10, lineHeight: 1.45, color: P.ink }}>{m}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* ═══ 04 · VERIFICATION CHECKLIST ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="04" />
        <SectionOpen no="04" title={SECTIONS[3].title} P={P} />
        <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: P.ink, marginBottom: 12 }}>{CHECKLIST_INTRO}</Text>
        <TableHeader cols={[[CHECKLIST_TABLE.colNo, 34], [CHECKLIST_TABLE.colQuestion, "flex"]]} P={P} />
        {r.questions.map((q, i) => (
          <View key={i} wrap={false} style={{ flexDirection: "row", backgroundColor: i % 2 ? P.zebra : P.paper, paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: P.hairline }}>
            <Text style={{ width: 34, fontFamily: "Mono", fontWeight: 600, fontSize: 9, color: P.copper }}>{String(i + 1).padStart(2, "0")}</Text>
            <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10, lineHeight: 1.45, color: P.ink }}>
              {q.question}{q.source === "additional" ? " †" : ""}
            </Text>
          </View>
        ))}
        {/* v2 fix §3 — the footnote renders only when at least one † marker exists. */}
        {r.questions.some((q) => q.source === "additional") && (
          <Text style={{ fontFamily: "Sans", fontSize: 8, color: P.soft, marginTop: 8 }}>† {CHECKLIST_TABLE.analystNote}</Text>
        )}
      </Page>

      {/* ═══ 05 · SCOPE, DEFINITIONS & LIMITS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Sans" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="05" />
        <SectionOpen no="05" title={SECTIONS[4].title} P={P} />
        {([["Verified", "green"], ["Assessed", "amber"], ["Not assessed", "navy"]] as [keyof typeof CHIP_DEFS extends never ? string : string, string][]).map(([k, tone]) => (
          <ToneBox key={k} tone={tone} heading={k} P={P}>
            <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.45, color: P.ink }}>{CHIP_DEFS[k.toLowerCase().replace(" ", "_") as keyof typeof CHIP_DEFS]}</Text>
          </ToneBox>
        ))}
        <ToneBox tone="red" heading="Category requirements" P={P}>
          <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.5, color: P.ink }}>{CATEGORY_NOTE}</Text>
        </ToneBox>
        <View style={{ marginTop: 22, borderTopWidth: 1.5, borderTopColor: P.ink, paddingTop: 12 }}>
          <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.55, color: P.ink }}>{CLOSING}</Text>
          <Text style={{ fontFamily: "Sans", fontSize: 8.5, lineHeight: 1.5, color: P.soft, marginTop: 10 }}>{confidentialityLine(c.clientName)}</Text>
          <Text style={{ fontFamily: "Mono", fontSize: 7.5, color: P.soft, marginTop: 6 }}>{c.caseNumber} · {c.vendor} · delivered {c.deliveredAt} · {ISSUER}</Text>
        </View>
      </Page>
    </Document>
  );
}

async function main() {
  const caseNumber = process.argv[2] ?? "AWI-2607-022";
  if (process.env.PDF_DUMP_MODE === "1") return dumpCase(caseNumber);
  const r = spawnSync("npx", ["tsx", "--conditions=react-server", "--tsconfig", "tsconfig.json", "--env-file=.env.local", "scripts/pdf/report-document.tsx", caseNumber],
    { shell: true, stdio: "inherit", env: { ...process.env, PDF_DUMP_MODE: "1" } });
  if (r.status !== 0) throw new Error("dump phase failed");
  const c = buildContent(JSON.parse(fs.readFileSync(dumpPath(caseNumber), "utf8")) as Dump);
  const outDir = path.join(process.cwd(), "docs/pdf-samples");
  fs.mkdirSync(outDir, { recursive: true });
  await renderToFile((<ReportDoc c={c} P={COLOUR} mono={false} />) as React.ReactElement<DocumentProps>, path.join(os.tmpdir(), "hyprriq-toc-pass.pdf"));
  console.log("toc pass:", JSON.stringify(sectionPages));
  for (const [file, P, mono] of [[`${caseNumber}-report.pdf`, COLOUR, false], [`${caseNumber}-report-grey.pdf`, GREY, true]] as [string, Palette, boolean][]) {
    await renderToFile((<ReportDoc c={c} P={P} mono={mono} />) as React.ReactElement<DocumentProps>, path.join(outDir, file));
    console.log("wrote", file);
  }
  console.log(`content: ${c.findings.length} areas · ${c.report.questions.length} questions · ${c.report.what_to_monitor.length} monitor items · verdict ${c.verdict}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
