import { CircleCheck, AlertCircle, ScanEye, CircleX, type LucideIcon } from "lucide-react";

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

export const VERDICTS: Record<Verdict, VerdictMeta> = {
  clear: {
    label: "Source Clear",
    icon: CircleCheck,
    bg: "bg-clear-bg",
    ink: "text-clear-ink",
  },
  conditional: {
    label: "Usable With Conditions",
    icon: AlertCircle,
    bg: "bg-conditional-bg",
    ink: "text-conditional-ink",
  },
  verify: {
    label: "Verify Before Purchase",
    icon: ScanEye,
    bg: "bg-verify-bg",
    ink: "text-verify-ink",
  },
  deny: {
    label: "Do Not Rely On This Source",
    icon: CircleX,
    bg: "bg-deny-bg",
    ink: "text-deny-ink",
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
