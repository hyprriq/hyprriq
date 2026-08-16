/**
 * THE REPORT AS A DOCUMENT — full PDF build (rebuild brief, 2026-08-16).
 * Replaces the sample passes: one complete document, every section, real case content.
 *
 * Run (founder): npx tsx scripts/pdf/report-document.tsx [case_number]
 * Output: docs/pdf-samples/<case>-report.pdf + <case>-report-grey.pdf (true Rec.601 luma).
 *
 * ONE FIXED TEMPLATE. Every structural decision below is a pure function of the projected
 * report — no per-report invention, no new engine prose. MEANING IS LOCKED: findings, the
 * risk, the leading interpretation, what-to-monitor, and every checklist question arrive
 * complete through the same projection chain the portal uses (buildClientFindings +
 * projectClientReport). What changed is the DRESS: document sections (01–05), a contents
 * page with real page numbers (two-pass render), tables where content is comparable
 * (areas × certainty, monitor items, the checklist), bordered callouts for the risk and
 * each area's boundary notes, and a committed full-bleed cover carrying the boxed verdict.
 * Structural copy lives in lib/content/reportDocument.ts (fixture-covered).
 *
 * DELIBERATELY NOT BUILT (determinism rule, §2 of the brief): a per-brand two-column
 * comparison table. The engine's brand-separated blocks are not guaranteed symmetric
 * (different labelled sections per brand), so a fixed two-column template would render
 * ragged or force per-report judgement. Brand blocks render as native headed subsections
 * instead — parallel by adjacency, deterministic for every case.
 *
 * HARD RULE (§7): a missing client name FAILS the build loudly. No dash addressed to nobody.
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
  BOUNDARY_CALLOUT_LABEL, COVER_META_LABELS, coverInsideLine, documentFooter,
} from "@/lib/content/reportDocument";

// ── Print palette (docs/PRINT_DESIGN_SPEC.md §1) ──
const COLOUR = {
  paper: "#FFFFFF", ink: "#14181D", soft: "#43494F", navy: "#122E4A", copper: "#9A551F", hairline: "#C9CDD2",
  verdict: { source_clear: "#1D5638", usable_with_conditions: "#755110", verify_before_purchase: "#8A470B", do_not_rely: "#7C2622" } as Record<string, string>,
};
const toGrey = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const h = Math.round(0.299 * r + 0.587 * g + 0.114 * b).toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
};
const GREY: typeof COLOUR = {
  paper: "#FFFFFF", ink: toGrey(COLOUR.ink), soft: toGrey(COLOUR.soft), navy: toGrey(COLOUR.navy),
  copper: toGrey(COLOUR.copper), hairline: toGrey(COLOUR.hairline),
  verdict: Object.fromEntries(Object.entries(COLOUR.verdict).map(([k, v]) => [k, toGrey(v)])),
};
type Palette = typeof COLOUR;

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

// areaChip — same derivation as the portal (report-view.tsx; display logic, not prose).
function areaStatus(f: Finding): string {
  if (f.track_key === "sourcing_logic") return "Informational";
  const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
  const notAssessed = typeof j.summary === "string" && /not (?:assessed|evaluated)|no documents were provided/i.test(j.summary) && f.track_key === "documentation_review";
  if (notAssessed || (f.track_key === "documentation_review" && !j.documentation_finding && typeof j.summary === "string" && /excluded from scoring/.test(j.summary))) return "Not assessed";
  return f.finding_certainty === "verified" ? "Verified" : "Assessed";
}

// ── Fonts (ligature-stripped) ──
const F = (f: string) => path.join(process.cwd(), "scripts/pdf/fonts", f);
Font.register({ family: "Fraunces", fonts: [{ src: F("fraunces-600.ttf"), fontWeight: 600 }] });
Font.register({ family: "Serif", fonts: [
  { src: F("source-serif-400.ttf"), fontWeight: 400 },
  { src: F("source-serif-600.ttf"), fontWeight: 600 },
  { src: F("source-serif-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
] });
Font.register({ family: "Mono", fonts: [{ src: F("jetbrains-400.ttf"), fontWeight: 400 }] });
Font.registerHyphenationCallback((w) => [w]);

const wmSvg = fs.readFileSync(path.join(process.cwd(), "public/brand/wordmark.svg"), "utf8");
const wmPaths = [...wmSvg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const wmVb = /viewBox="([^"]+)"/.exec(wmSvg)![1];
const [, , wmW, wmH] = wmVb.split(" ").map(Number);
function Wordmark({ h, P, onNavy }: { h: number; P: Palette; onNavy: boolean }) {
  return (
    <Svg width={(h * wmW) / wmH} height={h} viewBox={wmVb}>
      <Path d={wmPaths[0]} fill={onNavy ? "#FFFFFF" : P.navy} />
      <Path d={wmPaths[1]} fill={onNavy ? P.copper : P.copper} />
    </Svg>
  );
}

// ── Content (same dump/projection architecture as the earlier passes) ──
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
  // §7 HARD RULE — no document addressed to nobody. Fail loudly; the dev-lane fix is the
  // Stripe-webhook name capture. Override ONLY for internal design review, clearly marked.
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

// ── Two-pass TOC: pass 1 captures each section's real page via render callbacks ──
const sectionPages: Record<string, number> = {};
function PageCapture({ id }: { id: string }) {
  return <Text style={{ height: 0 }} render={({ pageNumber }) => { sectionPages[id] = pageNumber; return ""; }} />;
}

// ── Geometry (spec §3) ──
const PAGE = { paddingTop: 72, paddingBottom: 84, paddingLeft: 90, paddingRight: 172 };
const TEXT_W = 350;

function RunningFooter({ c, P }: { c: Content; P: Palette }) {
  return (
    <Text fixed style={{ position: "absolute", bottom: 40, left: 90, width: TEXT_W + 82, fontFamily: "Mono", fontSize: 7, color: P.soft }}
      render={({ pageNumber, totalPages }) => documentFooter(c.clientName, pageNumber, totalPages)} />
  );
}

function SectionOpen({ no, title, P }: { no: string; title: string; P: Palette }) {
  return (
    <View minPresenceAhead={80}>
      <View style={{ height: 2, backgroundColor: P.navy, width: TEXT_W, marginBottom: 10 }} />
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
        <Text style={{ fontFamily: "Mono", fontSize: 11, color: P.soft }}>{no}</Text>
        <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, color: P.ink }}>{title}</Text>
      </View>
    </View>
  );
}

// Bordered callout — square corners, hairline box. Document furniture, not web card.
function Callout({ label, children, P }: { label: string; children: React.ReactNode; P: Palette }) {
  return (
    <View wrap={false} style={{ borderWidth: 0.75, borderColor: P.ink, padding: 12, marginTop: 12 }}>
      <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

// Engine-structured prose, rendered as document furniture: labelled sections → subheads,
// enumerations → dashed lists, prose → body. Same parser the portal renders through.
function Prose({ text, P, brands }: { text: string; P: Palette; brands: string[] }) {
  const blocks = parseFindingStructure(text);
  const isBrandHead = (t: string) => brands.some((b) => t.toLowerCase().startsWith(b.toLowerCase()));
  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const brand = isBrandHead(b.text);
          return (
            <View key={i} minPresenceAhead={36} style={{ marginTop: i === 0 ? 0 : brand ? 12 : 9, marginBottom: 4 }}>
              {brand && <View style={{ height: 0.75, backgroundColor: P.hairline, marginBottom: 6, width: 120 }} />}
              <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: brand ? 10.5 : 9, color: P.ink }}>{b.text}</Text>
            </View>
          );
        }
        if (b.type === "list") {
          return (
            <View key={i} style={{ marginBottom: 5 }}>
              {b.items.map((item, j) => (
                <View key={j} style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.48, color: P.ink, width: 13 }}>–</Text>
                  <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.48, color: P.ink }}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.48, color: P.ink, marginBottom: 6 }}>{b.text}</Text>
        );
      })}
    </View>
  );
}

function ReportDoc({ c, P, mono }: { c: Content; P: Palette; mono: boolean }) {
  const meta = VERDICT_META[c.verdict];
  const verdictInk = P.verdict[c.verdict];
  const r = c.report;
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber}${mono ? " (greyscale)" : ""}`} author="Hyprr Retail LLC">
      {/* ═══ COVER — full-bleed brand plate, boxed verdict, metadata strip ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.navy, paddingTop: 64, paddingBottom: 0, paddingHorizontal: 72, fontFamily: "Serif" }}>
        <Wordmark h={20} P={P} onNavy />
        <View style={{ marginTop: 96 }}>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 34, lineHeight: 1.12, color: "#FFFFFF", maxWidth: 380 }}>{DOC_TITLE}</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 13, color: "#FFFFFF", opacity: 0.85, marginTop: 10 }}>{c.vendor} · {c.brands.join(" · ")}</Text>
        </View>
        {/* The boxed headline verdict — the one-line conclusion, given real weight */}
        <View style={{ borderWidth: 1, borderColor: "#FFFFFF", padding: 16, marginTop: 48, maxWidth: 460 }}>
          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: "#FFFFFF", opacity: 0.8, marginBottom: 5 }}>Verdict · Level {meta.level} of 4</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 21, color: "#FFFFFF" }}>{meta.name}</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: "#FFFFFF", opacity: 0.92, marginTop: 8 }}>{r.headline}</Text>
        </View>
        {/* Metadata strip along the foot */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 72, paddingBottom: 40 }}>
          <View style={{ height: 0.75, backgroundColor: "#FFFFFF", opacity: 0.4, marginBottom: 12 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[[COVER_META_LABELS.preparedFor, c.clientName], [COVER_META_LABELS.delivered, c.deliveredAt], [COVER_META_LABELS.caseRef, c.caseNumber], [COVER_META_LABELS.inside, coverInsideLine(r.questions.length)]].map(([k, v]) => (
              <View key={k} style={{ maxWidth: 150 }}>
                <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 7, color: "#FFFFFF", opacity: 0.65, marginBottom: 2 }}>{k}</Text>
                <Text style={{ fontFamily: k === COVER_META_LABELS.caseRef ? "Mono" : "Serif", fontSize: 8.5, color: "#FFFFFF" }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ═══ CONTENTS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, color: P.ink, marginBottom: 22 }}>{CONTENTS_TITLE}</Text>
        {SECTIONS.map((s) => (
          <View key={s.no} style={{ flexDirection: "row", borderTopWidth: 0.75, borderTopColor: P.hairline, paddingVertical: 10, gap: 12 }}>
            <Text style={{ fontFamily: "Mono", fontSize: 9.5, color: P.soft, width: 22 }}>{s.no}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 11.5, color: P.ink }}>{s.title}</Text>
              <Text style={{ fontFamily: "Serif", fontSize: 9, color: P.soft, marginTop: 2 }}>{s.toc}</Text>
            </View>
            <Text style={{ fontFamily: "Mono", fontSize: 9.5, color: P.ink }}>{sectionPages[s.no] ?? "·"}</Text>
          </View>
        ))}
        <View style={{ height: 0.75, backgroundColor: P.hairline }} />
        <Text style={{ fontFamily: "Serif", fontSize: 8.5, lineHeight: 1.5, color: P.soft, marginTop: 20 }}>{confidentialityLine(c.clientName)} {ISSUER}</Text>
      </Page>

      {/* ═══ 01 · THE VERDICT ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="01" />
        <SectionOpen no="01" title={SECTIONS[0].title} P={P} />
        <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 28, lineHeight: 1.1, color: verdictInk }}>{meta.name}</Text>
        <Text style={{ fontFamily: "Mono", fontSize: 9, color: P.soft, marginTop: 5 }}>Level {meta.level} of 4</Text>
        <View style={{ flexDirection: "row", gap: 4, marginTop: 14 }}>
          {SCALE_ORDER.map((k) => {
            const active = k === c.verdict;
            return (
              <View key={k} style={{ flex: 1 }}>
                <View style={{ height: 11, backgroundColor: active ? P.ink : P.paper, borderWidth: 0.75, borderColor: active ? P.ink : P.hairline }} />
                <Text style={{ fontFamily: "Serif", fontWeight: active ? 600 : 400, fontSize: 7.5, color: active ? P.ink : P.soft, marginTop: 3.5 }}>{VERDICT_META[k].name}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ fontFamily: "Serif", fontSize: 11.5, lineHeight: 1.5, color: P.ink, marginTop: 16 }}>{meta.means}</Text>
        <Callout label={RISK_HEAD} P={P}>
          <Text orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: P.ink }}>{r.the_real_risk}</Text>
        </Callout>
      </Page>

      {/* ═══ 02 · ASSESSMENT FINDINGS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="02" />
        <SectionOpen no="02" title={SECTIONS[1].title} P={P} />
        {/* The five areas × certainty — a table, not a list */}
        <View wrap={false} style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 6 }}>{AREAS_TABLE.caption}</Text>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: P.ink, paddingBottom: 4 }}>
            <Text style={{ flex: 1, fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink }}>{AREAS_TABLE.colArea}</Text>
            <Text style={{ width: 90, fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink }}>{AREAS_TABLE.colStatus}</Text>
          </View>
          {c.findings.map((f) => (
            <View key={f.id} style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: P.hairline, paddingVertical: 5 }}>
              <Text style={{ flex: 1, fontFamily: "Serif", fontSize: 10, color: P.ink }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
              <Text style={{ width: 90, fontFamily: "Serif", fontWeight: 600, fontSize: 9.5, color: P.soft }}>{areaStatus(f)}</Text>
            </View>
          ))}
        </View>
        {/* Each area in full — engine structure as document furniture */}
        {c.findings.map((f, idx) => {
          const { detail } = findingText(f);
          const notes = findingNotes(f);
          return (
            <View key={f.id} style={{ marginBottom: 16 }}>
              <View minPresenceAhead={60} style={{ borderTopWidth: idx === 0 ? 0 : 0.75, borderTopColor: P.hairline, paddingTop: idx === 0 ? 0 : 12, marginBottom: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 12.5, color: P.ink }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
                <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 8.5, color: P.soft }}>{areaStatus(f)}</Text>
              </View>
              {detail ? <Prose text={detail} P={P} brands={c.brands} /> : null}
              {notes.length > 0 && (
                <Callout label={BOUNDARY_CALLOUT_LABEL} P={P}>
                  {notes.map((n) => (
                    <Text key={n.label} style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.45, color: P.ink, marginBottom: 2 }}>
                      <Text style={{ fontWeight: 600 }}>{n.label}: </Text>{n.text}
                    </Text>
                  ))}
                </Callout>
              )}
            </View>
          );
        })}
      </Page>

      {/* ═══ 03 · WHAT WE COULD NOT CONFIRM ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="03" />
        <SectionOpen no="03" title={SECTIONS[2].title} P={P} />
        <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 12.5, color: P.ink, marginBottom: 6 }}>{LIMITS_HEAD}</Text>
        {r.leading_interpretation ? <Prose text={r.leading_interpretation} P={P} brands={c.brands} /> : null}
        {r.what_to_monitor.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 6 }}>{MONITOR_TABLE_CAPTION}</Text>
            {r.what_to_monitor.map((m, i) => (
              <View key={i} wrap={false} style={{ flexDirection: "row", borderTopWidth: 0.75, borderTopColor: P.hairline, paddingVertical: 6, gap: 12 }}>
                <Text style={{ fontFamily: "Mono", fontSize: 9, color: P.soft, width: 20 }}>{String(i + 1).padStart(2, "0")}</Text>
                <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.45, color: P.ink }}>{m}</Text>
              </View>
            ))}
            <View style={{ height: 0.75, backgroundColor: P.hairline }} />
          </View>
        )}
      </Page>

      {/* ═══ 04 · VERIFICATION CHECKLIST — a numbered table ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="04" />
        <SectionOpen no="04" title={SECTIONS[3].title} P={P} />
        <Text style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.5, color: P.ink, marginBottom: 12 }}>{CHECKLIST_INTRO}</Text>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: P.ink, paddingBottom: 4 }}>
          <Text style={{ width: 30, fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink }}>{CHECKLIST_TABLE.colNo}</Text>
          <Text style={{ flex: 1, fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink }}>{CHECKLIST_TABLE.colQuestion}</Text>
        </View>
        {r.questions.map((q, i) => (
          <View key={i} wrap={false} style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: P.hairline, paddingVertical: 6.5 }}>
            <Text style={{ width: 30, fontFamily: "Mono", fontSize: 9, color: P.soft }}>{String(i + 1).padStart(2, "0")}</Text>
            <Text orphans={2} widows={2} style={{ flex: 1, fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.45, color: P.ink }}>
              {q.question}{q.source === "additional" ? " †" : ""}
            </Text>
          </View>
        ))}
        <Text style={{ fontFamily: "Serif", fontSize: 8, color: P.soft, marginTop: 8 }}>† {CHECKLIST_TABLE.analystNote}</Text>
      </Page>

      {/* ═══ 05 · SCOPE, DEFINITIONS & LIMITS ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <PageCapture id="05" />
        <SectionOpen no="05" title={SECTIONS[4].title} P={P} />
        {[["Verified", CHIP_DEFS.verified], ["Assessed", CHIP_DEFS.assessed], ["Not assessed", CHIP_DEFS.not_assessed]].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", gap: 12, marginBottom: 7 }} wrap={false}>
            <Text style={{ width: 78, fontFamily: "Serif", fontWeight: 600, fontSize: 10, color: P.ink }}>{k}</Text>
            <Text style={{ flex: 1, fontFamily: "Serif", fontSize: 10, lineHeight: 1.45, color: P.ink }}>{v}</Text>
          </View>
        ))}
        <Callout label="Category requirements" P={P}>
          <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.5, color: P.ink }}>{CATEGORY_NOTE}</Text>
        </Callout>
        <View style={{ marginTop: 26, borderTopWidth: 0.75, borderTopColor: P.hairline, paddingTop: 12 }}>
          <Text style={{ fontFamily: "Serif", fontSize: 9.5, lineHeight: 1.55, color: P.ink }}>{CLOSING}</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 8.5, lineHeight: 1.5, color: P.soft, marginTop: 10 }}>{confidentialityLine(c.clientName)}</Text>
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
  // PASS 1 — layout only, captures real section start pages for the contents page.
  await renderToFile((<ReportDoc c={c} P={COLOUR} mono={false} />) as React.ReactElement<DocumentProps>, path.join(os.tmpdir(), "hyprriq-toc-pass.pdf"));
  console.log("toc pass:", JSON.stringify(sectionPages));
  // PASS 2 — final renders with the captured numbers.
  for (const [file, P, mono] of [[`${caseNumber}-report.pdf`, COLOUR, false], [`${caseNumber}-report-grey.pdf`, GREY, true]] as [string, Palette, boolean][]) {
    await renderToFile((<ReportDoc c={c} P={P} mono={mono} />) as React.ReactElement<DocumentProps>, path.join(outDir, file));
    console.log("wrote", file);
  }
  console.log(`content: ${c.findings.length} areas · ${c.report.questions.length} questions · ${c.report.what_to_monitor.length} monitor items · verdict ${c.verdict}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
