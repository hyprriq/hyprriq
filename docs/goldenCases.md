# The golden-case regression suite — what it catches, and what it does not

**Built 2026-08-22 (founder-locked item 3).** Suite: `lib/research/goldenCases.test.ts` ·
Fixtures: `lib/research/__fixtures__/goldenCases.json` · Generator: `scripts/golden-cases-freeze.ts`

## Why it exists

Display honesty can refuse a verdict that is **absent**; it cannot audit one that was **computed
wrongly**. Until this suite, the only detector for a silently-wrong verdict was the founder reading
every report. This is the control that replaces that human — for the part of the problem a machine
can hold.

## What it actually does

It replays `stageVerdict()` — the *same exported function the pipeline calls* — over 40 real cases'
frozen inputs. That chain is `certifySynthesisForVerdict → computeVerdict →
applyDocumentationNoOverride → applyVerdictCeiling`. It is pure: no LLM, no network, no cost.

**No engine code was changed to make this work** (item 3d). The engine was already replayable: the
verdict is a pure function of the persisted per-track signals plus the structured contradictions,
and `verdictViewModel` already re-derives it in production ("one shared fn each, three sites, so
the displayed verdict always equals `cases.verdict`").

## Selection criteria (item 3a) — and the deviation from the brief

The brief asked for ~30 **delivered** cases spanning all four verdicts. **The corpus cannot supply
that, and I did not pretend otherwise:**

- Only **14** delivered cases have complete replay data.
- **Zero** delivered cases carry `do_not_rely` — the most severe verdict would have been entirely
  unguarded.

So the set is **every case whose verdict is reproducible from its own frozen inputs**, delivered or
not — 40 of 45. The replay tests the decision layer, which does not care whether a case shipped;
an `awaiting_review` case's stored signals are exactly as valid an anchor. This is *more*
representative than the delivered-only set, not more convenient: it adds 15 `do_not_rely` anchors
the brief's version would have lost.

| Verdict | Frozen anchors |
|---|---|
| `verify_before_purchase` | 21 |
| `do_not_rely` | 15 |
| `usable_with_conditions` | 4 |
| **`source_clear`** | **0 — see the gap below** |

**Five cases excluded, each for a stated reason** (never silently): `AWI-2606-001` (delivered
attempt has no synthesis row — pairing its attempt-1 signals with attempt-2 contradictions would
fabricate an input), and `AWI-2606-002`, `AWI-2606-006`, `AWI-2607-025`, `SEED-VALIDATE-…` (no
attempt has both track rows and synthesis).

**The baseline is today's replay, not the historical stored verdict.** A regression suite must
detect *future* movement. Two cases — `AWI-2606-003` and `AWI-2607-022` — were decided under older
pipelines (`null` / `1.7.0`; current is `1.8.0`) and today's engine legitimately disagrees with
them. Freezing their stored verdicts would encode a verdict the engine does not produce and fail on
day one for the wrong reason. Both are flagged `diverges_from_stored` in the fixture and pinned by
name in a test, so **if that list ever grows, an engine change has silently re-decided history.**

> ⚠ **`AWI-2607-022` is delivered.** Today's engine would call it *Usable With Conditions*; the
> client received *Verify Before Purchase*. Harsher than current logic, not laxer — but the founder
> should know a delivered verdict is no longer what the engine would produce.

## Item 3e — what it catches, and honestly what it does not

### It CATCHES
| Change | Caught? | Why |
|---|---|---|
| **Weight change** (`TRACK_WEIGHTS`) | ✅ **Verified** | Proven, not assumed: temporarily moving `supplier_identity` 0.30→0.50 failed 6 named cases, then reverted byte-identical. |
| **Threshold / band boundary** | ✅ | Score→verdict mapping is inside the replayed chain. |
| **Veto rule change** | ✅ | Vetoes run in `computeVerdict`. |
| **Verdict-ceiling change** | ✅ | `applyVerdictCeiling` is in the chain. |
| **Documentation no-override change** | ✅ | In the chain. |
| **Synthesis-certification / firewall change** | ✅ | `certifySynthesisForVerdict` is the first step. |
| **Contradiction handling** (risk level, load-bearing) | ✅ | Frozen `module_4_contradictions` feed it. |

### It does NOT catch — this is the part that still needs a human
| Change | Caught? | Why not |
|---|---|---|
| **Prompt change** | ❌ | Prompts decide what the *signals become*. The suite starts from frozen signals, downstream of every prompt. |
| **Model version change** | ❌ | Same boundary. A new model producing different findings from identical evidence is invisible here. |
| **Evidence-collection change** (Serper, WHOIS, plugins, query sets) | ❌ | Changes what evidence exists at all — upstream of the freeze. |
| **`deriveTrackSignal` change** | ❌ | The signals are frozen *as inputs*; the function that produces them from findings is not exercised. **This is the biggest gap** — it sits between the evidence and the frozen boundary. |
| **Client-facing prose quality** | ❌ | Not a verdict. Guarded by the banned-language gate and the token checkpoint instead. |
| **A wrong verdict that was always wrong** | ❌ | The suite pins *stability*, not correctness. It freezes today's behaviour as the reference — if a case is wrongly decided today, it will be wrongly decided forever, silently. |

### What that means in practice
The suite converts *"has the decision layer moved?"* from a human question into a build failure.
It does not answer *"is the research right?"* — nothing automated does. Closing the
`deriveTrackSignal` gap is the highest-value next increment: freezing per-track *findings* and
replaying signal derivation would push the boundary one layer upstream.

## Rules

1. **A failure is never fixed by regenerating the fixture.** Either a founder ruling changed the
   engine deliberately (regenerate, and say so in the commit) or it is a regression.
2. Regeneration is `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/golden-cases-freeze.ts`.
3. The generator **validates its own freeze**: it refuses to write a case whose inputs it cannot
   pair from a single attempt, so a fixture can never be built from mixed-attempt data.

---

## ⛔ THE DIVERGENCE LAW (founder-locked 2026-08-22)

**A delivered verdict that no longer matches the engine is INVESTIGATED, never smoothed.**

Specifically, and in the founder's words — this is a law so that nobody can quietly undo it later:

- It is **never rebaselined away.**
- It is **never regenerated** to make a suite go green.
- It is **never removed from the pinned list** in `goldenCases.test.ts`.

A divergence means a real client holds a report the engine would no longer produce. That is a fact
about the product, not a test failure to be tidied. The correct response is to look at the case and
decide — re-issue, leave it, or rule the engine change wrong. The incorrect response, and the only
one this law forbids, is to make the signal disappear.

The two known divergences (`AWI-2606-003`, `AWI-2607-022`) are pinned **by name** in a test that
fails if the list changes. That test is the enforcement: adding to the list requires a deliberate
edit, and removing from it requires explaining why a divergence stopped existing. The nightly
integrity sweep (`/admin/integrity`) reports the same divergences independently, so deleting the
pin does not make them invisible — it only makes two records disagree.
