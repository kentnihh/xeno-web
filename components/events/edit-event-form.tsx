"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, DollarSign, FileText, Activity, Loader2 } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { updateEvent } from "@/app/(dashboard)/events/actions";

export function EditEventForm({ event }: { event: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultEndDate =
    event.end_date ||
    (event.start_date
      ? new Date(new Date(event.start_date).getTime() + 8 * 3600000).toISOString()
      : new Date().toISOString());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      // ponytail: optimistic local patch skipped; server redirect syncs state
      const res = await updateEvent(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal memperbarui data acara.");
      } else {
        router.push(`/events/${event.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="apple-card p-6 md:p-8 space-y-5 border border-border shadow-xs">
      <input type="hidden" name="id" value={event.id} />
      {event.client_id && <input type="hidden" name="client_id" value={event.client_id} />}

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
          defaultValue={event.start_date}
          required
          withTime
        />
        <DateTimePicker
          name="end_date"
          label="Tanggal & Waktu Selesai"
          defaultValue={defaultEndDate}
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
            <DollarSign className="w-3.5 h-3.5 text-[#30d158]" /> Rencana Anggaran (IDR)
          </label>
          <input
            name="budget"
            type="number"
            min="1"
            step="any"
            defaultValue={event.budget != null ? String(event.budget) : ""}
            placeholder="Opsional — contoh: 250000000"
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
        </div>
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
  );
}
