import Link from "next/link";
import { ShieldAlert, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { MasterTemplatesManager } from "@/components/settings/master-templates-manager";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import type { MasterTemplate } from "@/types/database";

export default async function MasterTemplatesSettingsPage() {
  const isUserAdmin = await isAdmin();

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Akses Ditolak: Khusus Administrator</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Halaman pengaturan master templates hanya dapat diakses oleh staf dengan peran Admin.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Masuk sebagai Admin
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: rawTemplates } = await supabase
    .from("master_templates")
    .select("*")
    .order("order_index", { ascending: true });

  let templates: MasterTemplate[] = (rawTemplates as MasterTemplate[]) || [];

  // Fallback: If DB master_templates table is empty, seed defaults
  if (templates.length === 0) {
    const seedRows = INITIAL_EVENT_SHEETS.map((tpl, idx) => ({
      sheet_name: tpl.name,
      order_index: idx,
      jsonb_structure: tpl.data,
    }));

    const { data: seeded } = await supabase
      .from("master_templates")
      .insert(seedRows)
      .select("*");

    if (seeded && seeded.length > 0) {
      templates = seeded as MasterTemplate[];
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#007aff]">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Pengaturan Blueprint Master Template</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Master Templates Lembar Kerja Dinamis
        </h1>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Ubah konfigurasi kolom, nama kolom, dan isi default template lembar kerja. Seluruh event baru yang dibuat ke depan akan otomatis mengadopsi struktur dari template di bawah ini.
        </p>
      </div>

      <MasterTemplatesManager initialTemplates={templates} />
    </div>
  );
}
