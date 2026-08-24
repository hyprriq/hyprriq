// ── /faq — the questions, grouped ─────────────────────────────────────────────────────────────
//
// FAQPage SCHEMA IS EMITTED ON THIS PAGE AND NOWHERE ELSE (SEO ruling in the dev brief): marking
// every FAQ-shaped block on the site puts our own pages in competition for the same question
// entities. /pricing has its own pre-purchase questions and deliberately carries NO schema.
//
// ⛔ CLIENT-FACING COPY. Several answers here are REFUSALS — "no, and we will not imply otherwise"
// — which is the point of the section they sit in. See the pending-refusal note in
// clientCopy.bannedLanguage.lock.test.ts for the scanner's blind spot on that class.

import { AREAS } from "@/lib/content/whatWeCheck";

export type FaqItem = { q: string; a: string };
export type FaqGroup = { heading: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "What you get",
    items: [
      {
        q: "What exactly do I receive?",
        a: "One verdict — Source Clear, Usable With Conditions, Verify Before Purchase, or Do Not Rely. With it, the findings and every source behind them, each marked Verified or Assessed. Then what we could not confirm, and a set of questions written for your specific supplier that you can send as they are.",
      },
      {
        // Founder ruling 2026-08-24: name them. Derived from the same registry the pricing page and
        // the homepage rail read, so the list cannot drift from the ladder or from the report.
        q: `What are the ${AREAS.length} assessment areas?`,
        a: `${AREAS.map((a) => a.name).join(", ")}. Each one states what it examines, what lands in your report, and what it cannot conclude — set out in full on the "what we check" page.`,
      },
      {
        q: "How long does it take?",
        a: "24 hours, on every plan. That is not a premium tier or an upgrade — it is the delivery commitment on a single report and on a monthly plan equally.",
      },
      {
        q: "How do I know two reports are consistent?",
        a: "Because the questions do not change. The same five areas, in the same order, to the same evidence standards, whoever the supplier is. Two reports on the same evidence reach the same verdict.",
      },
      {
        q: "Why a verdict rather than a score?",
        a: "A number invites you to argue with it. A verdict tells you what to do next. The four levels are written out in full so they read the same to everyone, and there is no score behind them to reverse-engineer.",
      },
      {
        q: 'What do "Verified" and "Assessed" mean?',
        a: "Verified means an independent source — not the supplier — confirmed it. Assessed means it is a reading of the evidence available, and the report states what that evidence was. There is no third level. Anything we could not establish goes under what we could not confirm.",
      },
    ],
  },
  {
    heading: "What it can't do",
    items: [
      {
        q: "Can you tell me if a supplier is authorized by the brand?",
        a: "No. A distribution agreement is a private contract. It sits between the brand and the distributor, it is not filed publicly, and nobody outside those two companies can confirm what it says. The report states what could be seen from outside, records a claim as a claim, and gives you the questions that get proof.",
      },
      {
        q: "Will this get me ungated?",
        a: "No, and we will not imply otherwise. Gating decisions belong to the marketplace, they happen after you buy, and there is no pre-approval process for anyone. We can tell you which fields in your paperwork would need correcting. We cannot affect the decision.",
      },
      {
        q: "Will this keep my Amazon account safe?",
        a: "No. A brand can raise a complaint against a seller buying from an entirely legitimate source. Good paperwork does not prevent enforcement. In the report those two risks stay apart, so a clean document review never reads as cover for the other one.",
      },
      {
        q: "If you can't confirm something, does that mean the supplier is dodgy?",
        a: "No, and this matters. A gap in evidence is a gap in evidence. Plenty of legitimate suppliers cannot be corroborated, usually because the brand they work with does not discuss distribution with third parties. The report tells you what is missing so you can ask for it. It does not tell you what the absence means.",
      },
      {
        q: "Do you help with suspensions or appeals?",
        a: "No. We do not write appeals or plans of action, we do not review suspensions, and we are not lawyers. If that is what you need, get a specialist. HyprrIQ assesses suppliers before a purchase.",
      },
    ],
  },
  {
    heading: "How it works",
    items: [
      {
        q: "What do you need from me?",
        a: "The supplier's name and website is enough to start. Brand names sharpen the Brand Risk area. A document — an invoice or a quote — makes Documentation Review possible.",
      },
      {
        q: "Can you assess a supplier outside the US?",
        a: "Yes. Suppliers can be anywhere in the world, and often that is the point. It is our clients who need to be US-based at launch.",
      },
      {
        q: "Do you contact my supplier?",
        a: "No. We do not contact them and we do not tell them you asked. A supplier assessment is not something the supplier knows about.",
      },
      {
        q: "What if the report comes back clean?",
        a: "Then you have bought certainty on a decision you were unsure about, which is what you paid for. A clean verdict still lists what could not be confirmed, so you know where the remaining risk sits.",
      },
    ],
  },
  {
    heading: "Practical",
    items: [
      {
        q: "Who can buy?",
        a: "US-based clients at launch. Two plans are on sale — a single report and Growth, monthly. Two further plans are on the roadmap and carry no buy action until they are ready.",
      },
      {
        q: "What happens to my data?",
        a: "Your cases are separated from every other client's at the database level, uploaded files are scanned, and only the people producing and reviewing your report can see it. We do not sell your data and we do not tell suppliers they were checked.",
      },
    ],
  },
];

export const FAQ_FLAT: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items);
