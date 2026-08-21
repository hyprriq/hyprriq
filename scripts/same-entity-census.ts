// ── SAME-ENTITY ACCEPTANCE CENSUS (founder-ruled 2026-08-21) — READ-ONLY.
// Runs the REAL detector (lib/research/sameEntity.ts) over every stored case and prints, per
// case×brand, the same-entity status. THE ACCEPTANCE TEST RULED BEFORE ANYTHING SCORES:
// CONFIRMED must be exactly {AWI-2607-024, AWI-2608-034, AWI-2608-043} and nothing else.
// Exit 0 = acceptance holds · exit 1 = it does not (the design is wrong — stop).
// Run: npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/same-entity-census.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { detectSameEntity } from "@/lib/research/sameEntity";
import { canonicalDomain } from "@/lib/research/host";

const EXPECTED_CONFIRMED = new Set(["AWI-2607-024", "AWI-2608-034", "AWI-2608-043"]);

async function main() {
  const { data: cases, error: ce } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, supplier_identity")
    .is("deleted_at", null);
  if (ce) throw ce;

  const { data: packs, error: pe } = await supabaseAdmin
    .from("case_evidence_packs")
    .select("case_id, pack")
    .is("deleted_at", null);
  if (pe) throw pe;

  // Per case: hosts by profile across ALL its packs (any track, any attempt — the corpus view).
  const hostsByCase = new Map<string, { brand: Set<string>; company: Set<string> }>();
  for (const row of packs ?? []) {
    const entry = hostsByCase.get(row.case_id as string) ?? { brand: new Set<string>(), company: new Set<string>() };
    const sources = Array.isArray(row.pack) ? (row.pack as { url?: string | null; provenance?: { source_profile?: string } }[]) : [];
    for (const s of sources) {
      const host = s.url ? canonicalDomain(s.url) : null;
      if (!host) continue;
      if (s.provenance?.source_profile === "official_brand") entry.brand.add(host);
      if (s.provenance?.source_profile === "official_company") entry.company.add(host);
    }
    hostsByCase.set(row.case_id as string, entry);
  }

  const confirmed: string[] = [];
  const candidates: string[] = [];
  for (const c of cases ?? []) {
    const hosts = hostsByCase.get(c.id as string) ?? { brand: new Set<string>(), company: new Set<string>() };
    const si = (c.supplier_identity ?? {}) as { resolved_domain?: string | null };
    for (const brand of (c.brands_submitted ?? []) as string[]) {
      const r = detectSameEntity({
        resolved_domain: si.resolved_domain ?? null,
        vendor_name: (c.vendor_name as string | null) ?? null,
        brand,
        official_brand_hosts: [...hosts.brand],
        official_company_hosts: [...hosts.company],
      });
      if (r.status === "confirmed") {
        confirmed.push(`${c.case_number} × "${brand}" [${r.signals.join(", ")}] host=${r.matched_host}`);
      } else if (r.status === "candidate") {
        candidates.push(`${c.case_number} × "${brand}" (name only — correctly NOT confirmed)`);
      }
    }
  }

  console.log(`CONFIRMED (${confirmed.length}):`);
  for (const line of confirmed) console.log(`  ✔ ${line}`);
  console.log(`CANDIDATE-ONLY (${candidates.length}):`);
  for (const line of candidates) console.log(`  · ${line}`);

  const confirmedCases = new Set(confirmed.map((l) => l.split(" ")[0]));
  const extra = [...confirmedCases].filter((n) => !EXPECTED_CONFIRMED.has(n));
  const missing = [...EXPECTED_CONFIRMED].filter((n) => !confirmedCases.has(n));
  if (extra.length || missing.length) {
    console.error(`ACCEPTANCE FAIL — extra: [${extra.join(", ")}] missing: [${missing.join(", ")}]`);
    process.exit(1);
  }
  console.log("ACCEPTANCE PASS — confirmed set is exactly {AWI-2607-024, AWI-2608-034, AWI-2608-043}.");
}

main().catch((e) => { console.error(e); process.exit(1); });
