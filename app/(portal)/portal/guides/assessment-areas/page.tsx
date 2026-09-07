import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { AREA_NAMES } from "@/lib/content/reportCopy";
import { areasGuide, areaGuideEntries } from "@/lib/content/guides";

// ── GUIDE 4 (founder-directed 2026-09-07). THE AREAS RENDER FROM THE REGISTRY: the loop below is
// ASSESSMENT_AREA_KEYS (lib/constants/tracks.ts) with AREA_NAMES (reportCopy.ts) — this page can
// never list an area the product definition does not, nor miss one it does (guides.test.ts locks
// the entries to the keys in both directions). Prose lives in lib/content/guides.ts. ──

export default async function AssessmentAreasGuidePage() {
  const client = await requireOnboardedClient();
  return (
    <PortalShell client={client} active="guides" title="How-to Guides">
      <div className="mx-auto max-w-2xl">
        <Link href="/portal/guides" className="text-[13px] font-semibold text-brand hover:text-brand-hover">
          ← All guides
        </Link>
        <h2 className="mt-3 font-display text-lg font-bold tracking-tight text-ink">{areasGuide.title}</h2>
        <p className="mt-1 text-sm text-ink-2">{areasGuide.sub}</p>
        <p className="mt-4 max-w-[68ch] font-reading text-[14.5px] leading-[1.7] text-ink-2">{areasGuide.intro}</p>

        <div className="mt-6 space-y-4">
          {ASSESSMENT_AREA_KEYS.map((key) => {
            const entry = areaGuideEntries[key];
            if (!entry) return null; // impossible while guides.test.ts holds; render nothing rather than a hole
            return (
              <section key={key} className="rounded-card border border-line bg-surface p-5">
                <h3 className="text-[15px] font-semibold text-ink">{AREA_NAMES[key] ?? key}</h3>
                <div className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">{areasGuide.examinesLabel}</div>
                <p className="mt-1 max-w-[68ch] font-reading text-[14px] leading-[1.7] text-ink-2">{entry.examines}</p>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted">{areasGuide.limitLabel}</div>
                <p className="mt-1 max-w-[68ch] font-reading text-[14px] leading-[1.7] text-ink-2">{entry.limit}</p>
              </section>
            );
          })}
        </div>

        <section className="mt-8">
          <h3 className="text-[15px] font-semibold text-ink">{areasGuide.closing.heading}</h3>
          {areasGuide.closing.paras.map((p, i) => (
            <p key={i} className="mt-2.5 max-w-[68ch] font-reading text-[14.5px] leading-[1.7] text-ink-2">{p}</p>
          ))}
        </section>
      </div>
    </PortalShell>
  );
}
