import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";
import { checklistGuide } from "@/lib/content/guides";

// ── GUIDE 3 (founder-directed 2026-09-07). Prose lives in lib/content/guides.ts (the help-page
// pattern: content module + thin page), inside BL6's scan surface and guides.test.ts's own-voice
// gate lock. Heading rung: 18px (text-lg) per the 2026-09-01 sibling-page ruling — the page title
// above it is AppHeader's 24px. ──

export default async function ChecklistGuidePage() {
  const client = await requireOnboardedClient();
  return (
    <PortalShell client={client} active="guides" title="How-to Guides">
      <div className="mx-auto max-w-2xl">
        <Link href="/portal/guides" className="text-[13px] font-semibold text-brand hover:text-brand-hover">
          ← All guides
        </Link>
        <h2 className="mt-3 font-display text-lg font-bold tracking-tight text-ink">{checklistGuide.title}</h2>
        <p className="mt-1 text-sm text-ink-2">{checklistGuide.sub}</p>
        <p className="mt-4 max-w-[68ch] font-reading text-[14.5px] leading-[1.7] text-ink-2">{checklistGuide.intro}</p>

        {checklistGuide.sections.map((s) => (
          <section key={s.heading} className="mt-7">
            <h3 className="text-[15px] font-semibold text-ink">{s.heading}</h3>
            {s.paras.map((p, i) => (
              <p key={i} className="mt-2.5 max-w-[68ch] font-reading text-[14.5px] leading-[1.7] text-ink-2">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-2.5 max-w-[68ch] space-y-2.5">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 font-reading text-[14.5px] leading-[1.7] text-ink-2">
                    <span className="text-muted" aria-hidden>•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-5">
          <div>
            <div className="text-sm font-bold text-ink">Ready to work a checklist?</div>
            <div className="text-[14px] text-ink-2">Open a delivered report and switch to its Checklist tab.</div>
          </div>
          <Link
            href="/portal/cases"
            className="min-h-11 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Your cases
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
