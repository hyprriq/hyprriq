# G1 — Research Pipeline Backbone + Track 0 + Manual Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full research-pipeline spine — track registry, Track 0 intake, per-case orchestration that creates the 6 `case_track_results` rows, the founder-review gate, and the re-pointed review/Evidence integrations — with **zero automation and zero API keys** (Tracks 1–5 land in manual entry).

**Architecture:** A case submission runs deterministic Track 0 (sync) then an orchestrator that writes one `case_track_results` row per track for the plan: `track_0` auto-approved, the plan's finding tracks set `manual_required`/`pending`, skipped tracks `skipped`. The founder enters findings via the existing 5-dimension scorer, now writing to `case_track_results`; `isCaseReadyForReport()` server-gates "Approve & Deliver". Inngest activation is deferred to G2 (no async work exists in G1, so Hard Rule #4 is not engaged).

**Tech Stack:** Next.js 16 App Router, Supabase (service-role server client), Vitest, TypeScript. Governing spec: `docs/adr-008-research-pipeline.md` + `hyprriq_phase_de_g_brief v1.1`.

---

## Conventions (read once)
- Server DB writes use `supabaseAdmin` (service-role) in API routes / `createServerClient()` in RSC data fns. Both already exist.
- Admin API auth pattern: `const { userId } = await auth();` then inline `isAdmin(userId)` (query `clients.role !== 'client'`). Copy the existing one in `app/api/admin/cases/[id]/review/route.ts`.
- All verification gates: `npx tsc --noEmit` && `npx eslint app components lib` && `npm test` && `npm run build`. Commit + push to `staging` per task group.
- `track_key` is canonical. Registry: `track_0=intake, 1=supplier_identity, 2=supply_chain_relationship, 3=brand_risk_assessment, 4=documentation_review, 5=sourcing_logic`.

## File Structure
- Create `lib/constants/tracks.ts` — track registry + per-plan `TRACK_CONFIG` + helpers.
- Create `lib/research/track0.ts` — deterministic intake.
- Create `lib/research/orchestrator.ts` — `initializeCaseResearch()`.
- Create `lib/research/founder-review.ts` — `isCaseReadyForReport()`.
- Create `lib/research/confidence.ts` — score↔band helpers.
- Create `lib/utils/banned-language.ts` — `scanForBannedLanguage()`.
- Create `lib/data/track-results.ts` — read/write `case_track_results`.
- Create test files alongside (`*.test.ts`).
- Modify `lib/utils/normalize-name.ts` (+ its test) — bug fix.
- Modify `app/api/cases/submit/route.ts` — call orchestrator after case create.
- Modify `app/api/admin/cases/[id]/review/route.ts` — write `case_track_results`, enforce gate + banned-language.
- Modify `lib/data/cases.ts` — Evidence tab reads `case_track_results`.
- Modify `app/(admin)/admin/cases/[id]/review/page.tsx` + `components/admin/case-review.tsx` — pass plan's required tracks, gate approve on them.

---

### Task 1: Fix `normalizeName()` (pure, TDD)

**Files:**
- Test: `lib/utils/normalize-name.test.ts`
- Modify: `lib/utils/normalize-name.ts`

- [ ] **Step 1: Add failing tests**

```typescript
// append to lib/utils/normalize-name.test.ts
import { describe, it, expect } from "vitest";
import { normalizeName } from "./normalize-name";

describe("normalizeName edge cases (G1)", () => {
  it("returns cleaned token when input is a pure business suffix", () => {
    expect(normalizeName("LLC")).toBe("llc");
    expect(normalizeName("Corp")).toBe("corp");
  });
  it("strips suffix from real names", () => {
    expect(normalizeName("Acme LLC")).toBe("acme");
    expect(normalizeName("Ingram Micro Inc")).toBe("ingram micro");
  });
  it("guards empty/nullish input", () => {
    expect(normalizeName("")).toBe("");
    // @ts-expect-error runtime guard for null
    expect(normalizeName(null)).toBe("");
    // @ts-expect-error runtime guard for undefined
    expect(normalizeName(undefined)).toBe("");
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- normalize-name`
Expected: FAIL — `normalizeName('LLC')` returns `''`, and `null` throws.

