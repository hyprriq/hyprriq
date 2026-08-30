"use client";

import { useEffect, useRef, useState } from "react";
import { AREAS } from "@/lib/content/whatWeCheck";

// The scroll-stop rail from hyprriq_flow_v2.html §2. A sticky index on the left tracks which of
// the five area panels is in the reading band; clicking an index entry scrolls to its panel.
//
// MOBILE: the rail is hidden below `lg`, because a sticky index costs a third of a phone screen and
// duplicates headings that are already three lines away. The panels carry their own numbered
// headings there instead, so nothing is lost with the rail gone.
//   ⚠ FLAGGED, NOT CHANGED: this note used to claim "hidden below 760px, per the spec". The code
//   hides it below `lg` (1024) and the spec hides it at 960 — THREE DIFFERENT NUMBERS, none of them
//   agreeing. The comment was simply wrong. Corrected to describe the code; moving the breakpoint
//   itself changes desktop-adjacent layout and is a separate decision, so it is raised rather than
//   taken. See §0-R.
//
// ── MOBILE COMPRESSION BELOW 960px (spec line 437, founder-ruled 2026-08-25) ──────────────────
// `.pan .pm, .pan .d { display: none }` — the summary paragraph and BOTH detail boxes come off the
// panel below 960px, leaving the NUMBER, the QUESTION and the LIMIT.
//
// WHY, in the spec's own words: "the homepage is a hub — five questions and their limits, detail
// lives on /what-we-check". The measured effect the founder gave: the mobile page drops from 20.4
// screens to 17.1, and this section from 6.5 to 3.7. On a phone the job is to make five promises
// legible, not to be the full explanation — and the link to /what-we-check sits directly below.
//
// ⚠ NOTHING IS LOST, ONLY MOVED, and that is the test this has to pass. Every hidden string is
// rendered in full on /what-we-check: `a.summary` is the short form of `a.full`, and `a.examines`
// and `a.delivers` appear verbatim in that page's two panels. Both surfaces read lib/content/
// whatWeCheck.ts, so they cannot come apart. If that stops being true, this hides real content.
//
// `min-[961px]:` NOT `lg:` — Tailwind's lg is 1024 and the spec's breakpoint is 960. Using lg would
// have compressed the 960–1023 band that the spec leaves expanded.
//
// NO-JS / REDUCED MOTION: every panel is plain document content, always visible. The rail is
// navigation over content that already exists, never a gate on it.

const ACCENTS = [
  "text-anchor",
  "text-violet",
  "text-blue",
  "text-cyan",
  "text-plum",
] as const;
const BORDERS = [
  "border-l-anchor",
  "border-l-violet",
  "border-l-blue",
  "border-l-cyan",
  "border-l-plum",
] as const;

export function ServiceRail() {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = panels.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.panel);
            if (!Number.isNaN(i)) setActive(i);
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[290px_1fr] lg:gap-[60px]">
      {/* The rail. Hidden on phones by design; it is an index, not content. */}
      <nav aria-label="Assessment areas" className="hidden lg:block">
        <div className="sticky top-[104px]">
          {AREAS.map((a, i) => {
            const on = i === active;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => panels.current[i]?.scrollIntoView({ block: "center" })}
                className={`flex w-full gap-3 border-l py-3.5 pl-5 text-left transition-colors ${
                  on ? `${BORDERS[i]} border-l-2 pl-[19px]` : "border-line"
                }`}
              >
                <span className={`pt-0.5 font-mono text-[10.5px] ${on ? ACCENTS[i] : "text-muted"}`}>
                  0{i + 1}
                </span>
                <span
                  className={`text-[15.5px] font-semibold tracking-[-0.01em] transition-colors ${
                    on ? "text-ink" : "text-muted"
                  }`}
                >
                  {a.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div>
        {AREAS.map((a, i) => (
          <div
            key={a.key}
            data-panel={i}
            ref={(el) => {
              panels.current[i] = el;
            }}
            className="border-b border-line pb-9 pt-1 last:border-b-0 last:pb-6 lg:pb-[68px]"
          >
            {/* On phones the rail is gone, so each panel names itself. */}
            <div className="flex items-baseline gap-3 lg:hidden">
              <span className={`font-mono text-[10.5px] ${ACCENTS[i]}`}>0{i + 1}</span>
              <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                {a.name}
              </span>
            </div>
            <h3 className="mt-2 font-display text-[21px] font-medium leading-[1.12] tracking-[-0.02em] text-ink lg:mt-0 lg:text-[27px]">
              {a.question}
            </h3>
            {/* .pan .d — HIDDEN BELOW 960px (spec line 437). See the compression note above. */}
            <p className="mt-3 max-w-[56ch] text-[15.5px] leading-[1.62] text-ink-2 max-[960px]:hidden lg:text-[16.5px]">
              {a.summary}
            </p>
            <p className="mt-3.5 rounded-r-control border-l-2 border-cyan bg-cyan-tint px-3.5 py-2.5 text-[14px] text-ink-2 lg:px-4.5 lg:py-3 lg:text-[15px]">
              <b className="font-semibold text-ink">The limit:</b> {a.summaryLimit}
            </p>
            {/* .pan .pm — HIDDEN BELOW 960px (spec line 437). Both boxes, not one. */}
            <div className="mt-5 grid overflow-hidden rounded-card border border-line max-[960px]:hidden sm:grid-cols-2">
              <div className="border-b border-line bg-surface p-3.5 sm:border-b-0 sm:border-r lg:px-4 lg:py-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted lg:text-[9.5px]">
                  What we examine
                </div>
                <div className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2 lg:text-[14.5px]">
                  {a.examines}
                </div>
              </div>
              <div className="bg-surface p-3.5 lg:px-4 lg:py-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted lg:text-[9.5px]">
                  What lands in your report
                </div>
                <div className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2 lg:text-[14.5px]">
                  {a.delivers}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
