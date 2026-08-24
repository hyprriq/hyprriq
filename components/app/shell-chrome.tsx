"use client";

// Mobile drawer chrome, SHARED BY PORTAL AND ADMIN (moved out of components/portal 2026-08-24,
// sitting three — it was never portal-specific, and admin had no mobile mode at all: a fixed
// w-[248px] sidebar with no drawer, no hamburger and no breakpoint, which is what actually broke
// on a phone. Reusing this is not admin polish; it is giving admin a shell that exists below
// 1024px. Follows the shared AppHeader the dev thread landed the same day.)
//
// ORIGINAL NOTE (skin port 2026-08-11, tracker 1.4 build):
// Deliberately thin: the sidebar and topbar stay server-rendered and are passed in as
// slots; this component only owns the open/close state so the client boundary pulls in
// zero server modules (clientBoundary.lock walks this graph).
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app/app-header";

export function ShellChrome({
  sidebar,
  title,
  actions,
  children,
  contentClassName = "mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-7 sm:py-6",
}: {
  sidebar: React.ReactNode;
  // Title and actions are separate slots (2026-08-24) so the SHARED AppHeader owns the bar and
  // the drawer button can sit inside it. Previously this took one `header` node and built its
  // own <header>, which is how the portal and admin bars drifted apart.
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** The main content container. Portal centres on a 1200px measure; admin runs dense and full
   *  width, because an operator is reading tables, not prose. */
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* sidebar: static column ≥lg, slide-in drawer below */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[272px] max-w-[84vw] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[248px] lg:max-w-none lg:translate-x-0 lg:transition-none ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-brand-ink/55 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          actions={actions}
          leading={
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto">
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}
