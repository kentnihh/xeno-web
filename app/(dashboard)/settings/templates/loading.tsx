import { Loader2 } from "lucide-react";

export default function MasterTemplatesLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-56 bg-muted/60 rounded" />
        <div className="h-7 w-96 bg-muted/80 rounded-xl" />
        <div className="h-3.5 w-full max-w-2xl bg-muted/40 rounded-lg" />
      </div>

      {/* Segmented Tabs Skeleton */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60 w-fit">
        <div className="h-8 w-48 bg-muted/70 rounded-xl" />
        <div className="h-8 w-48 bg-muted/40 rounded-xl" />
      </div>

      {/* Spreadsheet Canvas Skeleton */}
      <div className="w-full h-[600px] flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#007aff]" />
        <span className="text-xs font-semibold tracking-tight">Memuat Master Lembar Kerja Excel...</span>
      </div>
    </div>
  );
}
