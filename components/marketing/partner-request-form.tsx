"use client";

import { useState } from "react";
import {
  ROLE_OPTIONS,
  CLIENTS_BAND_OPTIONS,
  PARTNER_REQUEST_COPY as COPY,
} from "@/lib/content/partnerRequest";

// ── PARTNER REQUEST FORM (founder-ruled 2026-08-22, item 1 — replaces the /partners mailto,
// which failed silently for anyone without a mail client and captured nothing). POSTs to
// /api/partner-request; every string renders from lib/content/partnerRequest.ts (MUST_PASS
// imports the same constants). Shown to COLD visitors only — the page hides this for
// ?invited=1 arrivals, who already hold what this form asks for (ruled 1g).
//
// Field count is deliberate (ruled 1b: every field is a reason not to finish): name, email,
// two selects, optional note. The "website" input is a HONEYPOT — visually hidden, ignored by
// humans, filled by bots; the API discards trapped submissions. Consent is opt-in, unchecked.

export function PartnerRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0].value);
  const [band, setBand] = useState<string>(CLIENTS_BAND_OPTIONS[0].value);
  const [note, setNote] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "done" | "unavailable" | "rate_limited" | "error">("idle");

  if (state === "done") {
    return (
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="text-[15px] font-semibold text-ink">{COPY.confirmed}</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-card border border-line bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (state === "busy") return;
        setState("busy");
        try {
          const res = await fetch("/api/partner-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, role, clientsBand: band, note, marketingOptIn: optIn, website }),
          });
          setState(res.ok ? "done" : res.status === 503 ? "unavailable" : res.status === 429 ? "rate_limited" : "error");
        } catch {
          setState("error");
        }
      }}
    >
      <p className="text-[14px] leading-relaxed text-ink-2">{COPY.intro}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-semibold text-muted">
          Your name
          <input
            required
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 text-[16px] font-normal text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          Work email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1 block w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 text-[16px] font-normal text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          What you do
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 text-[16px] font-normal text-ink focus:border-line-strong focus:outline-none"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-semibold text-muted">
          You source for roughly
          <select
            value={band}
            onChange={(e) => setBand(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 text-[16px] font-normal text-ink focus:border-line-strong focus:outline-none"
          >
            {CLIENTS_BAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-[12px] font-semibold text-muted">
        Anything we should know? <span className="font-normal">(optional)</span>
        <textarea
          value={note}
          maxLength={1000}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. the supplier category you mostly source, or a supplier you'd try this on"
          className="mt-1 block w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 text-[16px] font-normal text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
        />
      </label>

      {/* Honeypot — off the accessibility tree and invisible; humans never see or fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <label className="mt-3 flex items-start gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line"
        />
        {COPY.consentLabel}
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-surface hover:opacity-90 disabled:opacity-50"
        >
          {state === "busy" ? "Sending…" : COPY.submit}
        </button>
        {state === "unavailable" && <p className="text-[13px] text-muted">{COPY.unavailable}</p>}
        {state === "rate_limited" && <p className="text-[13px] text-muted">{COPY.rateLimited}</p>}
        {state === "error" && <p className="text-[13px] text-muted">{COPY.error}</p>}
      </div>
    </form>
  );
}
