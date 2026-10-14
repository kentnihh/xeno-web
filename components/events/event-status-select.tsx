"use client";

import { useState, useTransition, useEffect, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { updateEventStatus } from "@/app/(dashboard)/events/actions";
import type { EventStatus } from "@/types/database";

interface EventStatusSelectProps {
  eventId: string;
  initialStatus: EventStatus;
  disabled?: boolean;
  className?: string;
}

const STATUS_THEMES: Record<EventStatus, string> = {
  confirmed: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border-[#007aff]/30 focus:border-[#007aff]",
  ongoing: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 focus:border-amber-500",
  planning: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 focus:border-orange-500",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 focus:border-emerald-500",
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 focus:border-slate-500",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 focus:border-rose-500",
};

export function EventStatusSelect({
  eventId,
  initialStatus,
  disabled = false,
  className = "",
}: EventStatusSelectProps) {
  // All hooks declared unconditionally at the very top of the component body
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    initialStatus,
    (_current: EventStatus, next: EventStatus) => next
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-dismiss error alert after 5 seconds
  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as EventStatus;
    if (nextStatus === optimisticStatus) return;

    setErrorMsg(null);

    startTransition(async () => {
      // ponytail: optimistic UI updates immediately; rolls back automatically on error
      setOptimisticStatus(nextStatus);

      try {
        const res = await updateEventStatus(eventId, nextStatus);
        if (!res.success) {
          console.error(`[EventStatusSelect] Status update failed:`, res.error);
          setErrorMsg(res.error || "Gagal memperbarui status.");
          return;
        }

        // Refresh wrapped in transition to keep React 19 Suspense boundaries stable
        startTransition(() => {
          router.refresh();
        });
      } catch (err: unknown) {
        console.error(`[EventStatusSelect] Status update error:`, err);
        setErrorMsg(err instanceof Error ? err.message : "Gagal memperbarui status acara.");
      }
    });
  };

  const themeClass = STATUS_THEMES[optimisticStatus] || STATUS_THEMES.planning;

  return (
    <div className={`relative mt-1 inline-block ${className}`}>
      <div className="relative inline-flex items-center">
        <select
          value={optimisticStatus}
          onChange={handleChange}
          disabled={disabled || isPending}
          className={`appearance-none pl-2.5 pr-7 py-1 text-[11px] font-bold uppercase rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed ${themeClass}`}
          aria-label="Ubah Status Acara"
        >
          <option value="draft" className="bg-card text-foreground">Draft</option>
          <option value="planning" className="bg-card text-foreground">Planning</option>
          <option value="confirmed" className="bg-card text-foreground">Confirmed</option>
          <option value="ongoing" className="bg-card text-foreground">Ongoing</option>
          <option value="completed" className="bg-card text-foreground">Completed</option>
          <option value="cancelled" className="bg-card text-foreground">Cancelled</option>
        </select>

        <div className="absolute right-2 pointer-events-none flex items-center text-current">
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ChevronDown className="w-3 h-3 opacity-70" />
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-500 font-semibold animate-in fade-in duration-150">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
