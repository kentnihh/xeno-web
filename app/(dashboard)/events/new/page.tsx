import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { createEvent } from "../actions";
import { ArrowLeft, MapPin, User, Building2, FileText } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { Client } from "@/types/database";

export default async function NewEventPage() {
  const canCreate = await hasPermission("events.create");
  if (!canCreate) {
    redirect("/events");
  }

  const supabase = await createClient();
  const { data: clientsData } = await supabase
    .from("clients")
    .select("id, name, company")
    .order("name", { ascending: true });
  const clients = (clientsData as Client[]) || [];

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
          <label htmlFor="use_template" className="text-xs font-medium text-foreground cursor-pointer select-none">
            <span className="font-bold block">Gunakan Template Excel Bawaan?</span>
            <span className="text-muted-foreground text-[11px] block mt-0.5">
              Jika dicentang, 10 template lembar kerja standar (Rundown, Kru, dsb.) akan dibuat otomatis. Jika tidak dicentang, hanya lembar kosong yang akan dibuat.
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
            className="apple-btn-primary px-5 py-2.5 text-xs font-semibold shadow-md shadow-[#007aff]/30"
          >
            Simpan & Terbitkan
          </button>
        </div>
      </form>
    </div>
  );
}
