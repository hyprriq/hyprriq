# R-Axis Enumeration — for the planning thread's replacement ruling (2026-07-17)

**Context:** A1 split-ruled (widening STANDS; gap mechanism DEAD; founder principle: R measures THE VENDOR'S OWN LOAD-RELEVANT STORY THAT WE COULD NOT OBSERVE — never allegations against them). This document enumerates what the frozen record offers, from source + a read-only census (temp script, run once, deleted; methodology mirrors the investigation report's).
**Discipline:** ENUMERATION ONLY. No R definition is proposed. No cell filled, no threshold, no grouping of cases. The planning thread rules R's replacement; the founder then places his own cases.
**Census base:** 260 scoring-track rows (tracks 1–4, `deleted_at` null) across 65 attempts.

## 1 · THE ACCEPTED-KEY CENSUS — the class is ONE key, and it is nearly empty here

**Criterion used (stated so nothing is silently classified):** a VALIDATED registry key whose MEANING — per weights.ts label and the firewall's own routing comments — is "the vendor asserted this and we accepted it AS an unverified assertion."

- **Unambiguous members: exactly ONE key — `claims_authorization_unverified`** (+1, Track 2; label "Stated (unverified) authorization"; ALLOWED_PROFILES comment routes vendor self-claims to it explicitly: "a vendor self-claim ('we are an authorized distributor')… must map to claims_authorization_unverified"). **That the class is one key is itself a finding.**
- **Corpus count: accepted exactly 2 times, ever** — AWI-2607-021 attempt 8 (1) and AWI-2607-031 attempt 2 (1). Per-attempt counts for all 65 attempts are in the table below (63 zeros).
- **Adjacent, named NOT classified (the planning thread decides if any belong):** the ENTIRE accepted Track 4 class is vendor-supplied by construction (`claimant: "vendor"` code literal; the SAYS-vs-PROVES prompt law exists precisely because documents assert) — but its keys describe document classes, not claim-status; `screenshot_only` (+1) and `email_correspondence` (+1) are its weakest-artifact members. `invoice_matches_distributor` / `purchases_from_mega_distributor` accept `user_upload` citations — vendor-supplied when so cited, and the stored provenance says which. `no_connection_found` (0 pts) is an ABSENCE finding, not a claim — polarity-adjacent to a gap but not an assertion.
- Full accepted-key totals (corpus-wide, all keys): no_connection_found 115 · trade_press_connection 59 · negative_reputation 46 · linkedin_company 45 · government_registration 38 · bbb_or_trade_association 37 · domain_age_5_plus 35 · address_verifiable 23 · brand_enforcement_signals 21 · grey_market_signals 19 · brand_restricts_amazon 12 · reseller_friendly 11 · dealer_page_listed 7 · no_enforcement_found 7 · phone_verifiable 6 · purchases_from_mega_distributor 5 · map_policy_present 3 · invoice_full 3 · invoice_matches_distributor 2 · document_missing_fields 2 · **claims_authorization_unverified 2** · registration_fabricated 1 · domain_age_2_5 1.

## 2 · THE POLARITY-SPLIT CANDIDATE (rejections split by key sign) — evaluated, not ruled

**The data:** key sign is DETERMINISTIC (the versioned weights registry; sign class stable across rubric eras for these keys). Rejections by gate × sign: provenance|positive **322** · llm_returned_unknown|unsigned 104 · provenance|negative 17 · contradiction|positive 12 · provenance|zero 8 · contradiction|negative 3 · contradiction|zero 2 · grounding|veto 1 · consensus|veto 1. **Rejected-POSITIVE total: 334 of 470 (71%).**

**What is sound about it:** the sign split is code-derived, stored per attempt, computable on the historical corpus where validation exists; and in aggregate a rejected positive key does read "a good thing the story needs could not be established from acceptable sources" — the right polarity direction under the founder's principle.

