"use client";

import { useState } from "react";
import { Layers, FolderOpen, FileSpreadsheet, Users } from "lucide-react";
import { EventCrewSection } from "@/components/events/event-crew-section";
import { EventTasksSection } from "@/components/events/event-tasks-section";
import { EventVendorsSection } from "@/components/events/event-vendors-section";
import { EventDocumentsSection } from "@/components/events/event-documents-section";
import { EventSpreadsheetTabs } from "@/components/events/spreadsheet/event-spreadsheet-tabs";
import { EventFamilyDataSection } from "@/components/events/event-family-data-section";
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
  const manageOps = canManage;
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
      {/* Segmented Tab Headers */}
      <div className="flex border-b border-border gap-6 text-xs font-semibold overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
            activeTab === "operations"
              ? "border-[#007aff] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Operasional Acara</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">
            {currentCrew.length + tasks.length + eventVendors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
            activeTab === "documents"
              ? "border-[#007aff] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Dokumen & Berkas</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lembar-kerja")}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
            activeTab === "lembar-kerja"
              ? "border-[#007aff] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Lembar Kerja</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">
            {sheets.length}
          </span>
        </button>

        {/* Dedicated "Data Keluarga" Tab next to "Lembar Kerja" */}
        <button
          type="button"
          onClick={() => setActiveTab("data-keluarga")}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
            activeTab === "data-keluarga"
              ? "border-[#007aff] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Keluarga</span>
          {familyCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">
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
            canManage={manageOps}
            publicForm={publicForm}
          />
        </div>
      )}

      {activeTab === "data-keluarga" && (
        <div className="space-y-4">
          <EventFamilyDataSection
            eventId={event.id}
            initialForm={publicForm}
            canManage={manageOps}
            variant="full"
          />
        </div>
      )}
    </div>
  );
}

