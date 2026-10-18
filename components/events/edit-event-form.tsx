"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, User, Building2, FileText, Activity, Loader2 } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Combobox } from "@/components/ui/combobox";
import { updateEvent } from "@/app/(dashboard)/events/actions";
import { PostSubmitSyncModal } from "@/components/events/post-submit-sync-modal";
import type { Event, Client } from "@/types/database";

export function EditEventForm({ event, clients = [] }: { event: Event; clients?: Client[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [clientId, setClientId] = useState(event.client_id || "");

  const clientOptions = [
    { value: "", label: "-- Tanpa Klien (Opsional) --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: c.company || undefined,
      badge: c.event_type || undefined,
    })),
  ];

  const defaultEndDate =
    event.end_date ||
    (event.start_date
      ? new Date(new Date(event.start_date).getTime() + 1 * 3600000).toISOString()
      : new Date().toISOString());

  const [startDate, setStartDate] = useState<Date>(
    event.start_date ? new Date(event.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(new Date(defaultEndDate));

  const handleStartDateChange = (newStart: Date) => {
    const duration = endDate.getTime() - startDate.getTime();
    setStartDate(newStart);
    setEndDate(new Date(newStart.getTime() + (duration > 0 ? duration : 3600000)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateEvent(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal memperbarui data acara.");
      } else {
        // Prevent immediate redirect: trigger post-submit sync modal
        setShowSyncModal(true);
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="apple-card p-6 md:p-8 space-y-5 border border-border shadow-xs">
        <input type="hidden" name="id" value={event.id} />

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Nama Acara *</label>
          <input
            name="title"
            type="text"
            required
            defaultValue={event.title}
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
            defaultValue={event.venue}
            placeholder="Contoh: ICE BSD Hall 3, Tangerang"
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>

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
            onChange={setEndDate}
            required
            withTime
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#007aff]" /> Status Acara *
            </label>
            <select
              name="status"
              defaultValue={event.status || "planning"}
              className="apple-input w-full px-3.5 py-2.5 text-xs font-semibold bg-muted border-border cursor-pointer"
            >
              <option value="draft">Draft</option>
              <option value="planning">Planning</option>
              <option value="confirmed">Confirmed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#007aff]" /> PIC (Person In Charge)
            </label>
            <input
              name="pic"
              type="text"
              defaultValue={event.pic || ""}
              placeholder="Contoh: Budi Santoso / Maya"
              className="apple-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#007aff]" /> Klien
          </label>
          <Combobox
            name="client_id"
            value={clientId}
            onChange={setClientId}
            options={clientOptions}
            allowClear
            placeholder="Pilih Klien (Opsional)..."
            searchPlaceholder="Cari nama klien atau perusahaan..."
            emptyText="Klien tidak ditemukan. Tambahkan di menu Klien."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#ff9f0a]" /> Deskripsi Singkat Acara
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description || ""}
            placeholder="Konsep acara, tema panggung, atau catatan rundown khusus..."
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-border">
          <Link
            href={`/events/${event.id}`}
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
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </form>

      {/* Post-Submit Google Calendar Sync Modal */}
      {showSyncModal && (
        <PostSubmitSyncModal
          isOpen={showSyncModal}
          eventId={event.id}
          defaultRedirectUrl={`/events/${event.id}`}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </>
  );
}
