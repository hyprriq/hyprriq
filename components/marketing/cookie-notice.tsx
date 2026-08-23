"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

// ── COOKIE NOTICE, NOT A CONSENT BANNER (locked build note): the site sets strictly necessary
// cookies only, so no consent is required — this is a dismissible first-visit notice, dismissal
// stored in localStorage rather than a cookie (a cookie announcing cookies would be the joke).
// ⚠ IF ANALYTICS ARE EVER ADDED this becomes a REAL consent banner — nothing non-essential fires
// before consent, Reject as easy as Accept, consent withdrawable from a persistent footer link,
// and the banner arrives WITH the analytics, never after (the locked note's own words).

const STORAGE_KEY = "hyprriq_cookie_notice_dismissed";

const noopSubscribe = () => () => {};
function readDismissed(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return true; // storage blocked → stay hidden rather than nag on every load
  }
}

export function CookieNotice() {
  // SSR-safe first-visit read: the server snapshot says "dismissed" so nothing flashes during
  // hydration; the client snapshot reads localStorage once mounted.
  const alreadyDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);

  if (alreadyDismissed || dismissedNow) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 shadow-[0_-4px_16px_rgba(26,25,23,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <p className="text-[13px] leading-relaxed text-ink-2">
          <b className="text-ink">
            We use cookies that keep you signed in and keep the service secure. That&rsquo;s all — no
            advertising, no tracking, no analytics.
          </b>{" "}
          <Link href="/cookie-policy" className="inline-flex min-h-11 items-center underline hover:text-ink">Cookie Policy →</Link>
        </p>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch { /* dismiss anyway */ }
            setDismissedNow(true);
          }}
          className="min-h-11 shrink-0 rounded-control bg-ink px-5 py-2 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
