"use client";

import { useState } from "react";
import { Layers, Coins, FolderOpen } from "lucide-react";
import { EventCrewSection } from "@/components/events/event-crew-section";
import { EventTasksSection } from "@/components/events/event-tasks-section";
import { EventVendorsSection } from "@/components/events/event-vendors-section";
import { EventFinanceSection } from "@/components/events/event-finance-section";
import { EventDocumentsSection } from "@/components/events/event-documents-section";
import type { Event, EventCrew, Profile, EventTask, EventVendor, Vendor, EventExpense, EventDocument } from "@/types/database";

export function EventDetailTabs({
  event,
  crew,
  tasks,
  allProfiles,
  eventVendors,
  allVendors,
  expenses,
  documents = [],
  canManage = true,
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
  expenses: EventExpense[];
  documents?: EventDocument[];
  canManage?: boolean;
  canManageFinance?: boolean;
  canManageDocuments?: boolean;
  initialTab?: "operations" | "finance" | "documents";
}) {
  const [activeTab, setActiveTab] = useState<"operations" | "finance" | "documents">(initialTab);
  const manageOps = canManage;
  const manageFinance = canManageFinance ?? canManage;
  const manageDocs = canManageDocuments ?? canManage;

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
            {crew.length + tasks.length + eventVendors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finance")}
          className={`pb-3 flex items-center gap-2 border-b-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
            activeTab === "finance"
              ? "border-[#007aff] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Keuangan & Biaya</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">
            {expenses.length}
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
      </div>

      {/* Tab Panels */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <EventCrewSection
            eventId={event.id}
            initialCrew={crew}
            allProfiles={allProfiles}
            canManage={manageOps}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventTasksSection
              eventId={event.id}
              initialTasks={tasks}
              crewProfiles={allProfiles}
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

      {activeTab === "finance" && (
        <EventFinanceSection
          event={event}
          initialExpenses={expenses}
          canManage={manageFinance}
        />
      )}

      {activeTab === "documents" && (
        <EventDocumentsSection
          eventId={event.id}
          initialDocuments={documents}
          canManage={manageDocs}
        />
      )}
    </div>
  );
}

