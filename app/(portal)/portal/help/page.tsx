import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";
import { FaqAccordion } from "@/components/portal/faq-accordion";
import {
  howItWorks,
  verdicts,
  verdictDisclaimer,
  dimensions,
  faqs,
} from "@/lib/content/help";
import { VERDICT_CLASSES } from "@/lib/design/palette";

// Verdict colour comes from the registry, never from a map written here. This one happened to be
// CORRECT — and that is the point: /how-to-read wrote the same kind of map and got three of four
// wrong. Two hand-maintained copies of the same mapping is how the wrong one goes unnoticed.
const VERDICT_CLS: Record<string, string> = Object.fromEntries(
  Object.entries(VERDICT_CLASSES).map(([key, c]) => [key, `${c.border}/30 ${c.bg}`]),
);
const VERDICT_INK: Record<string, string> = Object.fromEntries(
  Object.entries(VERDICT_CLASSES).map(([key, c]) => [key, c.ink]),
);

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="font-display text-lg font-bold tracking-tight text-ink">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function HelpPage() {
  const client = await requireOnboardedClient();
  return (
    <PortalShell client={client} active="help" title="Help Centre">
      <div className="mx-auto max-w-3xl">
        <Section title={howItWorks.title} sub={howItWorks.sub}>
          <div className="flex flex-wrap items-center gap-2">
            {howItWorks.steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink-2">
                  {s.icon} <strong className="text-ink">{s.label}</strong> {s.detail}
                </div>
                {i < howItWorks.steps.length - 1 && <span className="text-muted">→</span>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Understanding Your Verdict" sub="We deliver one of four structured verdicts. Each tells you what we observed — not what Amazon will decide.">
          <div className="grid gap-3 sm:grid-cols-2">
            {verdicts.map((v) => (
              <div key={v.key} className={`rounded-card border ${VERDICT_CLS[v.key]} p-4`}>
                <div className={`text-sm font-bold ${VERDICT_INK[v.key]}`}>{v.name}</div>
                <p className="mt-1 text-[13px] text-ink-2">{v.desc}</p>
                <div className={`mt-2 text-[13px] font-semibold ${VERDICT_INK[v.key]}`}>{v.action}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-verify-ink/40 bg-verify-bg px-4 py-3 text-[14px] text-verify-ink">
            ⚠ {verdictDisclaimer}
          </div>
        </Section>

        {/* CLAIMS FIX (founder-ruled 2026-08-14): the old sub claimed all five run on every
            plan — false on $99. Plan-neutral truth; internal "Research Dimensions" heading retired. */}
        <Section title="The Assessment Areas" sub="Which areas run depends on your plan — your report states exactly what it covered.">
          <div className="space-y-2">
            {dimensions.map((d) => (
              <div key={d.name} className="flex gap-3 rounded-card border border-line bg-surface p-4">
                <div className="text-xl" aria-hidden>{d.icon}</div>
                <div>
                  <div className="text-[14px] font-semibold text-ink">{d.name}</div>
                  <p className="mt-0.5 text-[13px] text-ink-2">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Frequently Asked Questions">
          <FaqAccordion faqs={faqs} />
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-5">
          <div>
            <div className="text-sm font-bold text-ink">Still have a question?</div>
            <div className="text-[14px] text-ink-2">We typically respond within 1 business day</div>
          </div>
          <Link
            href="/portal/support"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Submit a request
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
