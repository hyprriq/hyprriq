"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── GRANT ATTACH (grant-carrier rework, 2026-08-21) — the VISIBLE half of the invite flow.
// Mounted by the portal shell while the account is plan-less; calls /api/grants/attach once per
// browser session. Silence was the ruled failure ("the VA sees no offer, nothing errors") — so
// every outcome that had a cookie behind it gets a sentence: success in green, a terminal
// failure in plain words with LINK-MODE recovery (founder-caught 2026-09-07 on the walk's step 1:
// the old tail offered "enter a code on billing" — right for a coupon holder, wrong for a link
// recipient, who holds no code). The coupon form on /portal/billing keeps its own code guidance.
// No cookie → renders nothing.
// Copy rule holds: "a full assessment", never a tier name.

const SESSION_KEY = "hyprriq_grant_attach_attempted";

export function GrantAttach() {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch { /* storage blocked → still attempt once per mount */ }
    void fetch("/api/grants/attach", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { status?: string; message?: string | null } | null;
        if (cancelled || !data?.status || data.status === "no_cookie") return;
        if (data.status === "ok") {
          setResult({ ok: true, message: data.message ?? "Your free full assessment has been applied." });
          router.refresh();
        } else if (data.status !== "unavailable" && data.status !== "no_client" && data.message) {
          setResult({ ok: false, message: data.message });
        }
        // unavailable / no_client: stay silent — the cookie is kept and the next session retries.
      })
      .catch(() => { /* transport failure → cookie kept, next session retries */ });
    return () => { cancelled = true; };
  }, [router]);

  if (!result) return null;
  return (
    <div
      className={`mb-4 rounded-card border px-4 py-3 text-[14px] ${
        result.ok
          ? "border-verify-ink/40 bg-verify-bg text-verify-ink"
          : "border-conditional-ink/40 bg-conditional-bg text-conditional-ink"
      }`}
    >
      {result.message}
      {!result.ok && (
        <>
          {" "}
          Sign in with the address this invite was sent to and open your link again, or reply to
          the person who sent it.
        </>
      )}
    </div>
  );
}
