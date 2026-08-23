"use client";

import { useState } from "react";
import { TOPICS, contactCopy } from "@/lib/content/contact";

// The contact form. Real endpoint, real validation, honest failure state — a form that says
// "sent" when nothing sent is worse than no form at all, and email is the only record behind it.

type State = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          company: fd.get("company"),
          topic: fd.get("topic"),
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
        }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-card border border-clear-ink/30 bg-clear-bg p-5">
        <p className="text-[16px] font-semibold text-clear-ink">{contactCopy.success}</p>
      </div>
    );
  }

  const field =
    "min-h-11 w-full rounded-field border border-control-border bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-muted focus:border-action focus:outline-none";
  const label = "block text-[13px] font-semibold text-ink-2";

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-name">{contactCopy.fields.name}</label>
          <input id="c-name" name="name" required maxLength={120} autoComplete="name" className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label className={label} htmlFor="c-email">{contactCopy.fields.email}</label>
          <input id="c-email" name="email" type="email" required maxLength={200} autoComplete="email" className={`mt-1.5 ${field}`} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-company">{contactCopy.fields.company}</label>
          <input id="c-company" name="company" maxLength={160} autoComplete="organization" className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label className={label} htmlFor="c-topic">{contactCopy.fields.topic}</label>
          <select id="c-topic" name="topic" required defaultValue={TOPICS[0]} className={`mt-1.5 ${field}`}>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="c-message">{contactCopy.fields.message}</label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={4000} rows={6}
          className={`mt-1.5 ${field} min-h-[140px] resize-y leading-relaxed`} />
      </div>

      {state === "error" && (
        <p role="alert" className="rounded-field border border-deny-ink/30 bg-deny-bg px-3 py-2.5 text-[15px] text-deny-ink">
          {contactCopy.failure}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={state === "sending"}
          className="flex min-h-11 w-full items-center justify-center rounded-control bg-action px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-anchor disabled:opacity-60 sm:w-auto"
        >
          {state === "sending" ? "Sending…" : contactCopy.submit}
        </button>
        <p className="mt-2 text-[13px] text-muted">{contactCopy.hint}</p>
      </div>
    </form>
  );
}
