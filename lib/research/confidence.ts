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
