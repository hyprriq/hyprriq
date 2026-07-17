# brand_status Carrier — Authorship Verification (a)–(d) + Payload Enumeration (2026-07-17)

**Context:** OQ-S4 (i) ruled M9 carries the per-brand status; home RULED = sibling on `SynthesisOutput` (not DecisionSnapshot); semantics RULED as principle = three states, not-assessed never collapses to clearance. This report answers the ordered verification (a)–(d) FROM SOURCE and enumerates the payload. **Nothing built. The founder rules the payload from these answers.**

## (a) Is per-brand attribution code-written in the frozen track record? — **NO. None survives.**

- **The code-side per-brand scoping exists at request time and DIES AT THE PACK BOUNDARY.** Track 3 builds its queries per brand in code (`track3.queries.ts` from `brands_submitted`), but `RawSource` = `{url, title, snippet, raw, provenance}` — **no question field, no brand field** (`acquisition/types.ts:37-43`); `finalizePack` merges all requests' sources into one deterministically-ordered list; and `AcquisitionMetric` is **per-plugin, aggregated across calls, no question field** (`types.ts:63-70`) — even ops telemetry does not retain which brand's query produced what.
- **The ONLY brand attribution in the frozen record is `EvidenceItem.brand` — LLM-WRITTEN.** It is a field in the model's output schema (`ProposedTrack3Item.brand`, track3.prompt.ts:19; `ProposedTrack2Item.brand`, track2.prompt.ts:15), copied to the stored item by code (`brand: it?.brand || undefined`, track3.ts:160; track4.ts:167), and **validated against NOTHING** — not the submitted-brands roster, not an enum: a misspelled or invented brand string is stored as-is. The "brand isolation / exactly one brand" discipline is PROMPT LAW only. Same authorship for `b2b_only_brands` (LLM list, track2.prompt.ts:25) and the per-question `brand` tags. Track 1 has no brand field (single-subject by design).

## (b) Is the submitted-brands roster code-side? — **YES.** `cases.brands_submitted` (string[]) — the client's own input, stored per case, code-read everywhere (verified earlier in this arc). The per-brand ROSTER is deterministically buildable, independent of any LLM output.

## (c) Is assessed / not-assessed derivable in code per brand? — **PER TRACK, YES. PER BRAND WITHIN A RAN TRACK, NO — the stop condition fires.**

- Per TRACK the frozen record is fully honest: row present/absent, `track_verdict_signal: n_a`, and the H3 cause flags (`not_implemented` / `nothing_to_review` / `acquisition_failed` / `llm_failed`) distinguish tier-exclusion from failure from absence — all code-written. A dimension that did not run ⇒ **not-assessed for ALL brands on that dimension, deterministically.**
- WITHIN a ran track, a brand with zero evidence items is **indistinguishable in code** between: (i) assessed, nothing found; (ii) its queries returned nothing (acquisition silence); (iii) the model ignored it. No source→brand linkage survives (a), and item→brand tags are LLM-written — so the distinction the three-state ruling depends on ("assessed-no-adverse" vs "not-assessed") **cannot be code-derived at brand granularity from the frozen record as it exists.**
- **SAY-SO-AND-STOP, per the order: the three-state ruling cannot be built deterministically at brand granularity on the current record. The founder rules the fallback.**

## (d) The honest label

Every per-brand attribution in the frozen record is LLM-written, enum-unvalidated, roster-unvalidated. Blast radius confirmed from source: the verdict is case-level and per-brand vetoes pool at the frozen track layer BEFORE any brand tag is read — **an LLM brand tag cannot move a verdict** — but it CAN put the wrong brand name in the client's sentence, and today nothing even guarantees the tag is a submitted brand (a hallucinated string would flow to a narrative unchecked).

## Home ruling — executed items, verified as ordered

- **S-0 safety CONFIRMED FROM SOURCE, not assumed:** `certifySynthesisForVerdict` builds its output from `emptyVerdictInput()` and constructs the certified object from scratch (`synthesisFirewall.ts:86-99`) — an unknown sibling on `SynthesisOutput` can never reach `computeVerdict`; rebuild-by-construction, and the poisoned test's unknown-extra-fields coverage is exactly this. No S-0 change needed or made.
- **Sibling name PROPOSED (founder rules): `brand_evidence_status`.** Reasoning: it names the FACT class — where evidence landed per brand — with no verdict-adjacent word (no "risk", "clear", "rating", "verdict"); "evidence status" cannot be read as a per-brand judgment; it is distinct from every DecisionSnapshot field; and it deliberately does NOT carry a module_9 prefix because it is not the M9 LLM call's output — it is code-merged beside it (the exact two-authorship-classes separation the home ruling exists to preserve).
- **B4-EXT row added** (presumed leak until proven; admin-only until the client-surface gate rules rendering).

## Payload enumeration (from the answers; NOTHING chosen — the founder rules)

Per-brand entry, roster from `brands_submitted` (code, (b)):
- `brand` — code, from the roster. Deterministic.
- `state: assessed_no_adverse | assessed_adverse | not_assessed` — **authorship is SPLIT by granularity per (c):** `not_assessed` from dimension-level facts = CODE; within-a-ran-track states = derivable only via LLM brand tags (labeled per (d)).
- `driving: boolean` — the verdict-driving brand: the veto/floor itself is code, but WHICH brand it attaches to comes from the LLM tag on the veto-carrying item. LLM-mediated on multi-brand cases; deterministic on single-brand cases (roster of one).
- **Options the answers create (enumerated, not recommended):** (α) ship the three states with split authorship, truthfully labeled (code at dimension granularity, LLM-attributed within ran tracks) + a CODE roster-validation lock on the brand tag (tag ∉ brands_submitted ⇒ dropped/audited — closes the hallucinated-brand hole without trusting attribution); (β) make attribution deterministic by persisting the question/brand linkage per source — **flagged, not proposed: `EvidencePack`/`RawSource` is marked FROZEN CONTRACT (CTO §4) in types.ts — that is a frozen-surface change with its own sign-off gate**; (γ) reduce v1 to what is fully deterministic (dimension-granularity not_assessed + case-level facts) and defer brand-granularity states to (β)'s gate.

**S-1 remains blocked on: the founder's matrix fill · this payload ruling · SO-S1-1's one-read re-affirmation.**
