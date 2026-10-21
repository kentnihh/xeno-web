export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted/70 rounded-xl" />
          <div className="h-3.5 w-72 bg-muted/40 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-muted/60 rounded-xl self-start sm:self-auto" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="max-w-xl">
        <div className="h-10 w-full bg-muted/50 rounded-xl border border-border/40" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="apple-card p-5 space-y-3 border border-border shadow-xs"
          >
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-28 bg-muted/60 rounded" />
              <div className="w-7 h-7 rounded-lg bg-muted/60" />
            </div>
            <div className="h-8 w-14 bg-muted/80 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Calendar Skeleton Card */}
      <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 bg-muted/70 rounded-lg" />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted/60" />
            <div className="w-8 h-8 rounded-lg bg-muted/60" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 pt-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 rounded-xl border border-border/30" />
          ))}
        </div>
      </div>

      {/* Bottom Grid: Events + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6 space-y-4 border border-border shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border/60">
            <div className="h-4 w-44 bg-muted/70 rounded" />
            <div className="h-3 w-16 bg-muted/50 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-muted/70 rounded" />
                  <div className="h-3 w-32 bg-muted/40 rounded" />
                </div>
                <div className="h-3 w-20 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
          <div className="h-4 w-36 bg-muted/70 rounded pb-2 border-b border-border/60" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2"
              >
                <div className="h-3.5 w-full bg-muted/60 rounded" />
                <div className="h-2.5 w-24 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
