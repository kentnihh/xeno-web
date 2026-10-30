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

      {/* Row: Calendar (7 cols) + Upcoming Events (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Skeleton (7 cols) */}
        <div className="lg:col-span-7 apple-card p-5 sm:p-6 space-y-4 border border-border shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border/60">
            <div className="h-5 w-44 bg-muted/70 rounded-lg" />
            <div className="flex gap-2">
              <div className="w-16 h-7 bg-muted/60 rounded-lg" />
              <div className="w-28 h-7 bg-muted/60 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted/40 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 min-h-[220px]">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-14 sm:h-16 bg-muted/25 rounded-xl border border-border/30" />
            ))}
          </div>
        </div>

        {/* Upcoming Events Skeleton (5 cols) */}
        <div className="lg:col-span-5 apple-card p-5 sm:p-6 space-y-4 border border-border shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border/60">
            <div className="h-4 w-44 bg-muted/70 rounded" />
            <div className="h-3 w-16 bg-muted/50 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="h-4 w-44 bg-muted/70 rounded" />
                  <div className="h-3 w-28 bg-muted/40 rounded" />
                </div>
                <div className="h-3 w-16 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Tasks Skeleton (Full-width 100% with 4 columns) */}
      <div className="w-full bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-muted/70" />
            <div className="space-y-1">
              <div className="h-4 w-36 bg-muted/70 rounded" />
              <div className="h-3 w-52 bg-muted/40 rounded" />
            </div>
          </div>
          <div className="h-3.5 w-24 bg-muted/50 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-14 bg-muted/70 rounded-full" />
                  <div className="h-3.5 w-16 bg-muted/60 rounded-full" />
                </div>
                <div className="h-4 w-full bg-muted/70 rounded" />
                <div className="h-3.5 w-2/3 bg-muted/50 rounded" />
              </div>
              <div className="pt-2 border-t border-border/40 flex justify-between items-center">
                <div className="h-3 w-20 bg-muted/50 rounded" />
                <div className="h-3 w-16 bg-muted/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
