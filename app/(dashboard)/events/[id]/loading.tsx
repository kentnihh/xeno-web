export default function EventDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-muted/60" />
        <div className="h-4 w-32 bg-muted/40 rounded" />
      </div>

      {/* Hero Header Skeleton */}
      <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-7 w-64 bg-muted/80 rounded-xl" />
              <div className="h-6 w-24 bg-muted/50 rounded-full" />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="h-3.5 w-40 bg-muted/50 rounded" />
              <div className="h-3.5 w-32 bg-muted/50 rounded" />
              <div className="h-3.5 w-28 bg-muted/50 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted/60 rounded-xl" />
            <div className="h-9 w-28 bg-muted/60 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60 w-fit">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-28 bg-muted/60 rounded-xl" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
            <div className="h-4 w-36 bg-muted/70 rounded pb-2 border-b border-border/60" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-xl border border-border/40" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
            <div className="h-4 w-32 bg-muted/70 rounded pb-2 border-b border-border/60" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/20 rounded-xl border border-border/40" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
