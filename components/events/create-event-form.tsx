"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, User, Building2, FileText, Loader2 } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createEvent } from "@/app/(dashboard)/events/actions";
import { PostSubmitSyncModal } from "@/components/events/post-submit-sync-modal";
import type { Client } from "@/types/database";

interface CreateEventFormProps {
  clients: Client[];
}

export function CreateEventForm({ clients }: CreateEventFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // Initialize start date (rounded to the nearest hour)
  const initialStart = new Date();
  initialStart.setMinutes(0, 0, 0);

  // Default end date: exactly 1 hour after initial start
  const initialEnd = new Date(initialStart.getTime() + 1 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState<Date>(initialStart);
  const [endDate, setEndDate] = useState<Date>(initialEnd);

  // 1. Form State Listener & 2. Auto-Fill Logic:
  // Whenever the user selects or changes start_date, automatically update end_date
  // to match the exact same date and set time to exactly 1 hour after start_date.
  const handleStartDateChange = (newStart: Date) => {
    setStartDate(newStart);

    // Calculate smart default: exactly 1 hour after the newly selected start_date
    const autoCalculatedEnd = new Date(newStart.getTime() + 1 * 60 * 60 * 1000);
    setEndDate(autoCalculatedEnd);
  };

  // 3. Keep it Editable:
  // The user can still manually select or change end_date to any day/time (e.g. multi-day event).
  const handleEndDateChange = (newEnd: Date) => {
    setEndDate(newEnd);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createEvent(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal membuat acara baru.");
      } else if (res.eventId) {
        // Prevent immediate redirect: trigger post-submit sync modal
        setCreatedEventId(res.eventId);
        setShowSyncModal(true);
      }
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="apple-card p-6 md:p-8 space-y-5 border border-border shadow-xs"
      >
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Nama Acara *
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="Contoh: Astra National Convention 2026"
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#007aff]" /> Lokasi / Venue *
          </label>
          <input
            name="venue"
            type="text"
            required
            placeholder="Contoh: ICE BSD Hall 3, Tangerang"
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* Synchronized Date Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateTimePicker
            name="start_date"
            label="Tanggal & Waktu Mulai"
            value={startDate}
            onChange={handleStartDateChange}
            required
            withTime
          />
          <DateTimePicker
            name="end_date"
            label="Tanggal & Waktu Selesai"
            value={endDate}
            onChange={handleEndDateChange}
            required
            withTime
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#007aff]" /> PIC (Person In Charge)
            </label>
            <input
              name="pic"
              type="text"
              placeholder="Contoh: Budi Santoso / Maya"
              className="apple-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#007aff]" /> Klien
            </label>
            <select
              name="client_id"
              defaultValue=""
              className="apple-input w-full px-3.5 py-2.5 text-sm bg-muted border-border cursor-pointer"
            >
              <option value="">Pilih Klien (Opsional)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
          <input
            id="use_template"
            name="use_template"
            type="checkbox"
            defaultChecked
            value="true"
            className="mt-0.5 h-4 w-4 rounded border-border text-[#007aff] focus:ring-[#007aff] cursor-pointer"
          />
          <label
            htmlFor="use_template"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            <span className="font-bold block">Gunakan Template Excel Bawaan?</span>
            <span className="text-muted-foreground text-[11px] block mt-0.5">
              Jika dicentang, 10 template lembar kerja standar (Rundown, Kru, dsb.)
              akan dibuat otomatis. Jika tidak dicentang, hanya lembar kosong yang
              akan dibuat.
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#ff9f0a]" /> Deskripsi Singkat Acara
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Konsep acara, tema panggung, atau catatan rundown khusus..."
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-border">
          <Link
            href="/events"
            className="apple-btn-secondary px-4 py-2.5 text-xs font-medium"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary px-5 py-2.5 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan & Terbitkan</span>
            )}
          </button>
        </div>
      </form>

      {/* Post-Submit Google Calendar Sync Modal */}
      {showSyncModal && createdEventId && (
        <PostSubmitSyncModal
          isOpen={showSyncModal}
          eventId={createdEventId}
          defaultRedirectUrl={`/events/${createdEventId}`}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </>
  );
}
