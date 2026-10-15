import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, hasPermission } from "@/lib/auth";
import { MasterTemplatesManager } from "@/components/settings/master-templates-manager";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import type { MasterTemplate } from "@/types/database";

export default async function MasterTemplatesSettingsPage() {
  const canAccess = (await isAdmin()) || (await hasPermission("templates.manage"));

  if (!canAccess) {
    redirect("/dashboard");
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
