"use client";

import { useEffect, useRef } from "react";

// The seller-count graph from hyprriq_flow_v2.html §4 — the shape the product was built to read.
//
// IT IS LABELLED AN ILLUSTRATION, TWICE, because it is one. A chart that looks like real listing
// data on a page arguing for evidentiary rigour would be the exact failure the rest of the site
// refuses. The line is drawn from a fixed path, not from a case.
//
// ACCESSIBILITY: the SVG carries role="img" with a description of the shape, and a text version of
// the reading sits below it and BECOMES VISIBLE on phones, where the graph itself is hidden — the
// spec drops the chart under 700px and would otherwise drop the point with it.
//
// MOTION: the line draws itself once on entry. Under prefers-reduced-motion it is simply already
// drawn — the static state is the complete state, never a broken one.

export function TrendGraph() {
  const ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          p.style.transition = "stroke-dashoffset 1.5s var(--ease-entrance)";
          p.style.strokeDashoffset = "0";
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(p);
    return () => io.disconnect();
  }, []);

  return (
    <div className="rounded-card-lg border border-line bg-surface p-4 sm:p-[30px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[16px] text-ink sm:text-[17.5px]">One brand, twelve months</h3>
          <p className="mt-1 text-[13.5px] text-muted sm:text-[14.5px]">
            Third-party sellers on one listing — an example
          </p>
        </div>
        <span className="rounded-chip border border-deny-ink/30 bg-deny-bg px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-deny-ink">
          Example pattern
        </span>
      </div>

      <svg
        viewBox="0 0 900 250"
        className="mt-4 hidden h-auto w-full sm:block"
        role="img"
        aria-label="Seller count holds near 38 for eight months, then falls sharply to 4 over about eleven weeks."
      >
        <g stroke="var(--color-line)" strokeWidth="1">
          <line x1="52" y1="28" x2="880" y2="28" />
          <line x1="52" y1="82" x2="880" y2="82" />
          <line x1="52" y1="136" x2="880" y2="136" />
          <line x1="52" y1="190" x2="880" y2="190" />
          <line x1="52" y1="212" x2="880" y2="212" />
        </g>
        <g fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-muted)">
          <text x="14" y="32">40</text>
          <text x="14" y="86">30</text>
          <text x="14" y="140">20</text>
          <text x="14" y="194">10</text>
          <text x="20" y="216">0</text>
        </g>
        <path
          ref={ref}
          d="M52,50 L150,44 L248,56 L346,42 L444,48 L516,52 L540,144 L564,174 L644,182 L744,188 L880,191"
          fill="none"
          stroke="var(--color-deny-ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1="528" y1="22" x2="528" y2="212"
          stroke="var(--color-deny-ink)" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.5"
        />
        <rect x="540" y="20" width="216" height="23" rx="4" fill="var(--color-deny-bg)" stroke="var(--color-deny-ink)" strokeOpacity="0.3" />
        <text x="550" y="36" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-deny-ink)">
          SOMETHING HAPPENED HERE
        </text>
        <g fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-muted)">
          <text x="52" y="238">Sep</text>
          <text x="248" y="238">Dec</text>
          <text x="444" y="238">Mar</text>
          <text x="644" y="238">Jun</text>
          <text x="846" y="238">Sep</text>
        </g>
      </svg>

      {/* The reading, in words. Visible on phones where the chart is not. */}
      <p className="mt-3.5 text-[15px] leading-relaxed text-ink-2 sm:hidden">
        This is the shape we look for: a steady seller count that falls hard over a few weeks, while
        the price does not move.
      </p>

      <div className="mt-4 flex flex-col gap-2 text-[13.5px] text-ink-2 sm:flex-row sm:gap-5 sm:text-[14.5px]">
        <span className="flex items-center gap-2">
          <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-deny-ink" aria-hidden />
          Sellers fall away over a few weeks
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-muted" aria-hidden />
          Price stays flat the whole time
        </span>
      </div>

      <p className="mt-3.5 border-t border-dashed border-line pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:text-[12px]">
        Illustrative example, not a real listing.
      </p>
      <p className="mt-4 text-[14.5px] leading-relaxed text-muted sm:text-[15px]">
        Your report carries the graph, what we think it means, and what it does not prove. We do not
        publish how we read it. That part took fifteen years to learn, and it is why two reports on
        the same evidence reach the same verdict.
      </p>
    </div>
  );
}
