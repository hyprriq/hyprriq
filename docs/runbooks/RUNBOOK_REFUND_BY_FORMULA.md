# Runbook — refunds by the locked formula

**Who runs this:** the founder, by hand. There is deliberately NO refund code in the app — money
moves only in the Stripe dashboard (STOP-3). **The commitment (published):** Refund Policy §2 —
reply within 2 business days; refund = **paid − (reports used × deduction)**, never below zero,
where **deduction = plan price ÷ plan credits × 0.70**, rounded to the nearest cent **only at the
final step**. The formula is founder-locked; the policy page derives its table live from
`lib/constants/plans.ts`, so the page is always the current numbers — check it, don't memorize.

## 1 — Classify the request first

| Situation | What happens |
|---|---|
| Within 14 days of the charge | The formula below |
| We accepted a case and never delivered | **Full refund, no window, no deduction** (§3) |
| They disagree with a verdict | **Not a refund ground** (§4) — point them at their change request (one per report, 7 days) |
| Past 14 days, delivered fine | No refund (§2) — say so plainly, offer nothing vague |

The 14-day clock runs from the **charge date on the Stripe payment**, not from today's email.

## 2 — Count "reports used"

Reports used = cases that consumed a credit from that purchase and kept it (a case whose research
could not start returned its credit automatically and does not count).

```sql
select case_number, status, created_at from cases
 where client_id = '<CLIENT_ID>' and deleted_at is null
   and created_at >= '<CHARGE_DATE>'
 order by created_at;
```

Count the rows that went through (anything that held its credit — delivered or still in flight).
Cross-check against `clients.credits_used_this_cycle` on the admin client page; if the two
disagree, the case list is the ground truth — read it row by row and understand why before
computing anything.

## 3 — Compute

- deduction = plan price ÷ plan credits × 0.70 — **keep full precision here**
- refund = paid − (used × deduction) — **round to cents only now**; floor at $0

The locked worked example (also printed in the policy): Growth $279, 1 used →
279 ÷ 5 × 0.70 = 39.06 → 279 − 39.06 = **$239.94**.

Write the arithmetic into your reply email — the client should see the same numbers the policy
shows.

## 4 — Move the money (Stripe dashboard only)

Stripe → Payments → the charge → **Refund**, enter the computed amount (partial refunds are fine).
Put the arithmetic in the refund's note/reason field. Stripe emails them a receipt; the policy
promise is 5–10 business days to land, bank-dependent.

## 5 — Fix the credits (the four locked rules, migration 20260812)

- **Refunding UNUSED credits** (rule c): remove them from the balance — admin client page →
  credit adjustment, **negative delta**, reason "refund <invoice/payment id>". This uses
  `adjust_client_credits` (balance only, never touches usage) and audits itself.
- **Refund involving a DELIVERED report** (rule d): **money only** — the credit stays consumed,
  usage stays counted, they keep the report. Touch nothing in the app.

## 6 — Read-backs (prove it happened)

1. Stripe: the payment shows the refund, correct amount, status Succeeded.
2. If credits were clawed back: admin client page shows the new balance, and

   ```sql
   select event, notes, created_at from billing_audit
    where client_id = '<CLIENT_ID>' order by created_at desc limit 5;
   ```

   shows the adjustment row with your reason.
3. Your reply email went out with the arithmetic, within 2 business days of their ask.

## Never

- Never refund by any route except the Stripe dashboard.
- Never use the credit **deduct** path for a refund adjustment (it inflates usage — the exact
  defect rule (b) exists to prevent).
- Never round mid-calculation; the cent-rounding happens once, at the end.
- Never improvise a different deduction "to be nice" — a discount is your call, but record it as
  what it is in the note, not as the formula.
