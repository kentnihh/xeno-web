import React from "react";
import { getEventCountdown, CountdownTone } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  confirmed: {
    label: "Dikonfirmasi",
    className: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border-[#007aff]/30",
  },
  ongoing: {
    label: "Sedang Berjalan",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  planning: {
    label: "Perencanaan",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  },
  completed: {
    label: "Selesai",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  draft: {
    label: "Draft",
    className: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  },
};

/**
 * Renders a color-coded status badge for events.
 * Yellow/Orange for 'In Progress' / 'ongoing' / 'planning', Green for 'Complete' / 'completed',
 * Blue for 'confirmed', Gray for 'draft', Red for 'cancelled'.
 */
export function EventStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const conf = STATUS_CONFIG[status.toLowerCase()] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${conf.className} ${className}`}
    >
      {conf.label}
    </span>
  );
}

const COUNTDOWN_STYLES: Record<CountdownTone, string> = {
  today: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-extrabold animate-pulse",
  tomorrow: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold",
  upcoming: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border-[#007aff]/30 font-bold",
  past: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30 font-medium",
};

/**
 * Renders a countdown badge for an event (e.g. "Hari Ini", "Besok", "H-3", "Lewat 2h").
 */
export function EventCountdownBadge({
  startDate,
  className = "",
}: {
  startDate: string;
  className?: string;
}) {
  const { label, tone } = getEventCountdown(startDate);

  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${COUNTDOWN_STYLES[tone]} ${className}`}
      title={tone === "today" ? "Hari Ini (Happening Today)" : tone === "tomorrow" ? "Besok (Tomorrow)" : label}
    >
      {tone === "today" && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
      )}
      {label}
    </span>
  );
}
