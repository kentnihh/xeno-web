export default function EventsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/70 rounded-xl" />
          <div className="h-3.5 w-80 bg-muted/40 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-36 bg-muted/50 rounded-xl" />
          <div className="h-9 w-32 bg-muted/70 rounded-xl" />
        </div>
      </div>

      {/* Status Filter Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted/50 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <div className="max-w-xl">
        <div className="h-10 w-full bg-muted/50 rounded-xl border border-border/40" />
      </div>

      {/* Events List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="apple-card p-5 rounded-xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-44 bg-muted/80 rounded" />
                <div className="h-4 w-16 bg-muted/50 rounded-full" />
                <div className="h-4 w-20 bg-muted/50 rounded-full" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-36 bg-muted/40 rounded" />
                <div className="h-3 w-28 bg-muted/40 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-3.5 w-24 bg-muted/50 rounded" />
              <div className="w-5 h-5 rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
