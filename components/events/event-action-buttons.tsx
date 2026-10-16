"use client";

import dynamic from "next/dynamic";
import { EditEventButton } from "@/components/events/edit-event-modal";
import { SyncGCalButton } from "@/components/events/sync-gcal-button";
import type { Event as AppEvent, EventCrew, EventTask, EventExpense, EventSheet } from "@/types/database";

const ExportPdfButton = dynamic(
  () => import("@/components/events/export-pdf-button").then((m) => m.ExportPdfButton),
  { ssr: false }
);

const ExportExcelButton = dynamic(
  () => import("@/components/events/spreadsheet/export-excel-button").then((m) => m.ExportExcelButton),
  { ssr: false }
);

const ExportSpreadsheetPdfButton = dynamic(
  () =>
    import("@/components/events/spreadsheet/export-spreadsheet-pdf-button").then(
      (m) => m.ExportSpreadsheetPdfButton
    ),
  { ssr: false }
);

interface EventActionButtonsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: AppEvent | any;
  sheets: EventSheet[];
  crew: EventCrew[];
  tasks: EventTask[];
  expenses: EventExpense[];
  canEdit?: boolean;
}

export function EventActionButtons({
  event,
  sheets,
  crew,
  tasks,
  expenses,
  canEdit = true,
}: EventActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <SyncGCalButton eventId={event.id} eventTitle={event.title} />
      <ExportExcelButton eventTitle={event.title} sheets={sheets} />
      <ExportSpreadsheetPdfButton eventTitle={event.title} sheets={sheets} />
      {canEdit && <EditEventButton event={event} />}
      <ExportPdfButton
        event={event}
        crew={crew}
        tasks={tasks}
        expenses={expenses}
      />
    </div>
  );
}

