export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted/70 rounded-xl" />
        <div className="h-3.5 w-80 bg-muted/40 rounded-lg" />
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="apple-card p-5 space-y-3.5 rounded-2xl border border-border shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/60 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-muted/80 rounded" />
                  <div className="h-4 w-16 bg-muted/50 rounded-full" />
                </div>
              </div>
              <div className="w-6 h-6 rounded bg-muted/30" />
            </div>

            <div className="pt-2.5 border-t border-border/60">
              <div className="h-3 w-40 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
