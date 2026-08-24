"use client";

import { useEffect, useRef, useState } from "react";
import { SAMPLE_CASE_ID } from "@/lib/content/sampleIdentifiers";
import { FileSearch, UserCheck, ScrollText, Check, Loader, Upload } from "lucide-react";
import { VerdictBadge } from "./verdict-badge";

const STEPS = [
  {
    icon: FileSearch,
    title: "Submit the vendor",
    body: "About two minutes — no account-setup gymnastics. You give us what you already have:",
    detail: [
      "Vendor name and website",
      "The brands you're evaluating",
      "An invoice or LOA, if you have one",
    ],
  },
  {
    icon: UserCheck,
    title: "We research, then a human reviews",
    body: "An AI pipeline works 60+ public data points across five dimensions. Then the founder reviews and approves every finding before anything ships — no black box.",
    detail: [
      "Is the supplier a real, operating wholesale business?",
      "Any observable link between supplier and brand?",
      "How does the brand actually enforce on the marketplace?",
    ],
  },
  {
    icon: ScrollText,
    title: "You get a Decision Snapshot",
    body: "A one-page answer you can act on the same day it lands:",
    detail: [
      "One of four plain-English verdicts",
      "The evidence behind it, dimension by dimension",
      "Exactly what to ask your vendor before you buy",
    ],
  },
];

const DIMENSIONS = [
  "Supplier Identity",
  "Supply Chain Relationship",
  "Brand Risk",
  "Document Review",
  "Sourcing Logic",
];

// Stage visual — crossfades between three states as the active step changes.
// Fixed height so the absolutely-positioned layers don't collapse the sticky box.
function StageVisual({ active }: { active: number }) {
  return (
    <div className="relative h-[420px] w-full">
      {/* Stage 0 — intake */}
      <div
        className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
        style={{ opacity: active === 0 ? 1 : 0 }}
        aria-hidden={active !== 0}
      >
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <p className="text-sm font-semibold text-ink">New research request</p>
          <div className="mt-5 space-y-4">
            <Field label="Vendor name" value="Northgate Wholesale Co." />
            <Field label="Brands" value="Anker, Soundcore" />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Invoice or LOA</p>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-subtle px-3 py-2.5 text-sm text-ink-2">
                <Upload size={16} aria-hidden="true" />
                northgate-invoice.pdf
              </div>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
            Submit for research
          </div>
        </div>
      </div>

      {/* Stage 1 — research underway */}
      <div
        className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
        style={{ opacity: active === 1 ? 1 : 0 }}
        aria-hidden={active !== 1}
      >
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Researching</p>
            <span className="font-mono text-xs tnum text-muted">{SAMPLE_CASE_ID}</span>
          </div>
          <ul className="mt-5 space-y-3">
            {DIMENSIONS.map((d, i) => (
              <li key={d} className="flex items-center justify-between text-sm">
                <span className="text-ink-2">{d}</span>
                {i < 3 ? (
                  <span className="inline-flex items-center gap-1.5 text-clear-ink">
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" /> Done
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Loader size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Working
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-accent-data-tint px-3 py-2.5 text-sm text-accent-data">
            <UserCheck size={16} aria-hidden="true" />
            Founder review before release
          </div>
        </div>
      </div>

      {/* Stage 2 — verdict */}
      <div
        className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
        style={{ opacity: active === 2 ? 1 : 0 }}
        aria-hidden={active !== 2}
      >
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs tnum text-muted">{SAMPLE_CASE_ID}</span>
            <span className="text-xs text-muted">Decision Snapshot</span>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">Vendor</p>
          <p className="text-lg font-semibold text-ink">Northgate Wholesale Co.</p>
          <div className="mt-4">
            <VerdictBadge verdict="conditional" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Source appears credible. Collect the listed items before you commit
            significant capital.
          </p>
          <div className="mt-4 rounded-lg border border-line bg-subtle px-4 py-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-brand-ink">
              Ask before you buy
            </p>
            <p className="text-sm text-ink-2">
              Request the distribution agreement covering this brand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink">
        {value}
      </div>
    </div>
  );
}

export function HowItWorksScroll() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.idx));
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    for (const el of refs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Sticky visual (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <StageVisual active={active} />
        </div>
      </div>

      {/* Scrolling steps */}
      <ol className="relative">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-idx={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flex min-h-[42vh] flex-col justify-start py-2 lg:min-h-[54vh]"
          >
            <div
              className="transition-opacity duration-300 motion-reduce:transition-none"
              style={{ opacity: active === i ? 1 : 0.4 }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
                  <s.icon size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="font-mono text-sm tnum text-muted">
                  0{i + 1} / 03
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-ink">{s.title}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
                {s.body}
              </p>
              <ul className="mt-4 space-y-2.5">
                {s.detail.map((d) => (
                  <li key={d} className="flex max-w-md gap-2.5 text-[15px] text-ink-2">
                    <Check size={17} strokeWidth={2.5} className="mt-1 flex-none text-brand" aria-hidden="true" />
                    <span className="leading-snug">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Inline visual on mobile */}
            <div className="mt-6 lg:hidden">
              <StageVisual active={i} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