- [ ] **Step 3: Implement the fix** (rewrite the function body, keep the file's header comment)

```typescript
const BUSINESS_SUFFIXES = new Set([
  "llc","inc","corp","ltd","co","company","corporation","incorporated","limited",
  "lp","llp","pllc","plc","group","holdings","enterprises","international",
]);

export function normalizeName(name: string): string {
  if (!name?.trim()) return "";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  const meaningful = tokens.filter((t) => !BUSINESS_SUFFIXES.has(t));
  // If every token is a suffix, keep the cleaned tokens rather than returning ''.
  return (meaningful.length === 0 ? tokens : meaningful).join(" ");
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- normalize-name`
Expected: PASS (old examples in the comment still hold: `Ingram Micro, Inc.`→`ingram micro`).

- [ ] **Step 5: Commit**

```bash
git add lib/utils/normalize-name.ts lib/utils/normalize-name.test.ts
git commit -m "G1: fix normalizeName pure-suffix + null edge cases"
```

---

### Task 2: Track registry + per-plan config (TDD)

**Files:**
- Create: `lib/constants/tracks.ts`
- Test: `lib/constants/tracks.test.ts`

- [ ] **Step 1: Write the registry**

```typescript
// lib/constants/tracks.ts
import type { PlanType } from "@/lib/constants/plans";

export type TrackKey =
  | "intake" | "supplier_identity" | "supply_chain_relationship"
  | "brand_risk_assessment" | "documentation_review" | "sourcing_logic";

export type TrackDef = { track: string; track_key: TrackKey; track_number: number; dimension: string };

export const TRACKS: TrackDef[] = [
  { track: "track_0", track_key: "intake",                     track_number: 0, dimension: "Intake" },
  { track: "track_1", track_key: "supplier_identity",          track_number: 1, dimension: "Supplier Identity" },
  { track: "track_2", track_key: "supply_chain_relationship",  track_number: 2, dimension: "Supply Chain Relationship" },
  { track: "track_3", track_key: "brand_risk_assessment",      track_number: 3, dimension: "Brand Risk Assessment" },
  { track: "track_4", track_key: "documentation_review",       track_number: 4, dimension: "Documentation Review" },
  { track: "track_5", track_key: "sourcing_logic",             track_number: 5, dimension: "Sourcing Logic" },
];

export function trackByNumber(n: number): TrackDef {
  const t = TRACKS.find((x) => x.track_number === n);
  if (!t) throw new Error(`Unknown track_number ${n}`);
  return t;
}

// Which tracks run per plan (brief §3.4). track_0 always runs (intake).
export const TRACK_CONFIG: Record<PlanType, { tracks: number[] }> = {
  single_99: { tracks: [0, 1, 3, 5] },
  growth_279: { tracks: [0, 1, 2, 3, 4, 5] },
  scale_499: { tracks: [0, 1, 2, 3, 4, 5] },
};

// Finding tracks (1–5) included for a plan — the set the founder must complete
// and isCaseReadyForReport() checks. Excludes track_0 (intake gate, not a finding).
export function requiredFindingTracks(plan: PlanType): number[] {
  return TRACK_CONFIG[plan].tracks.filter((n) => n >= 1);
}
```

- [ ] **Step 2: Write tests**

```typescript
// lib/constants/tracks.test.ts
import { describe, it, expect } from "vitest";
import { TRACKS, trackByNumber, requiredFindingTracks } from "./tracks";

describe("track registry", () => {
  it("has 6 tracks with unique keys/numbers", () => {
    expect(TRACKS).toHaveLength(6);
    expect(new Set(TRACKS.map((t) => t.track_key)).size).toBe(6);
  });
  it("maps number to canonical key", () => {
    expect(trackByNumber(1).track_key).toBe("supplier_identity");
    expect(trackByNumber(0).track_key).toBe("intake");
  });
  it("single_99 requires tracks 1,3,5; growth requires 1–5", () => {
    expect(requiredFindingTracks("single_99")).toEqual([1, 3, 5]);
    expect(requiredFindingTracks("growth_279")).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 3: Run** `npm test -- tracks` → PASS.
- [ ] **Step 4: Commit** `git commit -am "G1: track_key registry + per-plan TRACK_CONFIG"`

---

### Task 3: Confidence band helpers (TDD)

**Files:** Create `lib/research/confidence.ts`, Test `lib/research/confidence.test.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/research/confidence.ts
export type ConfidenceBand = "low" | "moderate" | "high" | "verified";

// ADR-G003 universal bands for a 0–15 score.
export function scoreToBand(score: number): ConfidenceBand {
  if (score >= 12) return "verified";
  if (score >= 8) return "high";
  if (score >= 4) return "moderate";
  return "low";
}

// Map the legacy 3-level confidence (used by the current manual scorer) to a band.
export function legacyConfidenceToBand(c: "low" | "medium" | "high"): ConfidenceBand {
  return c === "high" ? "high" : c === "medium" ? "moderate" : "low";
}
```

- [ ] **Step 2: Tests**

```typescript
// lib/research/confidence.test.ts
import { describe, it, expect } from "vitest";
import { scoreToBand, legacyConfidenceToBand } from "./confidence";

describe("confidence bands", () => {
  it("maps scores to ADR-G003 bands", () => {
    expect(scoreToBand(0)).toBe("low");
    expect(scoreToBand(4)).toBe("moderate");
    expect(scoreToBand(8)).toBe("high");
    expect(scoreToBand(15)).toBe("verified");
  });
  it("maps legacy medium→moderate", () => {
    expect(legacyConfidenceToBand("medium")).toBe("moderate");
  });
});
```

- [ ] **Step 3: Run** `npm test -- confidence` → PASS. **Commit.**

---

### Task 4: Banned-language scanner (TDD)

**Files:** Create `lib/utils/banned-language.ts`, Test `lib/utils/banned-language.test.ts`

- [ ] **Step 1: Implement** (brief §3.12; never the word "ungating")

```typescript
// lib/utils/banned-language.ts
const BANNED: { re: RegExp; label: string }[] = [
  { re: /ungat/i, label: "ungating" },
  { re: /authoriz(ed|e)\s+(seller|reseller|distributor)/i, label: "authorized seller/distributor" },
  { re: /authoris(ed|e)\s+(seller|reseller|distributor)/i, label: "authorised seller/distributor" },
  { re: /official\s+distributor/i, label: "official distributor" },
  { re: /amazon\s+approv/i, label: "amazon approved" },
  { re: /account\s+safe/i, label: "account safe" },
  { re: /\bguarantee/i, label: "guarantee" },
  { re: /\b(safe|approved|verified|recommended|low[\s-]?risk)\s+supplier/i, label: "safe/approved/verified supplier" },
  { re: /affiliated\s+with\s+(amazon|walmart|ebay|shopify)/i, label: "affiliated with marketplace" },
];

// Scan arbitrary client-facing text. Returns matched violation labels (empty = clean).
export function scanForBannedLanguage(text: string): string[] {
  if (!text) return [];
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.label);
}

