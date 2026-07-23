# Banned Language Table — RECOVERED VERBATIM from HyprrIQ_ClaudeCode_Brief_v1.docx §12

**Provenance:** extracted 2026-07-23 from the founder-authored Brief v1 .docx, which is NOT
on disk in the repo. `procurementLanguage.ts`, `banned-language.test.ts` and the track-prompt
bans were BUILT TO ENFORCE THIS TABLE — until now nothing on disk could verify they enforce
all of it. This is the authoritative source. Verify the built enforcement against it.

**Scope law, verbatim from the source:**
> These banned terms appear NOWHERE in the platform — not in reports, not in emails, not in
> UI copy, not in AI prompts, not in error messages. If Claude Code generates any of these,
> it must be caught and replaced.

| NEVER Write This | Write This Instead |
|---|---|
| Safe / Unsafe | Observable indicators suggest [classification] |
| Guaranteed / Certifies / Confirms | Observable indicators are consistent with... |
| Amazon will accept / Amazon will reject | Invoice structure is consistent with / has gaps relative to standard wholesale documentation |
| Authorized (as a final conclusion) | Authorization visibility indicators observed at Level [A-E] |
| Suspension-proof / Risk-free | No elevated risk indicators observed based on available evidence |
| The supplier is legitimate | Supplier identity indicators are consistent with an operational wholesale business |
| The supplier is fake / fraudulent | Supplier identity could not be confirmed through available public sources |
| Not authorized (based on absence alone) | No authorization visibility was located during this review |
| You should buy / You should not buy | [Never include buying recommendations] |
| Ungating / Ungated / Can get you ungated | [Never use ungating language anywhere] |
| Account safety / Suspension proof | [Never reference account safety outcomes] |
| We recommend / Do not purchase | [Observable findings only — no recommendations on purchase decisions] |
| This invoice will be accepted | Invoice structure is consistent with standard wholesale documentation requirements |
| This supplier is approved | Supplier identity indicators are consistent with a legitimate wholesale operation |
| Amazon will not take action | [Never predict Amazon enforcement actions] |
| This is safe to sell | No elevated brand enforcement signals were observed based on available evidence |
---

*(Repo note, 2026-07-23 — NOT part of the verbatim Brief content above.)*

**⚠ STANDING WARNING FOR FUTURE RECOVERIES — Brief v1 §13 (Report Structure Per Plan) is built on
RETIRED pricing ($79 Starter / $197 Full Dossier / Growth $249).** If more of Brief v1 is
recovered, §13 is **HISTORICAL STRUCTURE ONLY — never a pricing source.** Docs are exempt from the
retired-pricing lock BY DESIGN (`lib/content/retiredPricing.lock.test.ts` scans live client
surfaces only), so a recovered doc is exactly how retired figures could walk back into copy.
Mark any §13 recovery with this warning on arrival. The locked model (founder-ruled, Stripe-
verified 2026-07-23): one-time $99 · $149 — monthly $279 · $499 — top-ups +3/$99 · +6/$179.

**Enforcement verification (2026-07-23, read-only):** the built scanners
(`lib/utils/banned-language.ts` two-tier + `lib/research/procurementLanguage.ts`) were verified
against this table pair-by-pair and surface-by-surface — the findings live in the tracker's
banned-language enforcement-gap item and the Category Compliance sitting record. Frozen behavior
under-enforces this table; the fix is ITS OWN GATE, not a rider on any sitting.
