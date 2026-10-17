import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { isAdmin, hasPermission } from "@/lib/auth";
import {
  getMasterTemplates,
  getMasterFamilyTemplate,
} from "@/app/(dashboard)/settings/templates/actions";
import { TemplatesTabsView } from "@/components/settings/templates-tabs-view";

export default async function MasterTemplatesSettingsPage() {
  const canAccess = (await isAdmin()) || (await hasPermission("templates.manage"));

  if (!canAccess) {
    redirect("/dashboard");
  }

  const [templates, familyTemplate] = await Promise.all([
    getMasterTemplates(),
    getMasterFamilyTemplate(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#007aff]">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Pengaturan Blueprint Master Template</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Master Templates Lembar Kerja & Formulir Publik
        </h1>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Ubah konfigurasi blueprint lembar kerja Excel dan formulir publik data keluarga. Seluruh acara baru yang dibuat ke depan akan otomatis mengadopsi struktur template di bawah ini.
        </p>
      </div>

      <TemplatesTabsView
        initialTemplates={templates}
        initialFamilyTemplate={familyTemplate}
      />
    </div>
  );
}
