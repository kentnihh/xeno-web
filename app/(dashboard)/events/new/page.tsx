import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth";
import { createEvent } from "../actions";
import { ArrowLeft, MapPin, DollarSign, FileText } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";

export default async function NewEventPage() {
  const canCreate = await hasPermission("events.create");
  if (!canCreate) {
    redirect("/events");
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="apple-btn-secondary p-2 rounded-xl text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Buat Acara Baru</h1>
          <p className="text-xs text-muted-foreground font-medium">Inisialisasi project event dan timeline panggung.</p>
        </div>
      </div>

      <form action={createEvent} className="apple-card p-6 md:p-8 space-y-5 border border-border shadow-xs">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateTimePicker
            name="start_date"
            label="Tanggal & Waktu Mulai"
            required
            withTime
          />
          <DateTimePicker
            name="end_date"
            label="Tanggal & Waktu Selesai"
            required
            withTime
          />
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
            placeholder="Opsional — contoh: 250000000"
            className="apple-input w-full px-3.5 py-2.5 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">
            Dapat dikosongkan. Jika diisi, nilai harus lebih besar dari 0 (&gt; 0).
          </p>
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
            className="apple-btn-primary px-5 py-2.5 text-xs font-semibold shadow-md shadow-[#007aff]/30"
          >
            Simpan & Terbitkan
          </button>
        </div>
      </form>
    </div>
  );
}
