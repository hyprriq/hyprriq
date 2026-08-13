import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";

// ── HOW-TO GUIDES (full-build §1, wiki.html) — SHELL ONLY by the brief's ruling: guide content
// lands with the content lane (Sanity); nothing here invents guides. The two rows that point at
// real, existing destinations link there; the launch-set guide entries render as an honest
// coming state, never as dead links pretending to be content. ──

export default async function GuidesPage() {
  const client = await requireOnboardedClient();
  return (
    <PortalShell client={client} active="guides" title="How-to Guides">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Get more from every report</h2>
        <p className="mt-1 text-sm text-ink-2">
          Short, practical guides. This section will grow — the entries below are the launch set.
        </p>

        <div className="mt-6 overflow-hidden rounded-card border border-line bg-surface">
          <Link href="/portal/help" className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 hover:bg-subtle">
            <div>
              <div className="text-[14px] font-semibold text-ink">How to read your report</div>
              <div className="text-[13px] text-muted">The verdict scale, the five areas, and what &ldquo;could not confirm&rdquo; means</div>
            </div>
            <span className="text-muted" aria-hidden>›</span>
          </Link>
          <Link href="/portal/submit" className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 hover:bg-subtle">
            <div>
              <div className="text-[14px] font-semibold text-ink">Submitting a strong case</div>
              <div className="text-[13px] text-muted">What to include so research has the most to work with</div>
            </div>
            <span className="text-muted" aria-hidden>›</span>
          </Link>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div>
              <div className="text-[14px] font-semibold text-ink-2">Working the verification checklist</div>
              <div className="text-[13px] text-muted">Turning the report&rsquo;s questions into supplier answers</div>
            </div>
            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">Coming soon</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <div className="text-[14px] font-semibold text-ink-2">What the five assessment areas cover</div>
              <div className="text-[13px] text-muted">Supplier Legitimacy · Supply-Chain Relationship · Brand Risk · Documentation Review · Sourcing Logic</div>
            </div>
            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">Coming soon</span>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