**What it conflates — measured or named, each one real:**
1. **The re-proposal confound, MEASURED: 83 of the 334 rejected-positive proposals (25%) have the SAME key ALSO ACCEPTED in the same track row.** The fact WAS established; the rejection is citation-level noise (the LLM cited a wrong-class source on one item and a right-class source on another). Counting these as gaps counts established facts as gaps. Both records are stored, so the overlap is deterministically identifiable — whether to exclude it is part of the ruling, not stated here as a design.
2. **Proposal ≠ vendor claim.** A rejected positive records that the ENGINE proposed a key and the firewall refused the citation — it does not record WHO asserted the underlying thing. Many rejected positives are the engine's own verification attempts failing provenance (website_quality 55, phone_verifiable 43, address_verifiable 37 — nobody "claimed" these; the engine went looking). Under the ruled principle (the vendor's OWN story), sign-split R measures "unestablished goods" — related to, but not identical with, "vendor claims unobserved." The stored record does not carry per-proposal claimant attribution; M2 derives attribution at S-1, LLM-written.
3. **An observed relationship, reported as fact:** `dealer_page_listed` is the most-rejected key (98, provenance) while `claims_authorization_unverified` was accepted twice. The firewall's comment says vendor self-claims SHOULD map to the weak key; in practice the LLM proposes the strong key, the gate kills it, and the weak key is rarely written. The claim-shaped signal exists in the ledger today mostly as rejected-positive `dealer_page_listed` proposals, not as accepted weak-key items.
4. `llm_returned_unknown` (104) is unsigned — excluded from any sign split by construction; whether its mass means anything is a separate question.
5. Gate heterogeneity: contradiction-gate rejections (17) are the firewall's own dedupe/conflict resolution, not unverifiability; a sign split that pools gates pools different meanings.
6. Duplicate proposals of the same key within an attempt inflate counts (no per-fact identity across proposals).

## 3 · STORED UNKNOWNS — rich, unconditional-current, LLM-WRITTEN

- **Authorship: LLM-written** for scored tracks (`parsed.unknowns` from the model response); CODE-written only on specific failure branches (e.g., Track 4's unreadable-files branch constructs unknowns deterministically). So as an axis input it is the same class as M3 `unresolved` — model-authored.
- **Storage:** own column on `case_track_results`, written by EVERY current persist path (including n_a branches); present on 256/260 scoring rows (4 oldest rows null), non-empty on 114.
- **Per-attempt counts** (also carrying the per-attempt `claims_authorization_unverified` count from §1): range 0–14. Table: AWI-2606-001#1 cau=0/unknowns=not stored · 001#2 0/7 · 003#1 0/0 · 004#1 0/4 · 005#1 0/3 · 007#1 0/3 · 008#1 0/4 · 009#1 0/6 · 010#1 0/7 · 011#1 0/6 · 012#1 0/6 · 012#5 0/0 · 012#6 0/7 · 012#7 0/7 · 012#8 0/5 · 012#9 0/6 · 013#1 0/6 · 013#5 0/0 · 014#1 0/7 · 015#1 0/6 · 015#5 0/0 · 016#1 0/6 · 016#2 0/9 · 016#3 0/10 · 017#1 0/7 · 017#5 0/0 · 017#6 0/8 · 018#1 0/8 · 018#5 0/0 · 018#6 0/6 · 018#7 0/7 · 018#8 0/0 · 018#9 0/7 · 019#1 0/5 · 020#1 0/7 · 020#5 0/0 · 021#1 0/5 · 021#5 0/0 · 021#6 0/6 · 021#7 0/5 · **021#8 1/10** · 021#9 0/9 · 022#1 0/6 · 022#2 0/4 · 022#3 0/6 · 022#4 0/11 · 022#5 0/10 · 023#1 0/5 · 023#2 0/5 · 024#1 0/5 · 024#5 0/5 · 024#6 0/0 · 026#1 0/4 · 027#1 0/9 · 028#1 0/8 · 029#1 0/14 · 030#1 0/12 · 030#2 0/10 · 031#1 0/11 · **031#2 1/14** · 031#3 0/14 · SEED×4 0/0·0·3·7.

## 4 · CONDITIONALITY PER CANDIDATE (the OQ-S5 precondition lesson)

| Candidate input | Stored on every attempt? | Authorship |
|---|---|---|
| Accepted evidence_items keys (incl. the §1 class) | 256/260 rows store the column (4 oldest null); written UNCONDITIONALLY by every current path — empty array is a valid absence state | Keys code-VALIDATED (firewall); proposal origin LLM |
| weight_validation (rejections + sign split) | **ERA-CONDITIONAL on the stored corpus: 134/260 rows (114 non-empty)** — roughly half the historical corpus predates the plumbing; UNCONDITIONAL on the current pipeline (all four scored tracks persist it; n_a branches write `[]`) | Records code-written by the firewall |
| Stored unknowns | 256/260 rows; unconditional current | **LLM-written** (code-written on failure branches only) |
| Key sign lookup | Deterministic from the versioned registry for any stored key | Code |

**Not computable without re-running (not estimated):** what the 126 validation-less historical rows would have recorded; per-fact claimant attribution on rejected proposals (not stored anywhere today).

**Untouched by all of this, restated:** S-0's lock — doubt is advisory, blast radius bounded to narrative tone regardless of R's definition. The frozen gate is correct; nothing here proposes touching it. Axis 2 unblocked. doubt_level shape stands as PROPOSED.
