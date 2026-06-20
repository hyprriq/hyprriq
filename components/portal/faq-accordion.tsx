"use client";

import { useEffect, useRef, useState } from "react";
import type { Faq } from "@/lib/content/help";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open + scroll to the entry referenced by the URL hash (e.g. submit form's
  // "Learn more → /portal/help#unconfirmed-brands"). Deferred to an animation
  // frame so the state update isn't synchronous inside the effect.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || !faqs.some((f) => f.id === hash)) return;
    const raf = requestAnimationFrame(() => {
      setOpen(hash);
      document.getElementById(`faq-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [faqs]);

  return (
    <div ref={containerRef} className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {faqs.map((f) => {
        const isOpen = open === f.id;
        return (
          <div key={f.id} id={`faq-${f.id}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : f.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold text-ink hover:bg-subtle"
            >
              {f.q}
              <span className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                ▾
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-[14px] leading-relaxed text-ink-2">{f.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
