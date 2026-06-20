// Honest "not built yet" state for admin sections that are real features for a
// later session (Outcomes, Revenue, Prompts, Settings). Clicking the nav lands
// here instead of a dead/disabled button — "clicks through to a clear empty
// page" beats "nothing happens".
export function AdminPlaceholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-card border border-line bg-surface p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-subtle text-xl text-muted">🚧</div>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-2">{blurb}</p>
      <p className="mt-3 text-[12px] text-muted">Coming in a later build.</p>
    </div>
  );
}
