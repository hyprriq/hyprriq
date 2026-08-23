"use client";

import { useState } from "react";

// ── NEWSLETTER SIGNUP (ADR-EMAIL-001 consent capture; the app collects, a tool sends) ────────
// Small footer box; POSTs to /api/newsletter which writes the consent record. Until the
// founder-run marketing_contacts migration lands, the API answers 503 and this shows the
// honest "not available yet" line rather than pretending.

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "unavailable" | "error">("idle");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notes on sourcing</p>
      {state === "done" ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-2">You&rsquo;re on the list. Thanks.</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Occasional notes on supplier verification and marketplace sourcing. Unsubscribe any time.
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (state === "busy") return;
              setState("busy");
              try {
                const res = await fetch("/api/newsletter", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, source: "site_footer" }),
                });
                setState(res.ok ? "done" : res.status === 503 ? "unavailable" : "error");
              } catch {
                setState("error");
              }
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="min-h-11 w-full min-w-0 rounded-field border border-control-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-action focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="min-h-11 shrink-0 rounded-control bg-action px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-anchor disabled:opacity-50"
            >
              Sign up
            </button>
          </form>
          {state === "unavailable" && (
            <p className="mt-2 text-xs text-muted">Signups aren&rsquo;t open quite yet — check back soon.</p>
          )}
          {state === "error" && (
            <p className="mt-2 text-xs text-muted">That didn&rsquo;t go through — try again in a moment.</p>
          )}
        </>
      )}
    </div>
  );
}
