export default function SettingsRBACLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-72 bg-muted/70 rounded-xl" />
        <div className="h-3.5 w-96 bg-muted/40 rounded-lg" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60 w-fit">
        <div className="h-8 w-32 bg-muted/70 rounded-xl" />
        <div className="h-8 w-32 bg-muted/40 rounded-xl" />
        <div className="h-8 w-32 bg-muted/40 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
        <div className="flex justify-between items-center pb-2 border-b border-border/60">
          <div className="h-9 w-64 bg-muted/50 rounded-xl" />
          <div className="h-9 w-32 bg-muted/70 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 bg-muted/20 rounded-xl border border-border/40 flex items-center justify-between px-4"
            >
              <div className="h-4 w-40 bg-muted/60 rounded" />
              <div className="h-4 w-24 bg-muted/50 rounded" />
              <div className="h-4 w-28 bg-muted/50 rounded" />
              <div className="h-4 w-16 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
