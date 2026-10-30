"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Layers, FolderOpen, FileSpreadsheet, Users, Loader2 } from "lucide-react";
import { EventCrewSection } from "@/components/events/event-crew-section";
import { EventTasksSection } from "@/components/events/event-tasks-section";
import { EventVendorsSection } from "@/components/events/event-vendors-section";
import { EventDocumentsSection } from "@/components/events/event-documents-section";
import { EventFamilyDataSection } from "@/components/events/event-family-data-section";

const EventSpreadsheetTabs = dynamic(
  () =>
    import("@/components/events/spreadsheet/event-spreadsheet-tabs").then(
      (m) => m.EventSpreadsheetTabs
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-card border border-border rounded-3xl p-5 shadow-xs flex flex-col justify-between animate-pulse">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex gap-2">
              <div className="h-8 w-28 bg-muted rounded-xl" />
              <div className="h-8 w-28 bg-muted rounded-xl" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-muted rounded-xl" />
              <div className="h-8 w-24 bg-muted rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted/40 rounded-lg border border-border/30" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <div className="h-7 w-24 bg-muted rounded-lg" />
          <div className="h-7 w-24 bg-muted rounded-lg" />
        </div>
      </div>
    ),
  }
);
import type {
  Event,
  EventCrew,
  Profile,
  EventTask,
  EventVendor,
  Vendor,
  EventExpense,
  EventDocument,
  EventSheet,
  EventPublicForm,
} from "@/types/database";

export function EventDetailTabs({
  event,
  crew,
  tasks,
  allProfiles,
  eventVendors,
  allVendors,
  sheets = [],
  documents = [],
  publicForm = null,
  canManage = true,
  canManageOps,
  canManageSheets,
  canManageFamily,
  canManageFinance,
  canManageDocuments,
  initialTab = "operations",
}: {
  event: Event;
  crew: EventCrew[];
  tasks: EventTask[];
  allProfiles: Profile[];
  eventVendors: EventVendor[];
  allVendors: Vendor[];
  sheets?: EventSheet[];
  expenses?: EventExpense[];
  documents?: EventDocument[];
  publicForm?: EventPublicForm | null;
  canManage?: boolean;
  canManageOps?: boolean;
  canManageSheets?: boolean;
  canManageFamily?: boolean;
  canManageFinance?: boolean; // ponytail: kept for backward compatibility with RBAC test assertions
  canManageDocuments?: boolean;
  initialTab?: "operations" | "documents" | "lembar-kerja" | "data-keluarga" | string;
}) {
  const [activeTab, setActiveTab] = useState<"operations" | "documents" | "lembar-kerja" | "data-keluarga">(
    initialTab === "documents"
      ? "documents"
      : initialTab === "lembar-kerja" || initialTab === "spreadsheets" || initialTab === "sheets"
        ? "lembar-kerja"
        : initialTab === "data-keluarga" || initialTab === "family" || initialTab === "keluarga"
          ? "data-keluarga"
          : "operations"
  );
  const [currentCrew, setCurrentCrew] = useState<EventCrew[]>(crew);
  const manageOps = canManageOps ?? canManage;
  const manageSheets = canManageSheets ?? canManage;
  const manageFamily = canManageFamily ?? canManage;
  const manageDocs = canManageDocuments ?? canManage;

  // Calculate family members count
  let familyCount = 0;
  if (publicForm?.form_data) {
    Object.values(publicForm.form_data).forEach((members) => {
      if (Array.isArray(members)) {
        familyCount += members.length;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Apple-style Segmented Pill Tab Headers */}
      <div className="bg-muted/70 dark:bg-muted/40 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
            activeTab === "operations"
              ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Layers className={`w-4 h-4 ${activeTab === "operations" ? "text-[#007aff]" : ""}`} />
          <span>Operasional Acara</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "operations"
                ? "bg-[#007aff]/15 text-[#007aff]"
                : "bg-muted text-muted-foreground font-medium"
            }`}
          >
            {currentCrew.length + tasks.length + eventVendors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
            activeTab === "documents"
              ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <FolderOpen className={`w-4 h-4 ${activeTab === "documents" ? "text-[#007aff]" : ""}`} />
          <span>Dokumen & Berkas</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "documents"
                ? "bg-[#007aff]/15 text-[#007aff]"
                : "bg-muted text-muted-foreground font-medium"
            }`}
          >
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lembar-kerja")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
            activeTab === "lembar-kerja"
              ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <FileSpreadsheet className={`w-4 h-4 ${activeTab === "lembar-kerja" ? "text-[#007aff]" : ""}`} />
          <span>Lembar Kerja</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "lembar-kerja"
                ? "bg-[#007aff]/15 text-[#007aff]"
                : "bg-muted text-muted-foreground font-medium"
            }`}
          >
            {sheets.length}
          </span>
        </button>

        {/* Dedicated "Data Keluarga" Tab next to "Lembar Kerja" */}
        <button
          type="button"
          onClick={() => setActiveTab("data-keluarga")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
            activeTab === "data-keluarga"
              ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "data-keluarga" ? "text-[#007aff]" : ""}`} />
          <span>Data Keluarga</span>
          {familyCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "data-keluarga"
                  ? "bg-[#007aff]/15 text-[#007aff]"
                  : "bg-muted text-muted-foreground font-medium"
              }`}
            >
              {familyCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <EventCrewSection
            eventId={event.id}
            initialCrew={crew}
            allProfiles={allProfiles}
            canManage={manageOps}
            onCrewChange={setCurrentCrew}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventTasksSection
              eventId={event.id}
              initialTasks={tasks}
              assignedCrew={currentCrew}
              canManage={manageOps}
            />
            <EventVendorsSection
              eventId={event.id}
              initialEventVendors={eventVendors}
              allVendors={allVendors}
              canManage={manageOps}
            />
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <EventDocumentsSection
          eventId={event.id}
          initialDocuments={documents}
          canManage={manageDocs}
        />
      )}

      {activeTab === "lembar-kerja" && (
        <div className="space-y-4">
          <EventSpreadsheetTabs
            eventId={event.id}
            initialSheets={sheets}
            canManage={manageSheets}
            canManageSheets={manageSheets}
            canManageFamily={manageFamily}
            publicForm={publicForm}
          />
        </div>
      )}

      {activeTab === "data-keluarga" && (
        <div className="space-y-4">
          <EventFamilyDataSection
            eventId={event.id}
            initialForm={publicForm}
            canManage={manageFamily}
            variant="full"
          />
        </div>
      )}
    </div>
  );
}

