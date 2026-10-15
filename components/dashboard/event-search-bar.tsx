"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CalendarDays, MapPin, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { EventStatusBadge, EventCountdownBadge } from "@/components/events/event-status-badge";
import type { EventStatus } from "@/types/database";

export interface SearchableEvent {
  id: string;
  title: string;
  start_date: string;
  venue: string;
  status: EventStatus | string;
  pic?: string | null;
  budget?: number | null;
}

export function EventSearchBar({ events }: { events: SearchableEvent[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q ? events.filter((e) => e.title.toLowerCase().includes(q)) : [];

  const selectEvent = (id: string) => {
    setIsOpen(false);
    setQuery("");
    setIdx(0);
    startTransition(() => router.push(`/events/${id}`));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !matches.length) {
      if (e.key === "Escape") setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && matches[idx]) {
      e.preventDefault();
      selectEvent(matches[idx].id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none stroke-[2.2]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIdx(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Cari judul acara..."
          className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground shadow-xs focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIdx(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-muted-foreground bg-muted border border-border rounded-lg">
              <span>⌘K</span>
            </kbd>
          )}
        </div>
      </div>

      {isOpen && q && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden max-h-[380px] overflow-y-auto">
          <div className="p-2 border-b border-border bg-muted/40 flex items-center justify-between text-[11px] font-medium text-muted-foreground px-3">
            <span>Hasil Pencarian Judul ({matches.length})</span>
            <span className="hidden sm:inline">Tekan ↵ untuk memilih</span>
          </div>
          {matches.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Tidak ada acara ditemukan untuk &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {matches.map((ev, i) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => selectEvent(ev.id)}
                  onMouseEnter={() => setIdx(i)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    i === idx
                      ? "bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30"
                      : "hover:bg-muted text-foreground border border-transparent"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">
                        {ev.title}
                      </span>
                      <EventCountdownBadge startDate={ev.start_date} />
                      <EventStatusBadge status={ev.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#007aff] shrink-0" />
                        <span className="truncate">{ev.venue}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <CalendarDays className="w-3 h-3 text-[#007aff]" />
                        {formatDate(ev.start_date)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
