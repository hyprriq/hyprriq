# ADR-T1-001 — Corroboration gate for the fraud hard-fail key + collision-class audit

**Status:** Accepted (2026-07-03) · **Scope:** Track 1 (Supplier Identity) firewall + prompt · **Fix commit:** `ef76964`

## Context
The MotoTec USA case produced a **false hard-fail**: `scam_reports_corroborated` (a fraud veto) validated from a single low-authority source (one Facebook post, about a third-party reseller), despite the LLM's own narrative saying there was no vendor fraud.

**Root cause — a structural collision class.** The firewall validates a proposed weight_key on grounding / registry / track / provenance (source *profile*) / authority / contradiction. It never reads source *content*, never checks the subject (vendor vs a third party), and (before this fix) never required corroboration. So when a veto key shares **identical `ALLOWED_PROFILES` AND identical `MIN_AUTHORITY`** with a benign lower-weight key, and the two are **not** separated by an alternative group, the firewall cannot distinguish them — the LLM's classification is the *only* separator, and a single mis-map into the veto key triggers an irreversible hard-fail.

## Decision (fix — defense-in-depth, both strictly more conservative)
1. **Firewall corroboration gate** (`VALIDATION_VERSION` 1.1.0 → **1.2.0**): `scam_reports_corroborated` requires **≥2 DISTINCT valid cited sources** (`CORROBORATION_REQUIRED`). Single-source / same-source-twice → rejected with the new `corroboration` gate. Benign `negative_reputation` (single-source) unaffected. Cannot create a false PASS.
2. **Track 1 prompt** — explicit FRAUD vs REPUTATION rule: the fraud key only for ≥2 independent reports of fraud **by the vendor itself**; operational/reputational complaints → `negative_reputation`; reseller-scoped / non-vendor scams → not proposed (UNKNOWN when unsure).
3. **Positive-path lock** — a unit test asserts a genuine fraud vendor (2 corroborating sources) STILL validates `scam_reports_corroborated` AND still hard-fails, so the conservative gate can't silently start over-rejecting.

## Collision-class audit (live firewall config — Track 1 + Track 2 keys)
Every veto/hard-fail key that shares identical `ALLOWED_PROFILES` **and** identical `MIN_AUTHORITY` with a lower-weight key and is **not** alternative-grouped:

| Hard-fail key | Collides with (benign) | Shared config | Status |
|---|---|---|---|
| `scam_reports_corroborated` | `negative_reputation` | `{forum,social,news,marketplace}` · `low` | **Mitigated** (corroboration gate) |
| `registration_fabricated` | `government_registration` | `{government_record,registry}` · `high` | **Known sibling — NOT gated** (see below) |

- `address_fraudulent`, `website_fraudulent`, `counterfeit_channel`, `conflicting_authorization`: **no exact collision** (their `ALLOWED_PROFILES`/`MIN_AUTHORITY` differ from every benign key).
- **`registration_fabricated` assessment:** structurally the same collision, but its sources are **high-authority** (`government_record`/`registry`, `MIN_AUTHORITY="high"`), so a single authoritative record can be legitimate strong fraud evidence — a ≥2 corroboration gate would risk **over-rejecting** a valid single-source finding. Mis-map risk is materially lower than the low-authority social/forum scam case. **Not gated pending founder decision;** if hardened, the appropriate lever is the prompt (distinguish "fabricated" from "legitimate registration"), not corroboration.
- **Forward note (Tracks 3/4):** `b2b_only_confirmed`, `active_ip_complaints`, `confirmed_amazon_restrictions`, `cease_and_desist_distributed`, `document_alteration`, `retail_receipt_as_wholesale` are hard-fails with **no firewall config yet** (Tracks 3/4 unbuilt → currently provenance-rejected). **This same collision audit MUST run on their `ALLOWED_PROFILES`/`MIN_AUTHORITY` before those tracks freeze.**

## Known residual seam (conscious acceptance, not an omission)
**2+ *reseller-scoped* (or otherwise non-vendor) scam reports that the LLM mis-attributes to the vendor itself would pass the corroboration gate** — at that point the **FRAUD-vs-REPUTATION prompt rule is the only remaining guard.** This cannot be closed deterministically without the firewall reading source *content* (subject/semantics), which is outside its design (it validates provenance/authority, not meaning). Accepted residual risk; documented here so it is a conscious trade-off. Mitigations if it recurs: sharpen the prompt further, or add a subject-scope signal (e.g., require a cited scam source's host to relate to the vendor) as a future firewall enhancement.
