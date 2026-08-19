// A path-carrying walk over every string in a value. The checkpoint needs to say WHERE a token
// was found — "findings[1].summary" — because "a token is present somewhere in this payload" is
// not an actionable refusal for the operator who has to go and look at it.
//
// Kept separate from clientReport.ts on purpose: that module is the CLEANERS, this is a plain
// traversal shared with the checkpoint, and the two must not grow into each other.
export interface DeepString {
  path: string;
  value: string;
}

export function deepStrings(value: unknown, path = ""): DeepString[] {
  if (typeof value === "string") return [{ path: path || "(root)", value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => deepStrings(v, `${path}[${i}]`));
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      deepStrings(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}