// Scan every string value found in a compiled findings JSON blob.
export function scanFindingsForBannedLanguage(findings: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") scanForBannedLanguage(v).forEach((x) => out.add(x));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(findings);
  return [...out];
}
```

- [ ] **Step 2: Tests**

```typescript
// lib/utils/banned-language.test.ts
import { describe, it, expect } from "vitest";
import { scanForBannedLanguage, scanFindingsForBannedLanguage } from "./banned-language";

describe("banned language", () => {
  it("catches prohibited phrases", () => {
    expect(scanForBannedLanguage("This is an authorized seller")).toContain("authorized seller/distributor");
    expect(scanForBannedLanguage("we guarantee results")).toContain("guarantee");
    expect(scanForBannedLanguage("ungating service")).toContain("ungating");
  });
  it("passes clean evidence language", () => {
    expect(scanForBannedLanguage("No observable risk signals were found.")).toEqual([]);
  });
  it("walks nested findings json", () => {
    const f = { summary: "official distributor", claims: [{ statement: "ok" }] };
    expect(scanFindingsForBannedLanguage(f)).toContain("official distributor");
  });
});
```

- [ ] **Step 3: Run** `npm test -- banned-language` → PASS. **Commit.**

---

### Task 5: `case_track_results` data layer

**Files:** Create `lib/data/track-results.ts`

- [ ] **Step 1: Implement** (admin/service-role reads + writes used by orchestrator, review route, gate)

```typescript
// lib/data/track-results.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ConfidenceBand } from "@/lib/research/confidence";

