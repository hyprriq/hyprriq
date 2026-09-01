"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

// Topbar avatar menu: sign out (Clerk) + the optional console switcher.
// The switcher is passed in already gated by the server shell — this component never decides
// visibility itself.
//
// ⚠ IT IS NOT A DEV AFFORDANCE ANY MORE, AND THE "Dev" BADGE IS GONE WITH THE GATE THAT MADE IT
// TRUE (2026-09-01). This carried a hardcoded "Dev" chip left over from when the switcher was
// hidden behind `VERCEL_ENV !== "production"`. That gate was removed on 2026-08-24 — it was the
// console-switcher bug, where the link existed on staging and vanished on the only domain that
// mattered — and the switcher became a PERMANENT, capability-gated route. The chip outlived its
// gate and told the founder their production console was a dev build. A label that survives the
// condition it described is worse than no label.
export function UserMenu({
  initial,
  email,
  imageUrl,
  switcher,
}: {
  initial: string;
  email?: string;
  /** Clerk avatar (founder-ruled 2026-08-20): replaces the initial when present. */
  imageUrl?: string | null;
  switcher?: { href: string; label: string };
}) {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="min-h-11 inline-flex items-center justify-center grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-brand-tint text-sm font-bold text-brand-ink ring-offset-2 transition hover:ring-2 hover:ring-brand/30"
      >
        {imageUrl ? (
          // Plain <img>, deliberately: a 36px third-party (Clerk-hosted) avatar gains nothing
          // from next/image and would force a remotePatterns config for img.clerk.com.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          {email && (
            <div className="border-b border-line px-3 py-2.5 text-xs text-muted">
              Signed in as<br />
              <span className="font-medium text-ink">{email}</span>
            </div>
          )}
          {switcher && (
            <Link
              href={switcher.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="min-h-11 flex items-center gap-2 border-b border-line px-3 py-2.5 text-[14px] font-medium text-ink-2 hover:bg-subtle hover:text-ink"
            >
              <span aria-hidden>🔁</span> {switcher.label}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="min-h-11 flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] font-medium text-deny-ink hover:bg-deny-bg/40"
          >
            <span aria-hidden>↩</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
