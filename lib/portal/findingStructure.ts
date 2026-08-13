// ── FINDING READABILITY (2026-08-13, item 3) — parse the structure the engine ALREADY writes
// into per-area findings, at the PRESENTATION layer only. Never rewrites, reorders, or drops the
// engine's words: the only characters consumed are the structural markers themselves — a label's
// trailing colon, "(N) " list markers, and "N. " markers in the enumerated-brand style. Anything
// without detectable structure renders as prose, unchanged.
//
// Recognised structure (conservative by design — a false split cuts real findings):
// - LABELS: a run of ALL-CAPS words (spaces, &, /, —, hyphens allowed) ending with ":", at the
//   start of the text or right after a sentence end. ≥2 chars per word, ≥4 chars total, and the
//   run must not be immediately preceded by a lowercase word fragment (mid-sentence acronyms like
//   "the vendor TD SYNNEX CORPORATION appears" never match because they aren't followed by ":").
// - "(1) …" items: parenthesized integers.
// - "1. …" items: ONLY when both "1." and "2." appear at segment starts — a lone "2003." or
//   "2.5" never triggers (the marker must be start-of-segment and followed by a space + capital).

export type FindingBlock =
  | { type: "heading"; text: string }
  | { type: "prose"; text: string }
  | { type: "list"; items: string[] };

// A label: start-of-string or after sentence punctuation + space; caps words; colon.
const LABEL_RE = /(^|(?<=[.!?…]\s))([A-Z][A-Z0-9&/'’-]*(?:\s*[—–-]\s*[A-Z][A-Z0-9&/'’-]*|\s+[A-Z][A-Z0-9&/'’-]*)*):\s+/g;
const PAREN_ITEM_RE = /\(\d{1,2}\)\s*/;
const NUM_ITEM_RE = /(^|(?<=[.!?…]\s))(\d{1,2})\.\s+(?=[A-Z(])/g;

function splitParenList(segment: string): FindingBlock[] {
  const parts = segment.split(PAREN_ITEM_RE).map((s) => s.trim()).filter(Boolean);
  if (!PAREN_ITEM_RE.test(segment) || parts.length < 2) return segment.trim() ? [{ type: "prose", text: segment.trim() }] : [];
  // Text before the first "(1)" stays prose; the rest are items.
  const firstMarker = segment.search(PAREN_ITEM_RE);
  const lead = segment.slice(0, firstMarker).trim();
  const items = segment
    .slice(firstMarker)
    .split(PAREN_ITEM_RE)
    .map((s) => s.trim())
    .filter(Boolean);
  const blocks: FindingBlock[] = [];
  if (lead) blocks.push({ type: "prose", text: lead });
  if (items.length > 0) blocks.push({ type: "list", items });
  return blocks;
}

function splitNumberedList(segment: string): FindingBlock[] | null {
  // Only fires when the enumerated style is unmistakable: "1. " AND "2. " both present at
  // segment/sentence starts, each followed by a capital or "(".
  const matches = [...segment.matchAll(NUM_ITEM_RE)];
  const numbers = matches.map((m) => Number(m[2]));
  if (!numbers.includes(1) || !numbers.includes(2)) return null;
  const pieces = segment.split(NUM_ITEM_RE);
  // split with two capture groups interleaves: [lead, sep, num, text, sep, num, text, ...]
  const blocks: FindingBlock[] = [];
  const lead = (pieces[0] ?? "").trim();
  if (lead) blocks.push({ type: "prose", text: lead });
  const items: string[] = [];
  for (let i = 1; i < pieces.length; i += 3) {
    const text = (pieces[i + 2] ?? "").trim();
    if (text) items.push(text);
  }
  if (items.length < 2) return null;
  blocks.push({ type: "list", items });
  return blocks;
}

function parseSegment(segment: string): FindingBlock[] {
  const trimmed = segment.trim();
  if (!trimmed) return [];
  if (PAREN_ITEM_RE.test(trimmed)) return splitParenList(trimmed);
  const numbered = splitNumberedList(trimmed);
  if (numbered) return numbered;
  return [{ type: "prose", text: trimmed }];
}

export function parseFindingStructure(text: string): FindingBlock[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  // The enumerated-brand style ("1. LENOVO: … 2. BOSCH: …") owns the whole text when present —
  // running the label pass first would orphan the "N." markers as stray prose.
  const wholeNumbered = splitNumberedList(t);
  if (wholeNumbered) return wholeNumbered;
  const blocks: FindingBlock[] = [];
  let lastIndex = 0;
  let sawLabel = false;
  LABEL_RE.lastIndex = 0;
  const labelMatches = [...t.matchAll(LABEL_RE)];
  for (const m of labelMatches) {
    const label = m[2];
    if (label.replace(/[^A-Z]/g, "").length < 4) continue; // too short to be a section label
    sawLabel = true;
    const start = m.index ?? 0;
    const before = t.slice(lastIndex, start);
    blocks.push(...parseSegment(before));
    blocks.push({ type: "heading", text: label });
    lastIndex = start + m[0].length;
  }
  const tail = t.slice(lastIndex);
  blocks.push(...parseSegment(tail));
  if (!sawLabel && blocks.length === 1 && blocks[0].type === "prose") {
    return [{ type: "prose", text: t }]; // no structure at all — verbatim
  }
  return blocks;
}