export type TrackResultRow = {
  id: string;
  case_id: string;
  track: string;
  track_key: string;
  track_number: number;
  source_mode: "ai_generated" | "manual_override";
  compiled_findings_json: Record<string, unknown> | null;
  confidence_score: number | null;
  confidence_band: ConfidenceBand | null;
  finding_certainty: "verified" | "inferred" | "unknown" | null;
  founder_review_status: "pending" | "approved" | "edited" | "rejected";
  manual_review_required: boolean;
  manual_review_reason: string | null;
  attempt_number: number;
};

const COLS =
  "id, case_id, track, track_key, track_number, source_mode, compiled_findings_json, confidence_score, confidence_band, finding_certainty, founder_review_status, manual_review_required, manual_review_reason, attempt_number";

export async function getCaseTrackResults(caseId: string): Promise<TrackResultRow[]> {
  const { data } = await supabaseAdmin
    .from("case_track_results")
    .select(COLS)
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("track_number", { ascending: true });
  return (data as TrackResultRow[]) ?? [];
}

// Upsert a single track row on the (case_id, track, attempt_number=1) natural key.
export async function upsertTrackResult(
  row: Partial<TrackResultRow> & { case_id: string; track: string; track_key: string; track_number: number },
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("case_track_results")
    .upsert({ attempt_number: 1, ...row }, { onConflict: "case_id,track,attempt_number" });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 2: Verify types** Run `npx tsc --noEmit` → clean. **Commit** `git commit -am "G1: case_track_results data layer"`.

---

### Task 6: Track 0 — deterministic intake (TDD)

**Files:** Create `lib/research/track0.ts`, Test `lib/research/track0.test.ts`

- [ ] **Step 1: Implement** (no LLM; uses normalizeName)

```typescript
// lib/research/track0.ts
import { normalizeName } from "@/lib/utils/normalize-name";

export type Track0Input = {
  vendor_name: string | null;
  brands_submitted: string[] | null;
  has_document: boolean;
};

export type Track0Output = {
  normalized_vendor_name: string;
  brands_count: number;
  has_document: boolean;
  submission_type: "full_review" | "brand_only_review";
  intake_flags: string[];
};

// Deterministic intake validation. Normalizes the vendor cache key, counts brands,
// records whether evidence (a document) was provided, and raises intake flags.
export function runTrack0(input: Track0Input): Track0Output {
  const normalized = normalizeName(input.vendor_name ?? "");
  const brands = input.brands_submitted ?? [];
  const flags: string[] = [];
  if (!normalized) flags.push("missing_or_unusable_vendor_name");
  if (brands.length === 0) flags.push("no_brands_submitted");
  if (!input.has_document) flags.push("no_document_evidence");
  return {
    normalized_vendor_name: normalized,
    brands_count: brands.length,
    has_document: input.has_document,
    submission_type: input.vendor_name ? "full_review" : "brand_only_review",
    intake_flags: flags,
  };
}
```

- [ ] **Step 2: Tests**

```typescript
// lib/research/track0.test.ts
import { describe, it, expect } from "vitest";
import { runTrack0 } from "./track0";

describe("runTrack0", () => {
  it("normalizes vendor and counts brands", () => {
    const r = runTrack0({ vendor_name: "Acme LLC", brands_submitted: ["Milwaukee"], has_document: true });
    expect(r.normalized_vendor_name).toBe("acme");
    expect(r.brands_count).toBe(1);
    expect(r.intake_flags).toEqual([]);
  });
  it("flags missing evidence", () => {
    const r = runTrack0({ vendor_name: "Acme LLC", brands_submitted: [], has_document: false });
    expect(r.intake_flags).toContain("no_brands_submitted");
    expect(r.intake_flags).toContain("no_document_evidence");
  });
});
```

- [ ] **Step 3: Run** `npm test -- track0` → PASS. **Commit.**

---

### Task 7: Orchestrator — initialize case research

**Files:** Create `lib/research/orchestrator.ts`; Modify `app/api/cases/submit/route.ts`

- [ ] **Step 1: Implement orchestrator**

```typescript
// lib/research/orchestrator.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanType } from "@/lib/constants/plans";
import { TRACKS, TRACK_CONFIG, trackByNumber } from "@/lib/constants/tracks";
import { runTrack0, type Track0Input } from "@/lib/research/track0";

// Called once at submit, AFTER the case row exists + credits are deducted.
// Runs Track 0 (deterministic), then writes one case_track_results row per track:
//  - track_0: ai_generated + founder_review_status 'approved' (intake is not a finding)
//  - included finding tracks: manual_required + 'pending' (G1 has no automation)
//  - excluded tracks: case.track_N_status 'skipped' (no row)
// Idempotent via upsert on (case_id, track, attempt_number=1).
export async function initializeCaseResearch(
  caseId: string,
  plan: PlanType,
  intake: Track0Input,
): Promise<{ error: string | null }> {
  const included = new Set(TRACK_CONFIG[plan].tracks);
  const t0 = runTrack0(intake);

  const rows = TRACKS.map((t) => {
    if (t.track_number === 0) {
      return {
        case_id: caseId, track: t.track, track_key: t.track_key, track_number: 0,
        source_mode: "ai_generated" as const,
        compiled_findings_json: t0 as unknown as Record<string, unknown>,
        founder_review_status: "approved" as const,
        manual_review_required: false, attempt_number: 1,
      };
    }
    if (!included.has(t.track_number)) return null; // skipped track → no row
    return {
      case_id: caseId, track: t.track, track_key: t.track_key, track_number: t.track_number,
      source_mode: "ai_generated" as const,
      compiled_findings_json: null,
      founder_review_status: "pending" as const,
      manual_review_required: true,
      manual_review_reason: "Automated research not yet enabled (G1) — enter findings manually.",
      attempt_number: 1,
    };
  }).filter(Boolean) as Record<string, unknown>[];

  const { error: upErr } = await supabaseAdmin
    .from("case_track_results")
    .upsert(rows, { onConflict: "case_id,track,attempt_number" });
  if (upErr) return { error: upErr.message };

  // Update per-track status on cases + advance the case to awaiting_review.
  const caseUpdate: Record<string, unknown> = { status: "awaiting_review", track_0_status: "complete" };
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = included.has(n) ? "manual_required" : "skipped";
  }
  const { error: caseErr } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", caseId);
  return { error: caseErr?.message ?? null };
}
```

- [ ] **Step 2: Wire into submit** — in `app/api/cases/submit/route.ts`, after the optional file-upload block and BEFORE the final `return NextResponse.json({ ok: true, ... })`, add:

```typescript
  // ---- initialize the research pipeline (G1: Track 0 + manual-required tracks) ----
  try {
    const { initializeCaseResearch } = await import("@/lib/research/orchestrator");
    await initializeCaseResearch(created.id, plan, {
      vendor_name: vendorName,
      brands_submitted: brands,
      has_document: !!(file && file instanceof Blob && file.size > 0),
    });
  } catch {
    // Non-fatal: the case + charge already exist; the founder queue still surfaces it
    // (FOUNDER_QUEUE_STATUSES includes pending_intake). Orchestration can be re-run.
  }
```

- [ ] **Step 3: Verify** Run `npx tsc --noEmit && npx eslint app components lib` → clean.
- [ ] **Step 4: Commit** `git commit -am "G1: case orchestrator (Track 0 + track rows) wired into submit"`

---

### Task 8: Founder-review gate (TDD on the pure predicate)

**Files:** Create `lib/research/founder-review.ts`, Test `lib/research/founder-review.test.ts`

- [ ] **Step 1: Implement** (pure predicate + DB wrapper)

```typescript
// lib/research/founder-review.ts
import type { PlanType } from "@/lib/constants/plans";
import { requiredFindingTracks } from "@/lib/constants/tracks";
import { getCaseTrackResults, type TrackResultRow } from "@/lib/data/track-results";

// Pure check: every required finding track has compiled findings AND is approved|edited.
export function evaluateReportReady(plan: PlanType, rows: TrackResultRow[]): boolean {
  const required = requiredFindingTracks(plan);
  return required.every((n) => {
    const r = rows.find((x) => x.track_number === n);
    return !!r && r.compiled_findings_json !== null
      && (r.founder_review_status === "approved" || r.founder_review_status === "edited");
  });
}

export async function isCaseReadyForReport(caseId: string, plan: PlanType): Promise<boolean> {
  const rows = await getCaseTrackResults(caseId);
  return evaluateReportReady(plan, rows);
}
```

- [ ] **Step 2: Tests** (pure fn only — no DB)

```typescript
// lib/research/founder-review.test.ts
import { describe, it, expect } from "vitest";
import { evaluateReportReady } from "./founder-review";
import type { TrackResultRow } from "@/lib/data/track-results";

const row = (n: number, status: TrackResultRow["founder_review_status"], hasFindings: boolean): TrackResultRow => ({
  id: String(n), case_id: "c", track: `track_${n}`, track_key: "x", track_number: n,
  source_mode: "manual_override", compiled_findings_json: hasFindings ? { ok: true } : null,
  confidence_score: null, confidence_band: null, finding_certainty: null,
  founder_review_status: status, manual_review_required: false, manual_review_reason: null, attempt_number: 1,
});

describe("evaluateReportReady", () => {
  it("true when all required (1,3,5) approved with findings", () => {
    const rows = [row(1, "approved", true), row(3, "edited", true), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(true);
  });
  it("false when a required track is still pending", () => {
    const rows = [row(1, "approved", true), row(3, "pending", true), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(false);
  });
  it("false when a required track lacks findings", () => {
    const rows = [row(1, "approved", true), row(3, "approved", false), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(false);
  });
});
```

- [ ] **Step 3: Run** `npm test -- founder-review` → PASS. **Commit.**

---

### Task 9: Re-point review API → `case_track_results` + enforce gate + banned-language

**Files:** Modify `app/api/admin/cases/[id]/review/route.ts`

Context: the route currently (a) updates the case, (b) on `approve` sets `delivered`, (c) writes per-dimension rows to `research_findings`. Change (c) to write `case_track_results`, and gate (b) on `isCaseReadyForReport` + a banned-language scan.

- [ ] **Step 1: Replace the findings-write block.** Find the block starting `if (dims.length > 0) {` … through its closing `}` (the one that deletes/inserts `research_findings`). Replace with:

```typescript
  // Persist per-dimension findings to the authoritative case_track_results (ADR-G001).
  // Founder-entered = manual_override + 'edited' (the founder authored/changed them).
  if (dims.length > 0) {
    const { upsertTrackResult } = await import("@/lib/data/track-results");
    const { trackByNumber } = await import("@/lib/constants/tracks");
    const { legacyConfidenceToBand } = await import("@/lib/research/confidence");
    const band = legacyConfidenceToBand(confidence as "low" | "medium" | "high");
    for (const d of dims) {
      if (d.index < 1 || d.index > 5) continue;
      const def = trackByNumber(d.index);
      const compiled = { score: d.score, summary: d.note ?? "" };
      await upsertTrackResult({
        case_id: id, track: def.track, track_key: def.track_key, track_number: d.index,
        source_mode: "manual_override",
        compiled_findings_json: compiled,
        confidence_band: band,
        finding_certainty: SCORE_CERTAINTY[d.score] ?? "unknown",
        founder_review_status: "edited",
        manual_review_required: false,
      });
    }
  }
```

- [ ] **Step 2: Gate the approve transition.** Find `if (action === "approve") { update.status = "delivered"; update.delivered_at = ... }` and the subsequent `cases` update. Move the findings-write (Step 1) to run BEFORE the case update, then replace the approve block so delivery only happens when ready + clean:

```typescript
  if (action === "approve") {
    const { isCaseReadyForReport } = await import("@/lib/research/founder-review");
    const { getCaseTrackResults } = await import("@/lib/data/track-results");
    const { scanFindingsForBannedLanguage } = await import("@/lib/utils/banned-language");

    const ready = await isCaseReadyForReport(id, caseRow.plan_type);
    if (!ready) return NextResponse.json({ error: "not_ready", message: "All required tracks must be completed before delivery." }, { status: 409 });

    const rows = await getCaseTrackResults(id);
    const violations = rows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json));
    if (violations.length > 0) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "case_track_results", record_id: id, action: "UPDATE",
        actor_id: userId, actor_type: "admin",
        new_value: { blocked: "banned_language", violations },
      });
      return NextResponse.json({ error: "banned_language", violations }, { status: 422 });
    }
    update.status = "delivered";
    update.delivered_at = new Date().toISOString();
  }
```

NOTE: this requires `caseRow.plan_type`. Near the top of the handler (after `const { id } = await params;`), add a fetch if not already present:

```typescript
  const { data: caseRow } = await supabaseAdmin.from("cases").select("plan_type").eq("id", id).maybeSingle();
  if (!caseRow?.plan_type) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
```

Ensure the dims-write block (Step 1) executes BEFORE the `if (action === "approve")` readiness check (so the just-entered findings count toward readiness).

- [ ] **Step 3: Verify** `npx tsc --noEmit && npx eslint app components lib` → clean.
- [ ] **Step 4: Commit** `git commit -am "G1: review API writes case_track_results, gates delivery + banned-language"`

---

### Task 10: Re-point Evidence tab read → `case_track_results`

**Files:** Modify `lib/data/cases.ts` (`Finding` type + `getCaseFindings`)

- [ ] **Step 1: Update the `Finding` type** — change `confidence` to the band union and add `track_key`:

```typescript
export type Finding = {
  id: string;
  track: string;
  track_key: string;
  finding_certainty: "verified" | "inferred" | "unknown" | null;
  confidence_band: "low" | "moderate" | "high" | "verified" | null;
  compiled_findings_json: Record<string, unknown> | null;
  ai_output_json: Record<string, unknown> | null;
  manual_notes: string | null;
};
```

- [ ] **Step 2: Repoint the query** — in `getCaseFindings`, replace the `.from("research_findings").select(...)` call with:

```typescript
  const { data } = await supa
    .from("case_track_results")
    .select("id, track, track_key, finding_certainty, confidence_band, compiled_findings_json, ai_output_json, manual_notes")
    .eq("case_id", caseId)
    .gte("track_number", 1)            // Evidence tab shows finding tracks, not intake
    .is("deleted_at", null)
    .order("track_number", { ascending: true });
  return (data as Finding[]) ?? [];
```

- [ ] **Step 3: Fix consumers** — search for `.confidence` on findings in the Evidence UI:

Run: `npx grep -rn "\.confidence\b" app components | grep -i finding` (or use the editor) — update any `finding.confidence` to `finding.confidence_band`. Likely in `components/portal/case-detail-view.tsx`.

- [ ] **Step 4: Verify** `npx tsc --noEmit && npx eslint app components lib && npm run build` → clean.
- [ ] **Step 5: Commit** `git commit -am "G1: Evidence tab reads case_track_results (authoritative)"`

---

### Task 11: Admin review UI — plan-aware required tracks + gate display

**Files:** Modify `app/(admin)/admin/cases/[id]/review/page.tsx`, `components/admin/case-review.tsx`

- [ ] **Step 1: Pass plan + existing track rows to the component.** In `page.tsx`, fetch track results and pass props:

```typescript
import { getCaseTrackResults } from "@/lib/data/track-results";
import { requiredFindingTracks } from "@/lib/constants/tracks";
// ... inside the component, after `const c = await getAdminCase(id);`
const trackRows = c.plan_type ? await getCaseTrackResults(c.id) : [];
const required = c.plan_type ? requiredFindingTracks(c.plan_type) : [1, 2, 3, 4, 5];
// pass to <CaseReview caseId={c.id} initial={{ verdict: c.verdict }} requiredTracks={required}
//   existing={trackRows.map((r) => ({ track_number: r.track_number, status: r.founder_review_status, band: r.confidence_band }))} />
```

- [ ] **Step 2: Extend `CaseReview` props + gating.** Add to the component signature:

```typescript
export function CaseReview({
  caseId, initial, requiredTracks = [1, 2, 3, 4, 5], existing = [],
}: {
  caseId: string;
  initial: { verdict: string | null };
  requiredTracks?: number[];
  existing?: { track_number: number; status: string; band: string | null }[];
}) {
```

Replace the hard-coded "of 5" gate. Compute required-scored count and disable Approve until met:

```typescript
  const requiredScored = requiredTracks.filter((n) => scores[n] !== undefined).length;
  const allRequiredScored = requiredScored >= requiredTracks.length;
```

In the summary box change `{scoredCount} of 5` to `{requiredScored} of {requiredTracks.length}`, and change the Approve button `disabled` to `disabled={!verdict || !allRequiredScored || busy !== null}`, with the helper line showing `Score all {requiredTracks.length} required dimensions first` when `!allRequiredScored`.

Render only the dimensions whose `track_number` is in `requiredTracks` (so single_99 shows 3, growth/scale show 5): wrap the `DIMENSIONS.map` so dimension `i` (idx `i+1`) renders only `if (requiredTracks.includes(i + 1))`. Show each rendered dimension's prior `existing` status badge (Pending/Approved/Edited) when present.

- [ ] **Step 3: Handle the 409 not_ready / 422 banned_language responses** in `send()` — surface `data.message`/`data.violations` in the existing `error` state.

- [ ] **Step 4: Verify** `npx tsc --noEmit && npx eslint app components lib && npm run build` → clean.
- [ ] **Step 5: Commit** `git commit -am "G1: plan-aware review gate + per-track status in Case Review"`

---

### Task 12: Full verification + progress + push

- [ ] **Step 1: Full suite**

Run: `npx tsc --noEmit && npx eslint app components lib && npm test && npm run build`
Expected: all clean; vitest shows the new G1 tests passing (≈ +12 tests).

- [ ] **Step 2: Update progress** — add a "Session G.1 — pipeline backbone" entry to `SESSION_F_PROGRESS.md` listing: normalizeName fixed; track registry + TRACK_CONFIG; Track 0; orchestrator wired into submit; founder-review gate; review API + Evidence tab re-pointed to case_track_results; banned-language enforcement; plan-aware review UI. Note: Inngest activation + Tracks 1–5 automation = G2.

- [ ] **Step 3: Commit + push**

```bash
git add -A && git commit -m "G1: research pipeline backbone + Track 0 + manual workflow"
git push origin staging
```

- [ ] **Step 4: Manual verification handoff (cannot be done headlessly — Clerk auth).** Hand the founder this checklist: submit a new case → confirm 6 `case_track_results` rows exist (track_0 approved + intake JSON; required finding tracks manual_required/pending; skipped tracks have no row) and the case shows in the founder queue at `awaiting_review`; open Case Review → score the required dimensions + pick a verdict → Approve & Deliver enables only when all required dimensions scored → deliver → client Evidence tab renders the findings from `case_track_results`.

---

## Out of scope (later phases)
- Tracks 1–5 automation, Inngest function activation, WHOIS/Keepa/Serper, `runModel()` adapter → **G2/G3**.
- React-PDF Decision Snapshot → **Phase H**.
- Founder-edit training-feedback logging (ADR-008 §2 future note).
- Dropping `research_findings` → after G1 stabilization + verification.
