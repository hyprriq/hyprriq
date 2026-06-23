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

// Deterministic intake validation (Track 0). No LLM, no external calls. Produces
// the normalized vendor cache key, counts brands, records whether document
// evidence was provided, and raises intake flags for the founder.
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
