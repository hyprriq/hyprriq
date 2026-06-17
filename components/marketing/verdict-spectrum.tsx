// The four-verdict spectrum — the brand's signature motif. The verdicts run
// best → worst; the bar makes that range legible at a glance and reappears as a
// recurring visual throughout the site.
const SEGMENTS = [
  { color: "var(--color-clear-ink)", label: "Source Clear" },
  { color: "var(--color-conditional-ink)", label: "Usable With Conditions" },
  { color: "var(--color-verify-ink)", label: "Verify Before Purchase" },
  { color: "var(--color-deny-ink)", label: "Do Not Rely" },
];

export function VerdictSpectrum({
  withLabels = false,
  className = "",
}: {
  withLabels?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex gap-1.5" aria-hidden="true">
        {SEGMENTS.map((s) => (
          <span
            key={s.label}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: s.color }}
          />
        ))}
      </div>
      {withLabels && (
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>Source Clear</span>
          <span>Do Not Rely</span>
        </div>
      )}
    </div>
  );
}
