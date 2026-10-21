export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-muted/70 rounded-xl" />
          <div className="h-3.5 w-72 bg-muted/40 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-muted/70 rounded-xl self-start sm:self-auto" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="max-w-md">
        <div className="h-10 w-full bg-muted/50 rounded-xl border border-border/40" />
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="apple-card p-5 space-y-4 rounded-2xl border border-border shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/60 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-muted/80 rounded" />
                <div className="h-3 w-20 bg-muted/40 rounded" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="h-3 w-40 bg-muted/40 rounded" />
              <div className="h-3 w-32 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
