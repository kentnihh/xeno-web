"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileSpreadsheet, Users, Sparkles } from "lucide-react";
import { MasterTemplatesManager } from "./master-templates-manager";
import { MasterFamilyTemplatesManager } from "./master-family-templates-manager";
import type { MasterTemplate, MasterFamilyTemplate } from "@/types/database";

interface TemplatesTabsViewProps {
  initialTemplates: MasterTemplate[];
  initialFamilyTemplate: MasterFamilyTemplate;
}

export function TemplatesTabsView({
  initialTemplates,
  initialFamilyTemplate,
}: TemplatesTabsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") === "family" ? "family" : "sheets";
  const [activeTab, setActiveTab] = useState<"sheets" | "family">(currentTab);

  const switchTab = (tab: "sheets" | "family") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === "family") {
      params.set("tab", "family");
    } else {
      params.delete("tab");
    }
    const queryString = params.toString();
    router.replace(`/settings/templates${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border w-fit max-w-full overflow-x-auto scrollbar-none">
        <button
          type="button"
          id="tab-sheets-blueprint"
          onClick={() => switchTab("sheets")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${activeTab === "sheets"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
            }`}
        >
          <FileSpreadsheet
            className={`w-4 h-4 ${activeTab === "sheets" ? "text-[#007aff]" : "text-muted-foreground"
              }`}
          />
          <span>Master Lembar Kerja (Excel)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
            {initialTemplates.length} Sheets
          </span>
        </button>

        <button
          type="button"
          id="tab-family-blueprint"
          onClick={() => switchTab("family")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${activeTab === "family"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
            }`}
        >
          <Users
            className={`w-4 h-4 ${activeTab === "family" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
              }`}
          />
          <span>Master Template Data Keluarga</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
            Formulir Publik
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "sheets" ? (
        <div id="panel-sheets-blueprint" className="animate-in fade-in duration-150">
          <MasterTemplatesManager initialTemplates={initialTemplates} />
        </div>
      ) : (
        <div id="panel-family-blueprint" className="animate-in fade-in duration-150">
          <MasterFamilyTemplatesManager initialTemplate={initialFamilyTemplate} />
        </div>
      )}
    </div>
  );
}
