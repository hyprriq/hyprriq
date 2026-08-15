/**
 * PDF REPORT — THREE DESIGN SAMPLES (UI/UX thread, 2026-08-15).
 * Implements docs/REPORT_DOCUMENT_IDENTITY_SPEC.md against ONE real case, three document designs.
 *
 * Run (founder) — ONE command, no flags:
 *   npx tsx scripts/pdf/generate-samples.tsx [case_number]
 * (The DB read needs --conditions=react-server for the server-only poison, but that condition
 *  breaks @react-pdf's reconciler — so this script spawns ITSELF in dump mode with the
 *  condition, then renders in the parent process from the dumped rows. The projection runs in
 *  the parent through the same pure functions the portal uses.)
 * Default case: AWI-2607-022 (the only case that ran on the real engine).
 * Output: docs/pdf-samples/<case>-sample-{a,b,c}.pdf — deliberately NOT under public/: served
 * files are auth-gated per-session, not per-client, so a real client's report PDF in the web
 * root would be fetchable by any signed-in user. Repo-only until the real PDF feature ships
 * with per-client authorization.
 *
 * CONTENT IS LOCKED — the PDF carries exactly what the portal carries, through the SAME
 * projection and clean-prose pipeline the portal uses:
 *   findings  = buildClientFindings(getCaseTrackResults(id, delivered_attempt))   [test-locked
 *               as identical to the portal's getCaseFindings chain]
 *   report    = projectClientReport(getClientDecisionSnapshot(id), additional_questions)
 * No new prose, no summarising, no reordering of meaning. The static UI strings below are
 * VERBATIM copies of the shipping report copy (components/portal/report-view.tsx) plus the
 * document-identity strings from the spec (fixture-covered in bannedLanguage.fix.test.ts).
 * The three samples differ in DESIGN ONLY: cover treatment, verdict placement, page
 * architecture, typographic hierarchy.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import React from "react";
import { Document, Page, Text, View, Svg, Path, Font, renderToFile, type DocumentProps } from "@react-pdf/renderer";
// PURE projection + presentation modules only at top level (client-safe by the boundary law) —
// everything that touches supabase/server-only is dynamically imported in dump mode.
import { buildClientFindings } from "@/lib/admin/reviewView";
import { projectClientReport, type ClientReport } from "@/lib/portal/clientReport";
import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import type { Finding } from "@/lib/data/cases";
import type { TrackResultRow } from "@/lib/data/track-results";
import { DOC_TITLE, ISSUER, confidentialityLine as confidentiality, runningFooter } from "@/lib/content/documentIdentity";

// ── Settled palette (globals.css values — no new hex) ──
const C = {
  base: "#F5F7F9", surface: "#FFFFFF", subtle: "#EEF1F4", ink: "#161B22", ink2: "#3D454F",
  muted: "#5C6570", line: "#E2E6EB", lineStrong: "#CBD2DA", brand: "#173E63", brandHover: "#0E2B47",
  brandTint: "#E5EDF3", copper: "#9A551F",
  clearBg: "#E4EFEA", clearInk: "#256B4C", condBg: "#F7F0E2", condInk: "#8F6416",
  verifyBg: "#F8EDE2", verifyInk: "#A5560F", denyBg: "#F3E0DE", denyInk: "#9A2F2A",
};

// ── Locked display copy — VERBATIM from components/portal/report-view.tsx ──
const VERDICT_META: Record<string, { name: string; level: number; ink: string; bg: string; means: string }> = {
  source_clear: { name: "Source Clear", level: 1, ink: C.clearInk, bg: C.clearBg,
    means: "The evidence supported this source at the time of research. Standard diligence still applies — the decision stays yours." },
  usable_with_conditions: { name: "Usable With Conditions", level: 2, ink: C.condInk, bg: C.condBg,
    means: "Workable — with the stated conditions handled first. The conditions are part of the verdict, not a footnote." },
  verify_before_purchase: { name: "Verify Before Purchase", level: 3, ink: C.verifyInk, bg: C.verifyBg,
    means: "Do not place a large order — resolve the listed items first. Re-submit for an updated review once resolved." },
  do_not_rely: { name: "Do Not Rely", level: 4, ink: C.denyInk, bg: C.denyBg,
    means: "The evidence does not support relying on this source. The report explains what drove this." },
};
const AREA_NAMES: Record<string, string> = {
  supplier_identity: "Supplier Legitimacy",
  supply_chain_relationship: "Supply-Chain Relationship",
  brand_risk_assessment: "Brand Risk",
  documentation_review: "Documentation Review",
  sourcing_logic: "Sourcing Logic",
};
const CHIP_DEFS = {
  verified: "Independently corroborated — multiple independent sources confirm this.",
  assessed: "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation.",
  not_assessed: "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict.",
} as const;
const CHECKLIST_INTRO = "Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.";
const CATEGORY_NOTE =
  "Selling these brands in their marketplace categories may require category approval or specific documentation before listing. This is a marketplace requirement independent of this report’s verdict — confirm your category status before you commit.";
const CLOSING =
  "This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval, account safety, or brand action. The decision to purchase is yours.";
const FROM_REVIEW_TEAM = "From our review team";
// (Document-identity strings are imported at the top from lib/content/documentIdentity — the
//  single fixture-covered source.)

// areaChip — same derivation as the portal (report-view.tsx areaChip; display logic, not prose).
function areaChip(f: Finding): { label: string; bg: string; ink: string; def: string } {
  if (f.track_key === "sourcing_logic") return { label: "Informational", bg: C.subtle, ink: C.muted, def: "" };
  const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
  const notAssessed = typeof j.summary === "string" && /not (?:assessed|evaluated)|no documents were provided/i.test(j.summary) && f.track_key === "documentation_review";
  if (notAssessed || (f.track_key === "documentation_review" && !j.documentation_finding && typeof j.summary === "string" && /excluded from scoring/.test(j.summary))) {
    return { label: "Not assessed", bg: C.subtle, ink: C.muted, def: CHIP_DEFS.not_assessed };
  }
  return f.finding_certainty === "verified"
    ? { label: "Verified", bg: C.clearBg, ink: C.clearInk, def: CHIP_DEFS.verified }
    : { label: "Assessed", bg: C.condBg, ink: C.condInk, def: CHIP_DEFS.assessed };
}

// ── Fonts ──
const F = (f: string) => path.join(process.cwd(), "scripts/pdf/fonts", f);
Font.register({ family: "Fraunces", fonts: [{ src: F("fraunces-600.ttf"), fontWeight: 600 }] });
Font.register({ family: "SourceSerif", fonts: [
  { src: F("source-serif-400.ttf"), fontWeight: 400 },
  { src: F("source-serif-600.ttf"), fontWeight: 600 },
  { src: F("source-serif-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
] });
Font.register({ family: "Instrument", fonts: [
  { src: F("instrument-400.ttf"), fontWeight: 400 },
  { src: F("instrument-600.ttf"), fontWeight: 600 },
  { src: F("instrument-700.ttf"), fontWeight: 700 },
] });
Font.register({ family: "Mono", fonts: [
  { src: F("jetbrains-400.ttf"), fontWeight: 400 },
  { src: F("jetbrains-600.ttf"), fontWeight: 600 },
] });
Font.registerHyphenationCallback((w) => [w]);

// ── Wordmark from the real traced asset (public/brand) — never redrawn ──
const wmSvg = fs.readFileSync(path.join(process.cwd(), "public/brand/wordmark.svg"), "utf8");
const wmPaths = [...wmSvg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]); // [Hyprr, IQ]
const wmVb = /viewBox="([^"]+)"/.exec(wmSvg)![1];
const [, , wmW, wmH] = wmVb.split(" ").map(Number);
function Wordmark({ h, reversed = false }: { h: number; reversed?: boolean }) {
  return (
    <Svg width={(h * wmW) / wmH} height={h} viewBox={wmVb}>
      <Path d={wmPaths[0]} fill={reversed ? "#FFFFFF" : C.brand} />
      <Path d={wmPaths[1]} fill={C.copper} />
    </Svg>
  );
}

// ── Content model — built ONCE from the live projection; identical across all three designs ──
interface Content {
  caseNumber: string; vendor: string; brands: string; clientName: string;
  createdAt: string; deliveredAt: string; verdict: string;
  report: ClientReport; findings: Finding[];
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

interface CaseRow {
  id: string; case_number: string; vendor_name: string | null; brands_submitted: string[] | null;
  status: string; verdict: string | null; delivered_at: string | null; delivered_attempt: number | null;
  created_at: string; additional_questions: { question?: string }[] | null;
  clients: { full_name: string | null; company_name: string | null } | null;
}
interface Dump { row: CaseRow; rows: TrackResultRow[]; snap: { decision_snapshot: unknown; vendor_questions: unknown } | null }

const dumpPath = (caseNumber: string) => path.join(os.tmpdir(), `hyprriq-pdf-dump-${caseNumber}.json`);

// PHASE 1 (child process, --conditions=react-server): raw reads only — no projection, no react-pdf.
async function dumpCase(caseNumber: string): Promise<void> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { getCaseTrackResults } = await import("@/lib/data/track-results");
  const { getClientDecisionSnapshot } = await import("@/lib/data/synthesis");
  const { data: c } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, delivered_at, delivered_attempt, created_at, additional_questions, clients(full_name, company_name)")
    .eq("case_number", caseNumber)
    .is("deleted_at", null)
    .maybeSingle();
  if (!c) throw new Error(`case ${caseNumber} not found`);
  const row = c as unknown as CaseRow;
  if (!(row.status === "delivered" || row.status === "complete")) throw new Error(`case ${caseNumber} is not delivered — a PDF exists only for delivered reports`);
  const rows = await getCaseTrackResults(row.id, row.delivered_attempt ?? undefined);
  const snap = await getClientDecisionSnapshot(row.id);
  fs.writeFileSync(dumpPath(caseNumber), JSON.stringify({ row, rows, snap } satisfies Dump));
  console.log(`dumped ${rows.length} track rows (attempt ${row.delivered_attempt ?? "latest"})`);
}

// PHASE 2 (parent): the SAME pure projection chain the portal uses, over the dumped rows.
function buildContent(d: Dump): Content {
  const { row } = d;
  const findings = buildClientFindings(d.rows);
  const report = projectClientReport(
    (d.snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
    d.snap?.vendor_questions,
    row.additional_questions ?? [],
  );
  if (!report) throw new Error("no decision snapshot for the delivered attempt");
  const client = row.clients;
  return {
    caseNumber: row.case_number, vendor: row.vendor_name ?? "—",
    brands: (row.brands_submitted ?? []).join(" · ") || "—",
    clientName: client?.company_name ? `${client?.full_name ?? "—"} (${client.company_name})` : (client?.full_name ?? "—"),
    createdAt: fmt(row.created_at), deliveredAt: fmt(row.delivered_at),
    verdict: row.verdict ?? "verify_before_purchase", report, findings,
  };
}

// ── Shared building blocks (structure identical; each design passes its own type scale) ──
interface Scale { prose: number; proseLead: number; label: number; areaHead: number }

function FindingBodyPdf({ text, s }: { text: string; s: Scale }) {
  const blocks = parseFindingStructure(text);
  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <Text key={i} style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: s.label, color: C.ink, marginTop: i === 0 ? 0 : 7, marginBottom: 3, paddingBottom: 2, borderBottomWidth: 0.75, borderBottomColor: C.line }}>
              {b.text}
            </Text>
          );
        }
        if (b.type === "list") {
          return (
            <View key={i} style={{ marginBottom: 4 }}>
              {b.items.map((item, j) => (
                <View key={j} style={{ flexDirection: "row", marginBottom: 2.5 }}>
                  <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose, color: C.muted, width: 10 }}>•</Text>
                  <Text style={{ flex: 1, fontFamily: "SourceSerif", fontSize: s.prose, lineHeight: s.proseLead, color: C.ink2 }}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={{ fontFamily: "SourceSerif", fontSize: s.prose, lineHeight: s.proseLead, color: C.ink2, marginBottom: 4 }}>
            {b.text}
          </Text>
        );
      })}
    </View>
  );
}

function Chip({ label, bg, ink, size = 7.5 }: { label: string; bg: string; ink: string; size?: number }) {
  return (
    <Text style={{ fontFamily: "Instrument", fontWeight: 600, fontSize: size, color: ink, backgroundColor: bg, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 }}>
      {label}
    </Text>
  );
}

function VerdictScale({ verdict, height = 6 }: { verdict: string; height?: number }) {
  const meta = VERDICT_META[verdict];
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {Object.values(VERDICT_META).map((v) => (
          <View key={v.name} style={{ flex: 1, height, borderRadius: 2, backgroundColor: v.bg, opacity: v.level === meta.level ? 1 : 0.45, borderWidth: v.level === meta.level ? 1 : 0, borderColor: C.ink }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2.5 }}>
        <Text style={{ fontFamily: "Instrument", fontSize: 6.5, color: C.muted }}>Source Clear</Text>
        <Text style={{ fontFamily: "Instrument", fontSize: 6.5, color: C.muted }}>Do Not Rely</Text>
      </View>
    </View>
  );
}

function Footer({ c }: { c: Content }) {
  return (
    <Text
      fixed
      style={{ position: "absolute", bottom: 22, left: 48, right: 48, fontFamily: "Mono", fontSize: 7, color: C.muted, textAlign: "center" }}
      render={({ pageNumber, totalPages }) => runningFooter(c.caseNumber, pageNumber, totalPages, c.deliveredAt)}
    />
  );
}

// The locked flow: headline → five areas → verdict handled per-design → risk → progress →
// findings → chip definitions → limits → checklist → notes → closing. Each design renders THIS
// sequence; only geometry, page breaks, and hierarchy differ.
function SectionLabel({ children, s, style = {} }: { children: React.ReactNode; s: Scale; style?: object }) {
  return (
    <Text style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: s.label, letterSpacing: 0.8, color: C.muted, textTransform: "uppercase", marginBottom: 5, ...style }}>
      {children}
    </Text>
  );
}

function CoreFlow({ c, s, areaAsMargin = false }: { c: Content; s: Scale; areaAsMargin?: boolean }) {
  const r = c.report;
  return (
    <View>
      {/* THE SINGLE MOST IMPORTANT RISK */}
      <View wrap={false} style={{ marginTop: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 12 }}>
        <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: s.areaHead + 1, color: C.ink, marginBottom: 5 }}>The single most important risk</Text>
        <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose + 0.5, lineHeight: s.proseLead, color: C.ink2 }}>{r.the_real_risk}</Text>
      </View>

      {/* CASE PROGRESS (the portal's print-visible timeline row) */}
      <Text style={{ marginTop: 10, fontFamily: "Mono", fontSize: 7.5, color: C.muted }}>
        Submitted {c.createdAt}   ·   Researching ✓   ·   In review ✓   ·   Delivered {c.deliveredAt}
      </Text>

      {/* FINDINGS — the five assessment areas */}
      <View style={{ marginTop: 16 }} break={false}>
        <SectionLabel s={s}>The five assessment areas</SectionLabel>
        {c.findings.map((f) => {
          const { detail } = findingText(f);
          const notes = findingNotes(f);
          const chip = areaChip(f);
          return (
            <View key={f.id} wrap={detail.length > 900} style={{ flexDirection: areaAsMargin ? "row" : "column", borderTopWidth: 0.75, borderTopColor: C.line, paddingVertical: 9, gap: areaAsMargin ? 12 : 0 }}>
              <View style={areaAsMargin ? { width: 118 } : { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: s.areaHead, color: C.ink, marginBottom: areaAsMargin ? 4 : 0 }}>
                  {AREA_NAMES[f.track_key] ?? f.track_key}
                </Text>
                <View style={{ alignSelf: "flex-start" }}><Chip label={chip.label} bg={chip.bg} ink={chip.ink} /></View>
              </View>
              <View style={areaAsMargin ? { flex: 1 } : {}}>
                {detail ? <FindingBodyPdf text={detail} s={s} /> : null}
                {notes.map((n) => (
                  <View key={n.label} style={{ marginTop: 3 }}>
                    <Text style={{ fontFamily: "Instrument", fontWeight: 600, fontSize: s.label - 0.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{n.label}</Text>
                    <Text style={{ fontFamily: "Instrument", fontSize: s.label + 0.5, color: C.muted }}>{n.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <Text style={{ marginTop: 6, fontFamily: "Instrument", fontSize: 7.5, lineHeight: 1.5, color: C.muted }}>
          Verified — {CHIP_DEFS.verified}  Assessed — {CHIP_DEFS.assessed}  Not assessed — {CHIP_DEFS.not_assessed}
        </Text>
      </View>

      {/* WHAT WE CONFIRMED — AND WHAT WE COULD NOT */}
      {(r.leading_interpretation || r.what_to_monitor.length > 0) && (
        <View style={{ marginTop: 16 }}>
          <SectionLabel s={s}>What we confirmed — and what we could not</SectionLabel>
          <Text style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: s.areaHead, color: C.ink, marginBottom: 4 }}>The reading, and its limits</Text>
          {r.leading_interpretation ? (
            <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose + 0.5, lineHeight: s.proseLead, color: C.ink2 }}>{r.leading_interpretation}</Text>
          ) : null}
          {r.what_to_monitor.length > 0 && (
            <View style={{ marginTop: 8, borderTopWidth: 0.75, borderTopColor: C.lineStrong, borderStyle: "dashed", paddingTop: 6 }}>
              <Text style={{ fontFamily: "Instrument", fontWeight: 600, fontSize: s.label, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>What to monitor</Text>
              {r.what_to_monitor.map((m, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose, color: C.muted, width: 10 }}>•</Text>
                  <Text style={{ flex: 1, fontFamily: "SourceSerif", fontSize: s.prose, lineHeight: s.proseLead, color: C.ink2 }}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* CHECKLIST */}
      {r.questions.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <SectionLabel s={s}>Verify before you commit</SectionLabel>
          <Text style={{ fontFamily: "Instrument", fontSize: s.label + 1, color: C.ink2, marginBottom: 6 }}>{CHECKLIST_INTRO}</Text>
          {r.questions.map((q, i) => (
            <View key={i} wrap={false} style={{ flexDirection: "row", borderTopWidth: 0.75, borderTopColor: C.line, paddingVertical: 6, gap: 9 }}>
              <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: 7.5, color: C.brandHover }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose, lineHeight: s.proseLead - 0.15, color: C.ink }}>{q.question}</Text>
                {q.source === "additional" && (
                  <Text style={{ fontFamily: "Instrument", fontWeight: 600, fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1.5 }}>{FROM_REVIEW_TEAM}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* NOTES */}
      <View style={{ marginTop: 16 }} wrap={false}>
        <SectionLabel s={s}>Notes</SectionLabel>
        <Text style={{ fontFamily: "Instrument", fontWeight: 700, fontSize: s.label, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Category requirements</Text>
        <Text style={{ fontFamily: "SourceSerif", fontSize: s.prose, lineHeight: s.proseLead, color: C.ink2 }}>{CATEGORY_NOTE}</Text>
      </View>

      {/* CLOSING */}
      <View style={{ marginTop: 18, borderTopWidth: 0.75, borderTopColor: C.lineStrong, paddingTop: 8 }} wrap={false}>
        <Text style={{ fontFamily: "Instrument", fontSize: 8, lineHeight: 1.55, color: C.muted }}>{CLOSING}</Text>
        <Text style={{ marginTop: 5, fontFamily: "Mono", fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {c.caseNumber} · {c.vendor} · delivered {c.deliveredAt}
        </Text>
        <Text style={{ marginTop: 5, fontFamily: "Instrument", fontSize: 7.5, color: C.muted }}>
          {confidentiality(c.clientName)}  {ISSUER}
        </Text>
      </View>
    </View>
  );
}

function AreasGlance({ c, s }: { c: Content; s: Scale }) {
  return (
    <View>
      {c.findings.map((f) => {
        const chip = areaChip(f);
        return (
          <View key={f.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3.5 }}>
            <Text style={{ fontFamily: "Instrument", fontSize: s.label + 1.5, color: C.ink2 }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
            <Chip label={chip.label} bg={chip.bg} ink={chip.ink} size={7} />
          </View>
        );
      })}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// SAMPLE A — "THE DOSSIER". A full title page carrying identity only — the verdict is the
// first thing inside, given the whole top of page 2. Classic advisory-firm document: calm,
// spacious, single reading column.
// ════════════════════════════════════════════════════════════════════════════════════════════
const sA: Scale = { prose: 10, proseLead: 1.6, label: 8, areaHead: 11.5 };

function SampleA({ c }: { c: Content }) {
  const meta = VERDICT_META[c.verdict];
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber}`} author="Hyprr Retail LLC">
      {/* COVER */}
      <Page size="LETTER" style={{ backgroundColor: C.surface, padding: 64, fontFamily: "Instrument" }}>
        <Wordmark h={20} />
        <View style={{ marginTop: 150 }}>
          <Text style={{ fontFamily: "Mono", fontSize: 9, color: C.copper, letterSpacing: 1 }}>{c.caseNumber}</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 30, color: C.ink, marginTop: 8 }}>{DOC_TITLE}</Text>
          <View style={{ width: 42, height: 2, backgroundColor: C.copper, marginTop: 14, marginBottom: 22 }} />
          {[["Supplier assessed", c.vendor], ["Brands in scope", c.brands], ["Prepared for", c.clientName], ["Delivered", c.deliveredAt]].map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.75, borderBottomColor: C.line, width: 350 }}>
              <Text style={{ width: 110, fontSize: 8, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, paddingTop: 1.5 }}>{k}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.ink }}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ position: "absolute", bottom: 56, left: 64, right: 64 }}>
          <Text style={{ fontSize: 8, color: C.muted }}>{confidentiality(c.clientName)}</Text>
          <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>{ISSUER}</Text>
        </View>
      </Page>

      {/* BODY */}
      <Page size="LETTER" style={{ backgroundColor: C.surface, paddingTop: 48, paddingBottom: 52, paddingHorizontal: 64, fontFamily: "Instrument" }}>
        <Footer c={c} />
        {/* Verdict — the whole top of the first inside page */}
        <View wrap={false} style={{ backgroundColor: meta.bg, borderRadius: 8, padding: 18 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: meta.ink, textTransform: "uppercase", letterSpacing: 1 }}>Verdict</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 24, color: meta.ink, marginTop: 5 }}>{meta.name}</Text>
          <Text style={{ fontSize: 8.5, color: C.ink2, marginTop: 3, marginBottom: 10 }}>Level {meta.level} of 4</Text>
          <VerdictScale verdict={c.verdict} />
          <Text style={{ fontFamily: "SourceSerif", fontSize: 10, lineHeight: 1.55, color: C.ink2, marginTop: 10 }}>{meta.means}</Text>
        </View>

        {/* Summary */}
        <View style={{ marginTop: 16 }}>
          <SectionLabel s={sA}>Summary</SectionLabel>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 13.5, lineHeight: 1.45, color: C.ink }}>{c.report.headline}</Text>
        </View>

        {/* Five areas at a glance */}
        <View style={{ marginTop: 14, backgroundColor: C.base, borderRadius: 6, padding: 12 }} wrap={false}>
          <SectionLabel s={sA}>The five assessment areas</SectionLabel>
          <AreasGlance c={c} s={sA} />
        </View>

        <CoreFlow c={c} s={sA} />
      </Page>
    </Document>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// SAMPLE B — "THE LETTERHEAD MEMO". No title page: a working letterhead, then straight to the
// decision on page one — the closest analogue of the portal's decision-first rule. Densest of
// the three; reads like a sharp advisory letter.
// ════════════════════════════════════════════════════════════════════════════════════════════
const sB: Scale = { prose: 9.5, proseLead: 1.55, label: 7.5, areaHead: 10.5 };

function SampleB({ c }: { c: Content }) {
  const meta = VERDICT_META[c.verdict];
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber}`} author="Hyprr Retail LLC">
      <Page size="LETTER" style={{ backgroundColor: C.surface, paddingTop: 44, paddingBottom: 52, paddingHorizontal: 56, fontFamily: "Instrument" }}>
        <Footer c={c} />
        {/* Letterhead */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: C.brand, paddingBottom: 10 }}>
          <Wordmark h={16} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: 0.8 }}>{DOC_TITLE}</Text>
            <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 1.5 }}>{ISSUER}</Text>
            <Text style={{ fontFamily: "Mono", fontSize: 7.5, color: C.muted, marginTop: 1.5 }}>{c.caseNumber} · delivered {c.deliveredAt}</Text>
          </View>
        </View>

        {/* Identity line + confidentiality up front, like a letter's addressee block */}
        <View style={{ marginTop: 12, flexDirection: "row", gap: 26 }}>
          {[["Supplier", c.vendor], ["Brands in scope", c.brands], ["Prepared for", c.clientName]].map(([k, v]) => (
            <View key={k}>
              <Text style={{ fontSize: 7, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>{k}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: 600, color: C.ink, marginTop: 1.5 }}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 6, fontSize: 7.5, color: C.muted }}>{confidentiality(c.clientName)}</Text>

        {/* Decision-first: verdict + summary side by side */}
        <View style={{ marginTop: 14, flexDirection: "row", gap: 14 }} wrap={false}>
          <View style={{ flex: 1.15, backgroundColor: meta.bg, borderRadius: 6, padding: 13 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: meta.ink, textTransform: "uppercase", letterSpacing: 0.9 }}>Verdict · level {meta.level} of 4</Text>
            <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 17, color: meta.ink, marginTop: 4, marginBottom: 8 }}>{meta.name}</Text>
            <VerdictScale verdict={c.verdict} height={5} />
            <Text style={{ fontFamily: "SourceSerif", fontSize: 8.5, lineHeight: 1.5, color: C.ink2, marginTop: 8 }}>{meta.means}</Text>
          </View>
          <View style={{ flex: 1.6 }}>
            <SectionLabel s={sB}>Summary</SectionLabel>
            <Text style={{ fontFamily: "SourceSerif", fontWeight: 600, fontSize: 11, lineHeight: 1.5, color: C.ink }}>{c.report.headline}</Text>
            <View style={{ marginTop: 8, borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 6 }}>
              <AreasGlance c={c} s={sB} />
            </View>
          </View>
        </View>

        <CoreFlow c={c} s={sB} />
      </Page>
    </Document>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// SAMPLE C — "THE NAVY PLATE". The document opens on a full-bleed navy plate that carries both
// identity AND the verdict — the reader holds the decision before turning a page. Inside,
// findings run against a left margin column of area names. The most designed of the three.
// ════════════════════════════════════════════════════════════════════════════════════════════
const sC: Scale = { prose: 10, proseLead: 1.6, label: 8, areaHead: 11 };

function SampleC({ c }: { c: Content }) {
  const meta = VERDICT_META[c.verdict];
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber}`} author="Hyprr Retail LLC">
      {/* COVER — navy plate over light base */}
      <Page size="LETTER" style={{ backgroundColor: C.surface, padding: 0, fontFamily: "Instrument" }}>
        <View style={{ backgroundColor: C.brand, paddingTop: 56, paddingBottom: 40, paddingHorizontal: 60 }}>
          <Wordmark h={18} reversed />
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 26, color: "#FFFFFF", marginTop: 44 }}>{DOC_TITLE}</Text>
          <Text style={{ fontFamily: "Mono", fontSize: 9, color: "#FFFFFF", opacity: 0.75, marginTop: 6, letterSpacing: 1 }}>{c.caseNumber}</Text>
          <View style={{ flexDirection: "row", gap: 30, marginTop: 26 }}>
            {[["Supplier", c.vendor], ["Brands", c.brands], ["Prepared for", c.clientName], ["Delivered", c.deliveredAt]].map(([k, v]) => (
              <View key={k} style={{ maxWidth: 130 }}>
                <Text style={{ fontSize: 6.5, fontWeight: 600, color: "#FFFFFF", opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</Text>
                <Text style={{ fontSize: 9.5, fontWeight: 600, color: "#FFFFFF", marginTop: 2 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* The verdict sits directly under the plate — the decision on the cover */}
        <View style={{ paddingHorizontal: 60, marginTop: -0.5 }}>
          <View style={{ backgroundColor: meta.bg, borderRadius: 0, padding: 20, marginTop: 28 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: meta.ink, textTransform: "uppercase", letterSpacing: 1 }}>Verdict · level {meta.level} of 4</Text>
            <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 27, color: meta.ink, marginTop: 6, marginBottom: 12 }}>{meta.name}</Text>
            <VerdictScale verdict={c.verdict} height={7} />
            <Text style={{ fontFamily: "SourceSerif", fontSize: 10.5, lineHeight: 1.6, color: C.ink2, marginTop: 12 }}>{meta.means}</Text>
          </View>
          <View style={{ marginTop: 22 }}>
            <SectionLabel s={sC}>Summary</SectionLabel>
            <Text style={{ fontFamily: "SourceSerif", fontWeight: 600, fontSize: 12.5, lineHeight: 1.55, color: C.ink }}>{c.report.headline}</Text>
          </View>
        </View>
        <View style={{ position: "absolute", bottom: 30, left: 60, right: 60 }}>
          <Text style={{ fontSize: 7.5, color: C.muted }}>{confidentiality(c.clientName)}  ·  {ISSUER}</Text>
        </View>
      </Page>

      {/* BODY — margin-column architecture */}
      <Page size="LETTER" style={{ backgroundColor: C.surface, paddingTop: 46, paddingBottom: 52, paddingHorizontal: 60, fontFamily: "Instrument" }}>
        <Footer c={c} />
        <View style={{ backgroundColor: C.base, borderRadius: 6, padding: 12 }} wrap={false}>
          <SectionLabel s={sC}>The five assessment areas</SectionLabel>
          <AreasGlance c={c} s={sC} />
        </View>
        <CoreFlow c={c} s={sC} areaAsMargin />
      </Page>
    </Document>
  );
}

// ── main ──
async function main() {
  const caseNumber = process.argv[2] ?? "AWI-2607-022";
  if (process.env.PDF_DUMP_MODE === "1") return dumpCase(caseNumber);

  // Self-spawn the conditioned dump, then render here with normal React.
  const r = spawnSync(
    "npx",
    ["tsx", "--conditions=react-server", "--tsconfig", "tsconfig.json", "--env-file=.env.local", "scripts/pdf/generate-samples.tsx", caseNumber],
    { shell: true, stdio: "inherit", env: { ...process.env, PDF_DUMP_MODE: "1" } },
  );
  if (r.status !== 0) throw new Error("dump phase failed");
  const c = buildContent(JSON.parse(fs.readFileSync(dumpPath(caseNumber), "utf8")) as Dump);
  const outDir = path.join(process.cwd(), "docs/pdf-samples");
  fs.mkdirSync(outDir, { recursive: true });
  const jobs: [string, (props: { c: Content }) => React.ReactElement<DocumentProps>][] = [
    [`${caseNumber}-sample-a.pdf`, SampleA],
    [`${caseNumber}-sample-b.pdf`, SampleB],
    [`${caseNumber}-sample-c.pdf`, SampleC],
  ];
  for (const [file, Sample] of jobs) {
    await renderToFile(<Sample c={c} />, path.join(outDir, file));
    console.log("wrote", file);
  }
  console.log(`content: ${c.findings.length} areas · ${c.report.questions.length} checklist questions · verdict ${c.verdict}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
