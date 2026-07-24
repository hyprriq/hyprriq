# Verdict Gate System — RECOVERED VERBATIM (Brief v1 §9)

**Provenance:** extracted 2026-07-23 from HyprrIQ_ClaudeCode_Brief_v1.docx, NOT on disk in the
repo. This section governs BUILT, FROZEN behavior that nothing on disk could previously verify.
Verify the built implementation against it; do not change frozen code without a gate.

9. Verdict Gate System — All 4 Verdicts
The verdict is ALWAYS assigned by the founder. The AI suggests. The founder decides.
Use the gate table below as a guide. When evidence is mixed, use judgment.
When in doubt, use the more conservative verdict. Clients can always be upgraded — never downgraded after report delivery.
Track
Source Clear
Usable With Conditions
Verify Before Purchase
Do Not Rely
Track 1 — Vendor
Verified presence — multiple independent sources confirm legitimate wholesale operation
Credible but minor gaps — most checks pass, 1-2 minor gaps
Limited visibility — only 2-3 checks pass, significant gaps
Cannot be confirmed — vendor identity unverifiable or critical red flags
Track 2 — Authorization
Level A or Level B — direct brand visibility or valid LOA
Level C — commercial distribution visibility
Level D — vendor claim only, no independent verification
Level E — no visibility or conflicting evidence / refused to answer
Track 3 — Brand
Reseller-friendly — no restrictions, no enforcement signals
Controlled distribution — some signals but tolerated resale
Marketplace-controlled — own storefront, declining sellers, tight control
Aggressive enforcement — documented IP complaints, active enforcement
Track 4 — Document
Ready — all or nearly all fields pass, no high-impact flags
Needs correction — 1-3 fixable gaps, correction list provided
Significant gaps — 4+ gaps or high-impact flags present
Escalate — formatting anomalies, retail receipt, or manipulation signals
Track 5 — Scenario
Makes commercial sense — all tracks coherent, no contradictions
Minor gaps noted — mostly coherent with 1-2 explainable gaps
Logical contradictions — scenario does not fully add up
Critical category risk or serious contradictions across multiple tracks
9.1 Verdict Definitions — Plain Language
Verdict Label
What It Means
Client Instruction
SOURCE CLEAR
Supplier, brand environment, and documents are all consistent with credible wholesale sourcing based on observable evidence. No significant gaps identified.
Proceed with standard due diligence. Monitor brand environment quarterly.
USABLE WITH CONDITIONS
Source appears credible but specific items are missing or need verification. Not a red flag — a checklist.
Collect the listed items before committing significant capital. Test order acceptable.
VERIFY BEFORE PURCHASE
Important evidence is missing or unclear. Do not proceed past a test order until listed items are confirmed.
Do not place large order. Resolve listed items first. Re-submit for updated review if needed.
DO NOT RELY ON THIS SOURCE
Serious gaps, contradictions, or warning signals identified. Cannot support relying on this source with available evidence.
Do not proceed with this source until the specific issues listed are resolved. Seek alternative suppliers.
---

*(Repo note, 2026-07-23 — NOT part of the verbatim Brief content. Verification of built behavior
against this table; read-only, nothing changed. §13 warning carried: recovered docs are exempt
from the retired-pricing lock — historical structure only, never a pricing source.)*

**⚠ READ §9's AUTHORITY CLAIM THROUGH ADR-G004 — THE SUPERSESSION IS EXPLICIT, NOT ASSUMED.**
Checked against `Docs/hyprriq_intelligence_engine_master.md` (ADR-G004 + G2 Addendum, merged):
G004 states verbatim that "The AI produces all findings, signals, and the suggested verdict," the
reviewer's role is "Confirm or change verdict — accept AI suggestion or apply judgment," and
"Calculate the verdict (engine has done this)" is listed under what the reviewer does NOT do —
with overrides requiring a written reason. The built review route implements exactly that
(override action + required reason). So §9's "the founder ALWAYS assigns" is the PRE-ENGINE form;
ADR-G004 is the evolved form of the same principle — founder authority preserved at
confirm/override/approve, computation moved to deterministic code. **On the record, not a
documentation gap.** §9's conservative-when-in-doubt law survives as the verdict ceiling +
documentation-no-override compositions.

**Per-track gate columns vs the built engine:**
- **Track 1 — consistent in evolved form.** Prose gates → signal derivation from validated weight
  keys; "cannot be confirmed"→DNR = Track-1 hard-fail veto; "significant gaps"→VBP = soft-fail
  floor. Finer-grained, same outcomes.
- **Track 2 — the A–E levels LIVE, but as ADVISORY, not as the gate.** `auth_level: "A".."E"` is
  stored per attempt (contracts.ts:220), admin-visible, client-excluded. §9 maps levels directly
  to verdicts (A/B→SC · C→UWC · D→VBP · E→DNR); built code lets validated weight keys and signals
  decide, with the level as the analyst reading. DIVERGENCE BY DESIGN — the direct mapping was
  never wired; the level informs, weights decide. No record found ruling this explicitly — noted.
- **Track 3 — consistent vocabulary, weights-mediated.** The four postures survive as weight-key
  vocabulary (reseller_friendly, enforcement/gating/MAP keys); the direct posture→verdict mapping
  is mediated by g003-1.1.0 points/vetoes.
- **Track 4 — ✅ consistent.** The v2.1 signal map (ready→pass · minor→infer · significant→
  flag/soft_fail · manipulation→hard_fail) matches the built prompt + veto keys.
- **Track 5 — EXPLICITLY SUPERSEDED.** §9 gives Track 5 a verdict gate column; v2.1 (on disk,
  line ~190) moved Track 5's output to feed Synthesis Module 4 "rather than directly into the
  verdict," and the built track NEVER votes (structural non-voting branch; AT-B1 byte-identical
  proof). Note the DNR cell: "Critical category risk" — the category capability's third
  appearance in Brief v1, now owned by the Category Compliance spec.
- **§9.1 client instructions — CLIENT-SURFACE GATE MATERIAL, with a conflict to rule.** The
  brief's own client instructions are recommendation-shaped ("Do not place large order",
  "Proceed with standard due diligence") — language the later procurement-language law exists to
  keep out of track findings. Whether verdict-level client instructions are exempt (the verdict
  IS the product's conclusion) or must be rephrased is a client-surface-gate ruling. Flagged,
  not resolved.
