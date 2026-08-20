import { findLegalSignals } from "@/lib/research/legalSignals";

// ── TRIGGER 9 — the ⚖ LEGAL FLAG banner (extracted 2026-08-20 so it can be RENDER-verified).
// Derived at render, zero storage: the client disclosed something legal-adjacent; make sure the
// founder SEES it. Flags, never blocks. Returns null when nothing fires — the caller renders it
// unconditionally over the notes. Tracker 4.11 carried "built, unverified" since the trigger
// landed; legalFlagBanner.test.tsx now renders THIS component through React's real renderer,
// two-sided, so the banner's existence is a locked fact rather than a hope.
export function LegalFlagBanner({ notes }: { notes: string | null | undefined }) {
  const signals = findLegalSignals(notes);
  if (signals.length === 0) return null;
  return (
    <div className="mb-2 rounded-lg border border-deny-ink/30 bg-deny-bg px-3 py-2 text-[13px] font-semibold text-deny-ink">
      ⚖ LEGAL FLAG — the client&apos;s notes mention: {signals.join(", ")}. No legal advice; review before any response.
    </div>
  );
}
