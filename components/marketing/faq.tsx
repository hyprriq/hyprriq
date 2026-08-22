import { Plus } from "lucide-react";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

// Native <details> disclosure — keyboard-accessible, works without JS, and the
// Q&A text is crawlable for SEO (paired with FAQPage JSON-LD on the page).
export const FAQ_ITEMS = [
  {
    q: "Does HyprrIQ guarantee my supplier is safe?",
    a: "No — and we never will. Authorization and authenticity can't be confirmed from the outside, so anyone promising “safe” is guessing. We report what's observable, tell you plainly what we couldn't confirm, and give you the questions to verify it yourself before you buy.",
  },
  {
    q: "Will a report protect my Amazon account?",
    a: "A report can't undo a suspension or stop an enforcement action. What it does is surface the risk signals before you commit capital, so you can make an informed decision instead of finding out after the inventory is yours.",
  },
  {
    q: "What exactly do I get?",
    // "across five assessment areas" was plan-dependent ($99 runs three) — plan-neutral per the
    // 2026-08-14 area-claims ruling; the try-first answer below still names the exact tier split.
    a: "A one-page Decision Snapshot with one of four plain-English verdicts, the evidence behind it across the assessment areas your plan includes, and a checklist of what to ask your vendor. Full reports include the detailed findings.",
  },
  {
    q: "How do credits work?",
    // "Busy month? Add a top-up pack anytime." removed (founder-ruled 2026-08-22, item 2):
    // top-ups are not for sale at launch — no client-facing surface describes them.
    a: "One credit = one report — one supplier, up to your plan's brand limit, across the assessment areas your plan includes. Subscriptions include a set number of credits each month, and unused credits roll over up to your plan's limit. A single report is just one credit's worth, bought on its own.",
  },
  {
    q: "How long does a report take?",
    a: `Within ${CASE_SLA_HOURS} hours on every plan. Every report is reviewed and approved by the founder before it reaches you.`,
  },
  {
    q: "Is this just an AI tool?",
    a: "No. An AI pipeline does the heavy research across 60+ data points, but a human reviews and approves every finding. You're not reading raw model output.",
  },
  {
    q: "Can I try it before subscribing?",
    a: "Yes. Buy a Single Report for $99, or the Single Deep Report for $149 with all five assessment areas, to see the depth before committing to a monthly plan.",
  },
];

export function FAQ() {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-line">
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus
              size={20}
              className="flex-none text-muted transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <p className="pb-4 text-[15px] leading-relaxed text-ink-2">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
