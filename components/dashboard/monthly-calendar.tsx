"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, ExternalLink } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  venue: string;
  pic?: string | null;
  budget?: number | null;
  status: string;
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
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventItem[] | null>(null);

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
    const evDate = new Date(ev.start_date);
    if (evDate.getFullYear() === year && evDate.getMonth() === month) {
      const d = evDate.getDate();
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(ev);
    }
  });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Count total double-booked days in this month
  const doubleBookedDaysCount = Object.values(eventsByDay).filter((arr) => arr.length > 1).length;

  return (
    <div className="apple-card p-6 space-y-4">
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

      <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-[11px] py-1 border-b border-border uppercase tracking-wider">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className={`py-1.5 rounded-lg ${
              d === "Min"
                ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                : "text-muted-foreground bg-muted/60"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 min-h-[280px]">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div
            key={`blank-${i}`}
            className="min-h-[78px] rounded-xl bg-muted/30 border border-dashed border-border/60 opacity-40"
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
              onClick={() => hasEvents && setSelectedDayEvents(dayEvents)}
              className={`min-h-[78px] p-2 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isDoubleBooked
                  ? "bg-rose-500/10 border-rose-500 hover:border-rose-600 shadow-sm shadow-rose-500/20 hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-1 ring-rose-500/40"
                  : hasEvents
                  ? "bg-[#007aff]/10 border-[#007aff] hover:border-[#007aff] shadow-sm shadow-[#007aff]/15 hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-1 ring-[#007aff]/30"
                  : "bg-card border-border hover:border-primary/50"
              } ${isToday ? "ring-2 ring-[#007aff] ring-offset-2 ring-offset-card font-bold" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
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
                    className={`truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-xs transition-colors ${
                      isDoubleBooked
                        ? "bg-rose-600 border border-rose-700 hover:bg-rose-700"
                        : "bg-[#007aff] border border-[#0066d6] hover:bg-[#0066d6]"
                    }`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span
                    className={`text-[9px] font-bold block text-right ${
                      isDoubleBooked ? "text-rose-600 dark:text-rose-400" : "text-[#007aff] dark:text-[#3894ff]"
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

      {selectedDayEvents && (
        <div
          className={`p-4 rounded-2xl border-2 space-y-3 shadow-md ${
            selectedDayEvents.length > 1
              ? "bg-rose-500/10 border-rose-500"
              : "bg-muted/50 border-[#007aff]"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                selectedDayEvents.length > 1 ? "text-rose-600 dark:text-rose-400" : "text-[#007aff]"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              Acara Terpilih ({selectedDayEvents.length})
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDayEvents(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 rounded-md hover:bg-muted transition-colors"
            >
              Tutup
            </button>
          </div>

          {selectedDayEvents.length > 1 && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">Peringatan Double-Booking:</span> Terdapat {selectedDayEvents.length} acara dijadwalkan pada hari yang sama. Harap pastikan jadwal panggung dan kru lapangan tidak bentrok.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex justify-between items-center gap-2 hover:border-[#007aff] transition-colors"
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground">{ev.title}</h4>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#007aff]" /> {ev.venue}
                  </div>
                  {ev.pic && (
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      PIC: {ev.pic}
                    </div>
                  )}
                </div>
                <Link
                  href={`/events/${ev.id}`}
                  className="apple-btn-primary px-3 py-1.5 text-xs font-semibold gap-1 shrink-0"
                >
                  <span>Detail</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
