"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The spec's progress ring for the "work runs" panel.
 *
 * WHY THE GEOMETRY IS COMPUTED AND NOT COPIED. The spec carries `stroke-dasharray:188.5` and
 * `stroke-dashoffset:113.1`, which are 2π·30 and that same circumference times three-fifths. Both
 * are correct only while the area count is five and the demonstration shows two of them done.
 * Hard-coding them makes the ring silently lie the day a sixth area is added — it would still draw
 * a two-of-five arc under a label reading "2 of 6". So both numbers are derived from `done` and
 * `total`, and `total` comes from the same constant the label does.
 *
 * REDUCED MOTION is handled in `globals.css` on `.hq-ring-arc`, not here: the arc is drawn at its
 * final offset with no transition, so a reader who suppresses motion sees the finished state rather
 * than an empty ring.
 */
export function ProgressRing({
  done,
  total,
  label,
  sub,
  className = "",
}: {
  done: number;
  total: number;
  label: string;
  sub: string;
  className?: string;
}) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - done / total);

  const ref = useRef<SVGSVGElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The arc reads as an arrival, so it fires when the panel is actually on screen rather than on
    // mount — a ring that finished animating above the fold has communicated nothing.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`flex items-center gap-3.5 px-4 pb-1 pt-4 sm:px-5 ${className}`}>
      <svg
        ref={ref}
        viewBox="0 0 72 72"
        aria-hidden
        className="h-11 w-11 flex-none sm:h-[52px] sm:w-[52px]"
        style={
          {
            "--ring-c": `${circumference.toFixed(2)}`,
            "--ring-o": `${offset.toFixed(2)}`,
          } as React.CSSProperties
        }
      >
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-subtle)" strokeWidth="7" />
        <circle
          className="hq-ring-arc"
          data-drawn={drawn ? "true" : undefined}
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--color-blue)"
          strokeWidth="7"
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div>
        <div className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink sm:text-[15px]">
          {label}
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted sm:text-[13px]">{sub}</div>
      </div>
    </div>
  );
}
