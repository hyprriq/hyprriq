# Ten Auto-Escalation Triggers — RECOVERED VERBATIM (Brief v1 §4)

**Provenance:** extracted 2026-07-23 from HyprrIQ_ClaudeCode_Brief_v1.docx, NOT on disk in the
repo. This section governs BUILT, FROZEN behavior that nothing on disk could previously verify.
Verify the built implementation against it; do not change frozen code without a gate.

4. Ten Auto-Escalation Triggers
These triggers are checked at Track 0 and throughout the research pipeline. When any trigger fires, the case status changes and specific admin actions are required. The system MUST enforce these — they protect the business.
#
Trigger Condition
Case Status Set To
System Action
Admin Action Required
What NOT To Do
1
OCR fails — scanned image, unreadable, handwritten, or password protected
manual_review_required
Email client: 'We need a clearer version of your document to proceed.'
Manual OCR extraction or request resubmission from client
Do not proceed with research on unreadable document
2
Retail receipt or marketplace order detected in document
escalated
Email client immediately. Do not run document review.
Contact client to explain why retail receipts cannot be used for wholesale documentation
Do not issue any report. Do not call supplier fraudulent.
3
Task count exceeds plan credit limit
paused_scope_confirmation_required
Email client with scope breakdown. Show what is covered vs what exceeds plan.
Wait for client to confirm reduced scope or upgrade. SLA clock paused.
Do not start research on out-of-scope tasks
4
Brand or vendor cannot be found online at all
manual_review_required
Admin email alert with vendor name and case ID
Manual web search. Absence is not fraud — must state as uncertainty only.
Do not call vendor fake based on absence alone
5
AI confidence is Low on 3 or more tracks
manual_review_required
Flag all low-confidence tracks in admin dashboard with yellow indicators
Founder review of all low-confidence tracks before any report generated
Do not deliver report with 3+ low-confidence tracks without founder review
6
Regulated category detected and policy is unclear
manual_review_required
Flag category in admin dashboard. Tag which category triggered.
Current policy lookup by founder. Research the specific Amazon requirement before noting.
Do not state category requirements as absolute — use 'may require' language
7
Policy or catalog is behind login barrier
partial — limitation noted
Log limitation in track findings. Note source and what could not be verified.
Ask client: do you have portal access? If yes, request screenshot for manual review.
Do not claim to have read content behind a login. Never.
8
Document formatting anomalies detected
manual_review_required
Flag F14 in Track 4 findings. Email admin alert.
Manual inspection of document by founder. Look at the actual file — not just OCR text.
Do not accuse the client of document manipulation. Do not issue report with F14 flagged without founder review.
9
Client notes mention IP notice, legal issue, or active Amazon complaint
manual_review_required
Tag case as legal_flag. Email admin alert immediately.
No legal advice given. Manual review. Escalate to founder before any response.
Do not give legal advice. Do not comment on the specific legal matter.
10
Claude API or Serper API fails or times out (3 retries exhausted)
manual_research_required
All failed tracks set to red in admin dashboard. Email admin urgent alert.
Manual research mode activated. Founder researches failed tracks using web search.
Do not deliver an incomplete report. All tracks must be completed — AI or manual.
---

*(Repo note, 2026-07-23 — NOT part of the verbatim Brief content. Verification of built behavior
against this table; read-only, nothing changed. §13 warning carried: recovered docs are exempt
from the retired-pricing lock — historical structure only, never a pricing source.)*

**FIRST: the brief's case statuses were SYSTEMATICALLY SUPERSEDED.** `manual_review_required`,
`escalated`, `paused_scope_confirmation_required`, `partial`, `manual_research_required` do NOT
exist in the built `cases.status` enum (initial_schema.sql:  pending_intake → … → awaiting_review
→ … → delivered). The built system moved escalation from CASE status to TRACK-level flags
(`case_track_results.manual_review_required` + reason; `track_0_status` carries paused/escalated)
plus the UNIVERSAL founder gate: every case stops at `awaiting_review` — no report exists without
founder review, which structurally subsumes several triggers' intent. Judge each trigger against
that shape, not the literal status names.

**Trigger-by-trigger (built vs specced):**
1. **OCR fails — PARTIAL.** Unreadable/image-only docs are handled honestly (documentPack OQ-A1:
   reported unreadable, never a source, never scored) but there is NO automated client email
   ("we need a clearer version"). Honest-handling ✅, client-notification flow ✗.
2. **Retail receipt — BUILT DIFFERENTLY.** `retail_receipt_as_wholesale` is a 0-point hard-fail
   VETO (consensus-gated, weights.ts:73) — the review RUNS and a report issues with the veto
   verdict, vs the brief's "do not run document review, do not issue any report, email client."
   "Do not call supplier fraudulent" ✅ (the veto targets the document, not the vendor).
3. **Scope exceeds credits — NOT FOUND as specced.** No pause/scope-confirmation mechanic; credits
   are enforced at submission. The `awaiting_client` status exists but no scope-breakdown flow.
4. **Vendor not found — ✅ CONFIRMED, and it is the platform's core law.** Track 0.5 resolution
   (identity_unconfirmed, SB-2 conflict⇒escalate), acquisition-failure guard → track-level
   manual review with "could not research" language; absence≠fraud is a standing law across
   prompts, client copy states OUR limitation. The WHAT-NOT-TO-DO column is honored everywhere.
5. **3+ low-confidence tracks — SUBSUMED, no counter.** `finding_certainty` exists per track and
   EVERY case gets founder review (universal awaiting_review) — but no specific 3+-low counter or
   yellow-flag rule exists. The universal gate covers the intent; the specific trigger is unbuilt.
6. **Regulated category — ✗ NOT IMPLEMENTED.** The category-flags casualty, third appearance
   (with Brief §8 and Track 5's gate column). Now owned by the Category Compliance spec
   (2026-07-23); its "may require" law survived into the recovered §8 table's governing law.
7. **Login barrier — BUILT DIFFERENTLY.** Acquisition only cites fetched sources (citation locks
   make claiming-to-have-read structurally impossible ✅); limitations ride unknowns/notes. The
   "ask client for portal screenshot" flow does not exist.
8. **Formatting anomalies — ✅ in evolved form.** Track 4 manipulation detection
   (`document_alteration` hard-fail, consensus-gated) + universal founder review; never accuses
   the client (language law).
9. **Legal/IP notice in client notes — ✗ GAP.** No `legal_flag` mechanism exists anywhere (swept:
   zero hits). Client notes ARE shown on the admin review screen, but nothing detects/tags/alerts
   on legal content. The founder sees the notes only if he reads them.
10. **API failure — ✅ in evolved form.** H2/H3: failed acquisition/LLM → track-level manual
    review + reason, watchdog admin alerts, failed tracks n_a never scored, no auto-delivery past
    the universal gate. Manual-research mode = the founder's review-screen override path.

**Net: 3 confirmed (4, 8, 10) · 3 built-differently (1, 2, 7) · 2 subsumed/partial (3, 5) ·
2 gaps (6 → Category Compliance spec owns it · 9 → NEW: no legal-flag detection).** Trigger 9 is
the one finding with no existing owner — logged in the tracker.
