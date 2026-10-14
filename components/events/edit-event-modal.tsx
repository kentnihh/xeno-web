"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, MapPin, DollarSign, FileText, Activity } from "lucide-react";
import { ModalShell } from "@/components/users/modal-shell";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { updateEvent } from "@/app/(dashboard)/events/actions";
import type { Event } from "@/types/database";

export interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

export function EditEventModal({ isOpen, onClose, event }: EditEventModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
      // ponytail: client optimistic update skipped; server revalidation provides source of truth
      const res = await updateEvent(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal memperbarui acara.");
      } else {
        onClose();
        startTransition(() => {
          router.refresh();
        });
      }
    });
  };

  return (
    <ModalShell
      title="Edit Informasi Acara"
      subtitle="Perbarui jadwal, venue, status, dan rencana anggaran"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="id" value={event.id} />
        {event.client_id && <input type="hidden" name="client_id" value={event.client_id} />}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">Nama Acara *</label>
          <input
            name="title"
            type="text"
            required
            defaultValue={event.title}
            placeholder="Astra National Convention 2026"
            className="apple-input w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#007aff]" /> Lokasi / Venue *
          </label>
          <input
            name="venue"
            type="text"
            required
            defaultValue={event.venue}
            placeholder="ICE BSD Hall 3, Tangerang"
            className="apple-input w-full px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateTimePicker name="start_date" label="Mulai" defaultValue={event.start_date} required withTime />
          <DateTimePicker name="end_date" label="Selesai" defaultValue={defaultEndDate} required withTime />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#007aff]" /> Status Acara *
            </label>
            <select
              name="status"
              defaultValue={event.status || "planning"}
              className="apple-input w-full px-3 py-2 text-xs font-semibold bg-muted border-border cursor-pointer"
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
            <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#30d158]" /> Rencana Anggaran (IDR)
            </label>
            <input
              name="budget"
              type="number"
              min="1"
              step="any"
              defaultValue={event.budget != null ? String(event.budget) : ""}
              placeholder="Opsional (> 0)"
              className="apple-input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#ff9f0a]" /> Deskripsi Acara
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description || ""}
            placeholder="Konsep acara, tema panggung, atau rundown..."
            className="apple-input w-full px-3 py-2 text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-border">
          <button type="button" onClick={onClose} disabled={isPending} className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer">
            Batal
          </button>
          <button type="submit" disabled={isPending} className="apple-btn-primary px-5 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Menyimpan...</span></> : <span>Simpan Perubahan</span>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function EditEventButton({
  event,
  className = "",
  variant = "default",
}: {
  event: Event;
  className?: string;
  variant?: "default" | "icon";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleClick}
          className={`p-1.5 rounded-xl text-muted-foreground hover:text-[#007aff] hover:bg-muted/80 transition-all cursor-pointer ${className}`}
          title="Edit Acara"
          aria-label="Edit Acara"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition-all cursor-pointer shadow-xs active:scale-[0.98] ${className}`}
          title="Edit Acara"
        >
          <Pencil className="w-3.5 h-3.5 text-[#007aff]" />
          <span>Edit Acara</span>
        </button>
      )}

      {isOpen && (
        <EditEventModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          event={event}
        />
      )}
    </>
  );
}

