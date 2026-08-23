import { CircleCheck, AlertCircle, ScanEye, CircleX, type LucideIcon } from "lucide-react";
import { VERDICT_CLASSES, type VerdictPaletteKey } from "@/lib/design/palette";

// The four verdicts. This is the product's payload — the badge is intentionally
// the loudest color moment wherever it appears. Color is the third signal,
// after label + icon (informed-doubt: never color-only, never a klaxon).
export type Verdict = "clear" | "conditional" | "verify" | "deny";

type VerdictMeta = {
  label: string;
  icon: LucideIcon;
  bg: string;
  ink: string;
};

// COLOUR COMES FROM THE REGISTRY, LABEL AND ICON STAY HERE. The colour classes below used to be
// typed out — a third hand-written verdict→colour map, and the same shape as the one on
// /how-to-read that had three of its four entries wrong. Labels are NOT derived: this badge's
// "Do Not Rely On This Source" is longer than VERDICT_COPY's "Do Not Rely", and client-facing
// wording is founder-ruled and MUST_PASS-locked, so collapsing the two is a copy decision, not
// a design one. Flagged, not silently merged.
const CLS = (k: VerdictPaletteKey) => VERDICT_CLASSES[k];

export const VERDICTS: Record<Verdict, VerdictMeta> = {
  clear: {
    label: "Source Clear",
    icon: CircleCheck,
    bg: CLS("source_clear").bg,
    ink: CLS("source_clear").ink,
  },
  conditional: {
    label: "Usable With Conditions",
    icon: AlertCircle,
    bg: CLS("usable_with_conditions").bg,
    ink: CLS("usable_with_conditions").ink,
  },
  verify: {
    label: "Verify Before Purchase",
    icon: ScanEye,
    bg: CLS("verify_before_purchase").bg,
    ink: CLS("verify_before_purchase").ink,
  },
  deny: {
    label: "Do Not Rely On This Source",
    icon: CircleX,
    bg: CLS("do_not_rely").bg,
    ink: CLS("do_not_rely").ink,
  },
};

export function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const meta = VERDICTS[verdict];
  const Icon = meta.icon;
  const pad = size === "sm" ? "px-2.5 py-1 text-xs gap-1.5" : "px-3 py-1.5 text-sm gap-2";
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${pad} ${meta.bg} ${meta.ink}`}
    >
      <Icon size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
