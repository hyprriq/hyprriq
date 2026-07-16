# ADDENDUM-2 — Defensibility Posture ("uncrackable" review, acquisition lens; Moves 1–7)

**Status:** 🟢 **RULED (founder, 2026-07-16).** Standalone document — never merged with the S-board (riders are banned); rulings recorded verbatim below.

## FOUNDER RULINGS (2026-07-16, verbatim)

- **Move 1 REJECTED AS WRITTEN** — "a refactor of frozen code, as your own cost table now says in those words." **REDUCED FORM APPROVED, exactly as proposed:** (a) trade-secret inventory document — docs-only, zero code, any time; (b) new judgment parameters are born as versioned config. **A2's doubt matrix is (b)'s first instance, so S-1 builds the config layer natively for the one parameter that is new, without touching a byte of frozen code. Move 1's entire value, none of its risk.**
- **Move 2 = A1**, approved in ADDENDUM-1.
- **Move 3 BANKED** — write-side done; leverage at G6. The "moat gate" reframe accepted as framing; changes no build.
- **Move 4 BANKED** — remainder is S-2's pins.
- **Move 5 BANKED** — its standing rule is already in the tracker.
- **Move 6a → S-2, NOT the security phase** — "S-2 is a build slot, so this is not smuggling. Founder overrode your placement." (`server-only` on `lib/research/**` lands in S-2.)
- **Move 6b → security phase. Move 6c → agency gate. Move 7 — guidance, no build, ever.**

**Original status line:** 🔴 UNRULED — standalone strategic thesis. NOT part of the gate spec, does NOT merge with the S-board, ruled separately AFTER ADDENDUM-1 is read. Enters no build attached to any other sign-off (riders are banned).
**Provenance (stated honestly):** authored as CHAT-ONLY output in the 2026-07-16 session; a prior session message falsely described it as "recorded in the gate spec" — it was not. First written to disk 2026-07-16 as this file.
**Framing truth:** code and prompts are never uncrackable — anything that is instructions to a model can be approximated. "Uncrackable" = **even with the entire repo in hand, a cloner cannot reproduce the results**, because what survives a full leak is proprietary data, tuned parameters, and provable consistency.

---

## The seven moves

**Move 1 — Relocate the brain from prose to parameters.** The engine's judgment is already ~40 founder rulings encoded as configuration (weight tables, veto/collision law, corroboration rules, provenance/authority registries, ruled exclusions, ceiling, no-override, diversity cap — each born from a live incident a cloner has not had). Thesis: consolidate into a formally versioned judgment-configuration layer; generic mechanics, crown-jewel config; doubles as the trade-secret inventory acquirers request.

**Move 2 — Proprietary input representation.** = ADDENDUM-1 Amendment 1 (the synthesis brain reasons over features only our pipeline produces — firewall rejections with gates, consensus outcomes, diversity records, identity audits). Uncopyable because the inputs do not exist outside this system.

**Move 3 — The data flywheel is the only compounding lock.** Outcome-scored corpus (per-verdict AND per-hypothesis), the frozen-attempt backtest harness, the intelligence ledger — all time-locked (a cloner starting today is permanently N cases behind). Gap: the corpus is write-only; the caching/G6 read-side gate is where data becomes leverage — reframe it as the moat gate, not the margin gate.

**Move 4 — Provable consistency as the DD weapon.** Frozen packs, per-attempt immutability, IOS versioning, zero-API rejudge, replay hash-identity, canary ritual, three-site verdict agreement: an acquirer re-runs a case and gets the same verdict with a derivation trace; a cloner demos a chatbot that answers differently on Tuesday. Finish the two loose pins (ios model string; synthesis_version preflights) and keep the accuracy claim buildable from case_outcomes — a data-backed accuracy number is the most uncrackable artifact in the industry.

**Move 5 — Starve the only legal attack surface.** Competitors reverse-engineer purchased reports. Outputs-never-method, Module 9 + questions only, F2 allowlist with future-fields-private-by-default, banned-language discipline, no per-dimension signals client-side: twenty purchased reports teach the format, not the function (the function's inputs never surface). Standing rule: every "make the report more transparent" idea goes through a founder ruling — explainability features are method leakage by another name.

**Move 6 — Structural concealment, the cheap kind.** (a) mark `lib/research/**` `server-only` so an accidental client-side import is a BUILD ERROR (turns the PG-1/N4 class from vigilance into impossibility); (b) the mandated security phase (env separation, RLS) doubles as IP defense — one shared DB is an exfiltration surface; (c) analyst-era access tiers: analysts see outputs and the QA view, never prompts/registries/config — G005's role-gating extended to the method itself.

**Move 7 — What NOT to do.** No code obfuscation (theater; negative value in DD). No prompt fragmentation for secrecy at the cost of output quality. No fake complexity — an acquirer's engineers smell it.

---

## Cost table (1.3 — blunt) and satisfied-state (1.4)

| id | Touches | Modifies computeVerdict / deriveTrackSignal / weights / identityResolver? | Changes a signed contract? | Gate (my view) |
|---|---|---|---|---|
| Move 1 (as written) | **A REFACTOR OF FROZEN CODE — said in those words.** Physically consolidating the named parameters means restructuring weights.ts, the weightValidation registries + RULED_EXCLUSIONS, verdictCeiling, verdictNoOverride, sourceDiversity, hardFailConsensus — the frozen-core list verbatim. | **YES (weights.ts directly; the frozen-adjacent set wholesale)** | Would touch multiple FROZEN sign-offs (SO-1/SO-5 lineage, VALIDATION config) | **REJECT as written.** The non-refactor form that achieves the acquisition goal: (a) a trade-secret INVENTORY DOCUMENT enumerating every parameter + version + ruling provenance — docs-only, zero code, any time (security/pre-acquisition); (b) the going-forward rule: NEW judgment parameters (e.g. the doubt matrix) are born as versioned config — native to S-1. Recommend (a)+(b); the refactor buys aesthetics at frozen-core risk and should not happen. |
| Move 2 | = Amendment 1 | NO | No | **S-1** |
| Move 3 | nothing now; consumption is read-side | NO | No | **caching/G6** (leverage) + **G4** (outcome scoring) |
| Move 4 | **LARGELY ALREADY SATISFIED / BANKED** (H1, IOS, frozen packs, rejudge/replay, canary, F4). Remainder = exactly the two pins | NO | No | **S-2** (already founder-sequenced BEFORE S-1) + DD docs framing |
| Move 5 | **ALREADY SATISFIED** (F2 allowlist, OQ-D strips, outputs-never-method law) + the new standing rule | NO | No | standing rule → tracker (adopted by founder 2026-07-16); client-surface gate enforces |
| Move 6a | one-line new code (`server-only` marker) | NO | No | **security phase** (founder may pull earlier; it is still a build — not now) |
| Move 6b | already mandated | NO | No | **security phase** |
| Move 6c | new admin capability | NO | No | **agency/post-launch gate** |
| Move 7 | no build, ever | — | — | guidance |

**1.4 summary — satisfied by frozen state:** Move 4 (banked, minus S-2's two pins); Move 5 (banked; its standing rule now adopted); Move 3's write-side discipline (H6 ledger + F5 adopted-flow rollups — the leverage half is deferred BY DESIGN to caching/G6); Move 6b (mandated pre-launch). Open and ruleable: Move 1 in its reduced (a)+(b) form, Move 2 (=A1, with S-1), Move 6a placement, Move 6c at agency.
