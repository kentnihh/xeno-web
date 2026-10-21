export default function VendorsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-muted/70 rounded-xl" />
        <div className="h-3.5 w-80 bg-muted/40 rounded-lg" />
      </div>

      {/* Form Skeleton */}
      <div className="apple-card p-5 space-y-4 border border-border shadow-xs">
        <div className="h-4 w-36 bg-muted/70 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-9 bg-muted/40 rounded-xl" />
          <div className="h-9 bg-muted/40 rounded-xl" />
          <div className="h-9 bg-muted/40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-9 bg-muted/40 rounded-xl" />
          <div className="h-9 bg-muted/40 rounded-xl" />
          <div className="h-9 bg-muted/40 rounded-xl" />
        </div>
        <div className="flex justify-end pt-1">
          <div className="h-9 w-28 bg-muted/60 rounded-xl" />
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="apple-card p-5 space-y-3.5 rounded-2xl border border-border shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted/60 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-muted/80 rounded" />
                  <div className="h-2.5 w-16 bg-muted/50 rounded-full" />
                </div>
              </div>
              <div className="w-6 h-6 rounded bg-muted/30" />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="h-3 w-28 bg-muted/40 rounded" />
              <div className="h-3 w-36 bg-muted/40 rounded" />
              <div className="h-3 w-32 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
