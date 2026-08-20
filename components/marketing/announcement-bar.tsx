import { ArrowRight } from "lucide-react";

// Slim top strip above the header. Content is intentionally a single, easily
// swappable line (announcement copy isn't final). Premium-but-restrained motion:
// a slow light sweep + a soft pulsing indicator (both disabled under
// prefers-reduced-motion). Scrolls away on scroll; the header below it sticks.
export function AnnouncementBar() {
  return (
    <div className="relative overflow-hidden bg-brand-ink text-white">
      <div
        aria-hidden="true"
        className="hq-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
        }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-5 py-2.5 text-center text-[13px] lg:px-8">
        <span
          className="hq-pulse-dot h-1.5 w-1.5 flex-none rounded-full bg-white/90"
          aria-hidden="true"
        />
        <span className="text-white/85">
          New — vet a supplier before your next wholesale buy.
        </span>
        {/* was href="#pricing" — no element with that id exists on any page (tracker 2.11);
            the pricing page is a route, not an anchor. */}
        <a
          href="/pricing"
          className="inline-flex items-center gap-1 font-semibold text-white underline-offset-4 hover:underline"
        >
          See pricing
          <ArrowRight size={13} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
