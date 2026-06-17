"use client";

import { useEffect, useRef, useState } from "react";

// Count-up for REAL product facts only (60+ data points, 5 dimensions, 14 doc
// standards) — never vanity metrics. Animates once on first view; honors
// prefers-reduced-motion by showing the final value immediately.
export function Counter({
  value,
  suffix = "",
  durationMs = 1100,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start = 0;
    const run = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(run);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (reduce) setDisplay(value);
            else raf = requestAnimationFrame(run);
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tnum">
      {display}
      {suffix}
    </span>
  );
}
