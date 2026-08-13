// Loading state (build brief §8.3) — section skeletons at final heights; no spinner in content.
export default function ReviewLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="h-20 animate-pulse rounded-card border border-line bg-surface" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-card border border-line bg-surface" />
          <div className="h-32 animate-pulse rounded-card border border-line bg-surface" />
        </div>
        <div className="space-y-5">
          <div className="h-40 animate-pulse rounded-card border border-line bg-surface" />
          <div className="h-72 animate-pulse rounded-card border border-line bg-surface" />
          <div className="h-96 animate-pulse rounded-card border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
