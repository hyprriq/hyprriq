/**
 * PRINT DESIGN SYSTEM — cover + spread sample (UI/UX thread, 2026-08-15).
 * Implements docs/PRINT_DESIGN_SPEC.md: print palette, three-register type scale, wide-margin
 * geometry, cover-without-verdict, verdict-as-hero page, findings page with marginalia.
 * NOT the full report — the founder approves the look first, then the document is built once.
 *
 * Run (founder): npx tsx scripts/pdf/print-sample.tsx [case_number]
 * Output: docs/pdf-samples/print-spec-sample.pdf (colour) + print-spec-sample-grey.pdf
 * (true-luma greyscale — the mono-office-printer rendering, generated not simulated).
 *
 * Content: real AWI-2607-022 through the SAME projection chain as the portal (see
 * generate-samples.tsx — identical dump/self-spawn architecture). Words are locked; this pass
 * is the look.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import React from "react";
import { Document, Page, Text, View, Svg, Path, Font, renderToFile, type DocumentProps } from "@react-pdf/renderer";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { projectClientReport, type ClientReport } from "@/lib/portal/clientReport";
import { findingText } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import type { Finding } from "@/lib/data/cases";
import type { TrackResultRow } from "@/lib/data/track-results";
import { DOC_TITLE, ISSUER, confidentialityLine, runningFooter } from "@/lib/content/documentIdentity";

// ── PRINT PALETTE (PRINT_DESIGN_SPEC §1) — derived for ink, not carried from screen ──
const COLOUR = {
  paper: "#FFFFFF",
  ink: "#14181D",       // body — dense near-black (≈91% grey)
  soft: "#43494F",      // labels/meta only (≈72%)
  navy: "#122E4A",      // brand structure (≈84%)
  copper: "#9A551F",    // wordmark IQ only
  hairline: "#C9CDD2",  // rules (≈20%)
  verdict: { source_clear: "#1D5638", usable_with_conditions: "#755110", verify_before_purchase: "#8A470B", do_not_rely: "#7C2622" } as Record<string, string>,
};

// True-luma greyscale (Rec.601) — the mono-printer rendering, generated from the same components.
const toGrey = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const h = y.toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
};
const GREY: typeof COLOUR = {
  paper: "#FFFFFF", ink: toGrey(COLOUR.ink), soft: toGrey(COLOUR.soft), navy: toGrey(COLOUR.navy),
  copper: toGrey(COLOUR.copper), hairline: toGrey(COLOUR.hairline),
  verdict: Object.fromEntries(Object.entries(COLOUR.verdict).map(([k, v]) => [k, toGrey(v)])),
};
type Palette = typeof COLOUR;

// Locked display copy — verbatim (components/portal/report-view.tsx).
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
const SCALE_ORDER = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"] as const;

// ── Fonts (ligature-stripped faces — spec §7) ──
const F = (f: string) => path.join(process.cwd(), "scripts/pdf/fonts", f);
Font.register({ family: "Fraunces", fonts: [{ src: F("fraunces-600.ttf"), fontWeight: 600 }] });
Font.register({ family: "Serif", fonts: [
  { src: F("source-serif-400.ttf"), fontWeight: 400 },
  { src: F("source-serif-600.ttf"), fontWeight: 600 },
  { src: F("source-serif-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
] });
Font.register({ family: "Mono", fonts: [{ src: F("jetbrains-400.ttf"), fontWeight: 400 }] });
Font.registerHyphenationCallback((w) => [w]);

// Wordmark — the traced asset, never redrawn. Mono rendering uses single-ink per brand rule.
const wmSvg = fs.readFileSync(path.join(process.cwd(), "public/brand/wordmark.svg"), "utf8");
const wmPaths = [...wmSvg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const wmVb = /viewBox="([^"]+)"/.exec(wmSvg)![1];
const [, , wmW, wmH] = wmVb.split(" ").map(Number);
function Wordmark({ h, P, mono }: { h: number; P: Palette; mono: boolean }) {
  return (
    <Svg width={(h * wmW) / wmH} height={h} viewBox={wmVb}>
      <Path d={wmPaths[0]} fill={mono ? P.ink : P.navy} />
      <Path d={wmPaths[1]} fill={mono ? P.ink : P.copper} />
    </Svg>
  );
}

// ── Content (same dump/projection architecture as generate-samples.tsx) ──
interface CaseRow {
  id: string; case_number: string; vendor_name: string | null; brands_submitted: string[] | null;
  status: string; verdict: string | null; delivered_at: string | null; delivered_attempt: number | null;
  created_at: string; additional_questions: { question?: string }[] | null;
  clients: { full_name: string | null; company_name: string | null } | null;
}
interface Dump { row: CaseRow; rows: TrackResultRow[]; snap: { decision_snapshot: unknown; vendor_questions: unknown } | null }
interface Content { caseNumber: string; vendor: string; brands: string; clientName: string; deliveredAt: string; verdict: string; report: ClientReport; findings: Finding[] }

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
  if (!report) throw new Error("no decision snapshot");
  const cl = d.row.clients;
  return {
    caseNumber: d.row.case_number, vendor: d.row.vendor_name ?? "—",
    brands: (d.row.brands_submitted ?? []).join(" · ") || "—",
    clientName: cl?.company_name ? `${cl?.full_name ?? "—"} (${cl.company_name})` : (cl?.full_name ?? "—"),
    deliveredAt: fmt(d.row.delivered_at), verdict: d.row.verdict ?? "verify_before_purchase",
    report, findings,
  };
}

// ── Geometry (spec §3): Letter 612×792 · text block 350pt · L 90 · R 172 · T 76 · B 84 ──
const PAGE = { paddingTop: 76, paddingBottom: 84, paddingLeft: 90, paddingRight: 172 };

function RunningFooter({ c, P }: { c: Content; P: Palette }) {
  return (
    <Text fixed style={{ position: "absolute", bottom: 40, left: 90, width: 350, fontFamily: "Mono", fontSize: 7.5, color: P.soft }}
      render={({ pageNumber, totalPages }) => runningFooter(c.caseNumber, pageNumber, totalPages, c.deliveredAt)} />
  );
}

// Body text via the same structure parser the portal renders through.
function Prose({ text, P }: { text: string; P: Palette }) {
  const blocks = parseFindingStructure(text);
  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <Text key={i} minPresenceAhead={40} style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.ink, marginTop: i === 0 ? 0 : 9, marginBottom: 3.5 }}>
              {b.text}
            </Text>
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
          <Text key={i} orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.48, color: P.ink, marginBottom: 6 }}>
            {b.text}
          </Text>
        );
      })}
    </View>
  );
}

function SampleDoc({ c, P, mono }: { c: Content; P: Palette; mono: boolean }) {
  const meta = VERDICT_META[c.verdict];
  const verdictInk = P.verdict[c.verdict];
  // Spread findings page: the first assessment area, complete on one page — the sample shows
  // the reading rhythm; the full document runs all five under the §6 break rules.
  const spreadFindings = c.findings.slice(0, 1);
  return (
    <Document title={`${DOC_TITLE} — ${c.caseNumber} (print spec sample${mono ? ", greyscale" : ""})`} author="Hyprr Retail LLC">
      {/* ═══ COVER — authority; no verdict (spec §4) ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, paddingTop: 70, paddingBottom: 64, paddingLeft: 90, paddingRight: 90, fontFamily: "Serif" }}>
        <Wordmark h={20} P={P} mono={mono} />
        <View style={{ marginTop: 214 }}>
          <View style={{ width: 40, height: 3, backgroundColor: P.navy, marginBottom: 18 }} />
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 32, lineHeight: 1.12, color: P.ink, maxWidth: 400 }}>{DOC_TITLE}</Text>
          <Text style={{ fontFamily: "Mono", fontSize: 9, color: P.soft, marginTop: 10 }}>{c.caseNumber}</Text>
        </View>
        {/* Identity stack — value-first, never a form grid */}
        <View style={{ marginTop: 44, maxWidth: 400 }}>
          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 2 }}>Supplier assessed</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 16, color: P.ink }}>{c.vendor}</Text>
          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginTop: 12, marginBottom: 2 }}>Brands in scope</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 13, color: P.ink }}>{c.brands}</Text>
          <View style={{ flexDirection: "row", gap: 48, marginTop: 12 }}>
            <View>
              <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 2 }}>Prepared for</Text>
              <Text style={{ fontFamily: "Serif", fontSize: 11, color: P.ink }}>{c.clientName}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 2 }}>Delivered</Text>
              <Text style={{ fontFamily: "Serif", fontSize: 11, color: P.ink }}>{c.deliveredAt}</Text>
            </View>
          </View>
        </View>
        <View style={{ position: "absolute", bottom: 44, left: 90, right: 90 }}>
          <Text style={{ fontFamily: "Serif", fontSize: 8.5, lineHeight: 1.5, color: P.soft }}>{confidentialityLine(c.clientName)}</Text>
          <Text style={{ fontFamily: "Serif", fontSize: 8.5, color: P.soft, marginTop: 2 }}>{ISSUER}</Text>
        </View>
      </Page>

      {/* ═══ VERDICT PAGE — the hero (spec §5) ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <View>
          {/* The document's ONE letterspaced-caps moment */}
          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 10, letterSpacing: 3.2, color: P.soft, textTransform: "uppercase" }}>Verdict</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: verdictInk, marginTop: 6 }}>{meta.name}</Text>
          <Text style={{ fontFamily: "Mono", fontSize: 9, color: P.soft, marginTop: 4 }}>Level {meta.level} of 4</Text>

          {/* Four-slot scale — position + solid/outline carry the level; greyscale-proof */}
          <View style={{ flexDirection: "row", gap: 4, marginTop: 13 }}>
            {SCALE_ORDER.map((k) => {
              const active = k === c.verdict;
              return (
                <View key={k} style={{ flex: 1 }}>
                  <View style={{ height: 11, backgroundColor: active ? P.ink : P.paper, borderWidth: 0.75, borderColor: active ? P.ink : P.hairline }} />
                  <Text style={{ fontFamily: "Serif", fontWeight: active ? 600 : 400, fontSize: 7.5, color: active ? P.ink : P.soft, marginTop: 3.5 }}>
                    {VERDICT_META[k].name}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={{ fontFamily: "Serif", fontSize: 11.5, lineHeight: 1.5, color: P.ink, marginTop: 14 }}>{meta.means}</Text>

          <View style={{ height: 0.75, backgroundColor: P.hairline, marginTop: 17, marginBottom: 15 }} />

          <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 9, color: P.soft, marginBottom: 5 }}>Summary</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 14.5, lineHeight: 1.35, color: P.ink }}>{c.report.headline}</Text>

          <View style={{ marginTop: 15 }} minPresenceAhead={60}>
            <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 12.5, color: P.ink, marginBottom: 5 }}>The single most important risk</Text>
            <Text orphans={2} widows={2} style={{ fontFamily: "Serif", fontSize: 10.5, lineHeight: 1.48, color: P.ink }}>{c.report.the_real_risk}</Text>
          </View>
        </View>
      </Page>

      {/* ═══ FINDINGS PAGE — the reading spread (spec §2/§3) ═══ */}
      <Page size="LETTER" style={{ backgroundColor: P.paper, ...PAGE, fontFamily: "Serif" }}>
        <RunningFooter c={c} P={P} />
        <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 15, color: P.ink, marginBottom: 16 }}>The five assessment areas</Text>
        {spreadFindings.map((f) => {
          const { detail } = findingText(f);
          const certainty = f.finding_certainty === "verified" ? "Verified" : "Assessed";
          return (
            <View key={f.id} style={{ marginBottom: 18 }}>
              <View minPresenceAhead={70} style={{ borderTopWidth: 0.75, borderTopColor: P.hairline, paddingTop: 10, marginBottom: 6 }}>
                <Text style={{ fontFamily: "Serif", fontWeight: 600, fontSize: 12.5, color: P.ink }}>{AREA_NAMES[f.track_key] ?? f.track_key}</Text>
                {/* Marginalia: the certainty label lives in the wide right margin — plain text, no pill */}
                <Text style={{ position: "absolute", left: 366, top: 10, width: 150, fontFamily: "Serif", fontWeight: 600, fontSize: 8.5, color: P.soft }}>
                  {certainty}
                </Text>
              </View>
              {detail ? <Prose text={detail} P={P} /> : null}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

async function main() {
  const caseNumber = process.argv[2] ?? "AWI-2607-022";
  if (process.env.PDF_DUMP_MODE === "1") return dumpCase(caseNumber);
  const r = spawnSync("npx", ["tsx", "--conditions=react-server", "--tsconfig", "tsconfig.json", "--env-file=.env.local", "scripts/pdf/print-sample.tsx", caseNumber],
    { shell: true, stdio: "inherit", env: { ...process.env, PDF_DUMP_MODE: "1" } });
  if (r.status !== 0) throw new Error("dump phase failed");
  const c = buildContent(JSON.parse(fs.readFileSync(dumpPath(caseNumber), "utf8")) as Dump);
  const outDir = path.join(process.cwd(), "docs/pdf-samples");
  fs.mkdirSync(outDir, { recursive: true });
  const jobs: [string, Palette, boolean][] = [
    ["print-spec-sample.pdf", COLOUR, false],
    ["print-spec-sample-grey.pdf", GREY, true],
  ];
  for (const [file, P, mono] of jobs) {
    const el = (<SampleDoc c={c} P={P} mono={mono} />) as React.ReactElement<DocumentProps>;
    await renderToFile(el, path.join(outDir, file));
    console.log("wrote", file);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
