import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/utils";
import { deleteEvent } from "../actions";
import { getEventSheets } from "../sheet-actions";
import { getOrCreateEventPublicForm } from "../public-form-actions";
import { hasPermission, getUserRoles } from "@/lib/auth";
import { ArrowLeft, Calendar, MapPin, User, Users, Trash2 } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/confirm-modal";
import { EventDetailTabs } from "@/components/events/event-detail-tabs";
import { EventStatusSelect } from "@/components/events/event-status-select";
import { EventActionButtons } from "@/components/events/event-action-buttons";
import type { EventCrew, Profile, EventTask, EventVendor, Vendor, EventExpense, EventDocument } from "@/types/database";



export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const initialTab =
    resolvedSearchParams?.tab === "documents"
      ? "documents"
      : resolvedSearchParams?.tab === "lembar-kerja" ||
        resolvedSearchParams?.tab === "spreadsheets" ||
        resolvedSearchParams?.tab === "sheets"
        ? "lembar-kerja"
        : resolvedSearchParams?.tab === "data-keluarga" ||
          resolvedSearchParams?.tab === "family" ||
          resolvedSearchParams?.tab === "keluarga"
          ? "data-keluarga"
          : "operations";

  const [
    canEditEvent,
    canDeleteEvent,
    canManageOps,
    canManageSheets,
    canManageFamily,
    canManageFinance,
    canManageDocs,
    userRoles,
  ] = await Promise.all([
    hasPermission("events.edit"),
    hasPermission("events.delete"),
    hasPermission("events:operations:manage"),
    hasPermission("events:sheets:manage"),
    hasPermission("events:family:manage"),
    hasPermission("finances.manage"),
    hasPermission("documents.manage"),
    getUserRoles(),
  ]);
  const canSyncGCal = userRoles.includes("admin") || userRoles.includes("manager");
  const supabase = await createClient();

  const [
    { data: rawEvent },
    { data: rawTasks },
    { data: rawCrew },
    { data: rawProfiles },
    { data: rawEventVendors },
    { data: rawAllVendors },
    { data: rawExpenses },
    { data: rawDocuments },
    sheets,
    publicForm,
  ] = await Promise.all([
    supabase.from("events").select("*, client:clients(*)").eq("id", id).single(),
    supabase.from("event_tasks").select("*, assignee:profiles(*)").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("event_crew").select("*, profile:profiles(*)").eq("event_id", id),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("event_vendors").select("*, vendor:vendors(*)").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("event_expenses").select("*").eq("event_id", id).order("expense_date", { ascending: false }),
    supabase.from("event_documents").select("*, uploader:profiles(*)").eq("event_id", id).order("created_at", { ascending: false }),
    getEventSheets(id),
    (async () => {
      try {
        return (await getOrCreateEventPublicForm(id)) ?? null;
      } catch {
        return null;
      }
    })(),
  ]);

  if (!rawEvent) {
    notFound();
  }

  const event = rawEvent;
  const tasks: EventTask[] = (rawTasks as EventTask[]) || [];
  const eventVendors: EventVendor[] = (rawEventVendors as EventVendor[]) || [];
  const allVendors: Vendor[] = rawAllVendors || [];
  const allProfiles: Profile[] = (rawProfiles as Profile[]) || [];
  const crew: EventCrew[] = rawCrew || [];
  const expenses: EventExpense[] = (rawExpenses as EventExpense[]) || [];
  const documents: EventDocument[] = (rawDocuments as EventDocument[]) || [];


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="apple-btn-secondary p-2 rounded-xl text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#007aff] dark:text-[#3894ff] font-bold">
              Detail Acara
            </span>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{event.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <EventActionButtons
            event={event}
            sheets={sheets}
            crew={crew}
            tasks={tasks}
            expenses={expenses}
            canEdit={canEditEvent}
            canSync={canSyncGCal}
            publicForm={publicForm}
          />

          {canDeleteEvent && (
            <DeleteConfirmButton
              title="Konfirmasi Hapus Acara"
              itemName={event.title}
              onConfirm={async () => {
                "use server";
                await deleteEvent(event.id);
              }}
              triggerClassName="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-semibold border border-rose-500/20 dark:border-rose-500/30 transition-all cursor-pointer active:scale-[0.98]"
              triggerTitle="Hapus Acara"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Acara</span>
            </DeleteConfirmButton>
          )}
        </div>
      </div>

      <div className="apple-card p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 border border-border shadow-xs">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
          <EventStatusSelect eventId={event.id} initialStatus={event.status} disabled={!canEditEvent} />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Venue</div>
          <div className="text-xs font-bold text-foreground mt-1.5 truncate flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#007aff]" />
            <span>{event.venue}</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Jadwal</div>
          <div className="text-xs font-bold text-foreground mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#007aff]" />
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">PIC</div>
          <div className="text-xs font-bold text-foreground mt-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#007aff]" />
            <span>{event.pic || "-"}</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Pax</div>
          <div className="text-xs font-bold text-foreground mt-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#007aff]" />
            <span>{event.pax ? `${event.pax.toLocaleString("id-ID")} Pax` : "-"}</span>
          </div>
        </div>
      </div>

      {/* Event Modules & Administration Tabs (Operasional, Dokumen, Lembar Kerja) */}
      <section className="pt-2 border-t border-border">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-foreground">Modul & Administrasi Acara</h2>
          <p className="text-xs text-muted-foreground">
            Manajemen kru operasional, vendor pihak ketiga, berkas dokumen, dan lembar kerja spreadsheet.
          </p>
        </div>
        <EventDetailTabs
          event={event}
          crew={crew}
          tasks={tasks}
          allProfiles={allProfiles}
          eventVendors={eventVendors}
          allVendors={allVendors}
          sheets={sheets}
          expenses={expenses}
          documents={documents}
          publicForm={publicForm}
          canManage={canEditEvent}
          canManageOps={canManageOps}
          canManageSheets={canManageSheets}
          canManageFamily={canManageFamily}
          canManageFinance={canManageFinance}
          canManageDocuments={canManageDocs}
          initialTab={initialTab}
        />
      </section>
    </div>
  );
}
