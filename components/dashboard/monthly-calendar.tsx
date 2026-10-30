"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, ExternalLink, X, Clock } from "lucide-react";
import { toDateKey, formatDate } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  venue: string;
  pic?: string | null;
  budget?: number | null;
}

interface Props {
  events: EventItem[];
  title?: string;
  subtitle?: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function MonthlyCalendar({
  events,
  title = "Kalender Acara Bulanan",
  subtitle = "Jadwal seluruh panggung Xeno Entertainment di bulan aktif",
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<{ day: number; events: EventItem[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map events to day numbers
  const eventsByDay: { [day: number]: EventItem[] } = {};
  events.forEach((ev) => {
    const startKey = toDateKey(ev.start_date);
    let endKey = toDateKey(ev.end_date || ev.start_date);
    if (endKey < startKey) endKey = startKey;
    const mm = String(month + 1).padStart(2, "0");
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${mm}-${String(d).padStart(2, "0")}`;
      if (key >= startKey && key <= endKey) {
        if (!eventsByDay[d]) eventsByDay[d] = [];
        eventsByDay[d].push(ev);
      }
    }
  });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Count total double-booked days in this month
  const doubleBookedDaysCount = Object.values(eventsByDay).filter((arr) => arr.length > 1).length;

  return (
    <div className="apple-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff]">
            <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {title}
              </h2>
              {doubleBookedDaysCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  ⚠️ {doubleBookedDaysCount} Bentrok Jadwal
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleToday}
            className="apple-btn-secondary px-3 py-1.5 text-xs font-semibold"
          >
            Hari Ini
          </button>
          <div className="flex items-center bg-muted border border-border rounded-xl p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              title="Bulan Sebelumnya"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-foreground px-3 min-w-[130px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNext}
              title="Bulan Berikutnya"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center font-bold text-[10px] sm:text-[11px] py-1 border-b border-border uppercase tracking-wider">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className={`py-1.5 rounded-lg ${d === "Min"
              ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
              : "text-muted-foreground bg-muted/60"
              }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 min-h-[220px] sm:min-h-[280px]">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div
            key={`blank-${i}`}
            className="min-h-[52px] sm:min-h-[78px] rounded-lg sm:rounded-xl bg-muted/30 border border-dashed border-border/60 opacity-40"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day] || [];
          const isToday = isCurrentMonth && today.getDate() === day;
          const hasEvents = dayEvents.length > 0;
          const isDoubleBooked = dayEvents.length > 1;

          return (
            <div
              key={day}
              onClick={() => hasEvents && setSelectedDayData({ day, events: dayEvents })}
              className={`min-h-[52px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all duration-150 flex flex-col justify-between ${isDoubleBooked
                ? "bg-rose-500/10 border-rose-500 hover:border-rose-600 shadow-sm shadow-rose-500/20 hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-1 ring-rose-500/40"
                : hasEvents
                  ? "bg-[#007aff]/10 border-[#007aff] hover:border-[#007aff] shadow-sm shadow-[#007aff]/15 hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-1 ring-[#007aff]/30"
                  : "bg-card border-border hover:border-primary/50"
                } ${isToday ? "ring-2 ring-[#007aff] ring-offset-2 ring-offset-card font-bold" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${isToday
                    ? "bg-[#007aff] text-white shadow-sm shadow-[#007aff]/50"
                    : isDoubleBooked
                      ? "bg-rose-500 text-white shadow-xs"
                      : hasEvents
                        ? "bg-[#007aff] text-white"
                        : "text-foreground"
                    }`}
                >
                  {day}
                </span>

                {isDoubleBooked ? (
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
                    title="Jadwal Bentrok: Lebih dari 1 acara pada hari ini"
                  >
                    ⚠️ Bentrok ({dayEvents.length})
                  </span>
                ) : hasEvents ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30d158]" />
                  </span>
                ) : null}
              </div>

              {/* Event pill tags */}
              <div className="space-y-1 mt-1">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    title={ev.title}
                    className={`truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-xs transition-colors ${isDoubleBooked
                      ? "bg-rose-600 border border-rose-700 hover:bg-rose-700"
                      : "bg-[#007aff] border border-[#0066d6] hover:bg-[#0066d6]"
                      }`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span
                    className={`text-[9px] font-bold block text-right ${isDoubleBooked ? "text-rose-600 dark:text-rose-400" : "text-[#007aff] dark:text-[#3894ff]"
                      }`}
                  >
                    +{dayEvents.length - 2} lagi
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* In-place Floating Dialog: Eliminates Layout Shifts */}
      {selectedDayData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedDayData(null)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-foreground relative animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-sm ${
                    selectedDayData.events.length > 1
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30"
                  }`}
                >
                  {selectedDayData.day}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Jadwal {selectedDayData.day} {MONTH_NAMES[month]} {year}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDayData.events.length} acara terdaftar pada tanggal ini
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayData(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDayData.events.length > 1 && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2 shrink-0">
                <span className="text-sm mt-0.5">⚠️</span>
                <div className="leading-relaxed">
                  <span className="font-bold">Peringatan Double-Booking:</span> Terdapat {selectedDayData.events.length} acara dijadwalkan pada hari yang sama. Harap pastikan jadwal panggung dan kru lapangan tidak bentrok.
                </div>
              </div>
            )}

            <div className="space-y-2.5 overflow-y-auto pr-1">
              {selectedDayData.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-muted/30 border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#007aff]/60 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{ev.title}</h4>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#007aff] shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    {ev.pic && (
                      <div className="text-[11px] text-muted-foreground font-medium">
                        PIC: <span className="text-foreground/90 font-semibold">{ev.pic}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/events/${ev.id}`}
                    className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shrink-0 self-end sm:self-auto"
                  >
                    <span>Buka Acara</span>
                    <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
