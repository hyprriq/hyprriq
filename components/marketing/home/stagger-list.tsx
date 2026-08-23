"use client";

import { useEffect, useRef } from "react";

// The "what you get" list and the two-beat heading from hyprriq_flow_v2.html §get.
//
// BOTH ARE VISIBLE BY DEFAULT and armed on mount, the same contract as <Reveal>. A reveal that
// starts hidden in CSS and waits for a class ships the section BLANK anywhere the transition never
// fires — a background tab, a headless renderer, a crawler, prefers-reduced-motion. This is the
// homepage's core value proposition; it renders with JavaScript disabled.

export function StaggerList({ items }: { items: { text: string; lead?: boolean }[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lis = Array.from(el.children) as HTMLElement[];
    lis.forEach((li) => {
      li.style.opacity = "0";
      li.style.transform = "translateY(14px)";
      li.style.transition =
        "opacity var(--dur-slow) var(--ease-entrance), transform var(--dur-slow) var(--ease-entrance)";
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          lis.forEach((li, i) =>
            setTimeout(() => {
              li.style.opacity = "1";
              li.style.transform = "none";
            }, i * 110),
          );
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} className="max-w-[760px] list-none">
      {items.map((item, i) => (
        <li
          key={item.text}
          className={`flex items-baseline gap-3.5 border-b border-line py-3.5 text-[16px] tracking-[-0.01em] text-ink last:border-b-0 sm:gap-[18px] sm:py-[18px] sm:text-[20px] ${
            item.lead ? "font-semibold" : ""
          }`}
        >
          <span className="w-4 flex-none font-mono text-[11px] text-action sm:w-5 sm:text-[12px]">
            {i + 1}
          </span>
          {item.text}
        </li>
      ))}
    </ol>
  );
}

export function BeatHeading({ first, second }: { first: string; second: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const beats = Array.from(el.querySelectorAll<HTMLElement>("[data-beat]"));
    beats.forEach((b, i) => {
      b.style.opacity = "0";
      b.style.transform = "translateY(12px)";
      b.style.transition =
        "opacity 0.55s var(--ease-entrance), transform 0.55s var(--ease-entrance)";
      b.style.transitionDelay = i === 1 ? "0.32s" : "0s";
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          beats.forEach((b) => {
            b.style.opacity = "1";
            b.style.transform = "none";
          });
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={ref} className="text-[26px] text-ink sm:text-[clamp(31px,3.7vw,46px)]">
      <span data-beat className="inline-block">
        {first}
      </span>{" "}
      <span data-beat className="inline-block text-action">
        {second}
      </span>
    </h2>
  );
}
