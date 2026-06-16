// Storage buckets the app depends on (Session 3 upload, Session 7 reports).
export const REQUIRED_BUCKETS = ["case-documents", "reports"] as const;

export function missingBuckets(existing: string[]): string[] {
  return REQUIRED_BUCKETS.filter((b) => !existing.includes(b));
}
