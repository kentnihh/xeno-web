import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIDR, formatDate } from "@/lib/utils";
import { deleteEvent } from "../actions";
import { getEventSheets } from "../sheet-actions";
import { hasPermission } from "@/lib/auth";
import { ArrowLeft, Calendar, MapPin, Coins, Trash2 } from "lucide-react";
import { EventDetailTabs } from "@/components/events/event-detail-tabs";
import { EventStatusSelect } from "@/components/events/event-status-select";
import { EventActionButtons } from "@/components/events/event-action-buttons";
import { EventSpreadsheetTabs } from "@/components/events/spreadsheet/event-spreadsheet-tabs";
import type { EventStatus, EventCrew, Profile, EventTask, EventVendor, Vendor, EventExpense, EventDocument } from "@/types/database";

const FALLBACK_EVENT = {
  title: "Sinar Jaya Annual Gala 2026",
  venue: "Grand Ballroom Hotel Indonesia",
  start_date: "2026-10-20T11:00:00.000Z",
  end_date: "2026-10-20T19:00:00.000Z",
  budget: 250000000,
  status: "confirmed" as EventStatus,
};

const FALLBACK_CREW_PROFILES: Profile[] = [
  { id: "usr-1", full_name: "Jonathan Admin", email: "admin@xenoent.com", role: "admin", phone: "+62 812-1111-2222", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "usr-2", full_name: "Rian Kru Operasional", email: "staf@xenoent.com", role: "staff", phone: "+62 813-3333-4444", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

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
      : resolvedSearchParams?.tab === "finance"
      ? "finance"
      : "operations";

  const [canEditEvent, canDeleteEvent, canManageFinance, canManageDocs] = await Promise.all([
    hasPermission("events.edit"),
    hasPermission("events.delete"),
    hasPermission("finances.manage"),
    hasPermission("documents.manage"),
  ]);
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
  ]);

  const event = rawEvent || { id, ...FALLBACK_EVENT };
  const tasks: EventTask[] = (rawTasks as EventTask[]) || [];
  const eventVendors: EventVendor[] = (rawEventVendors as EventVendor[]) || [];
  const allVendors: Vendor[] = rawAllVendors || [];
  const allProfiles = rawProfiles && rawProfiles.length > 0 ? rawProfiles : FALLBACK_CREW_PROFILES;
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
          />

          {canDeleteEvent && (
            <form action={async () => { "use server"; await deleteEvent(event.id); }}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-semibold border border-rose-500/20 dark:border-rose-500/30 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Acara</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="apple-card p-5 grid grid-cols-2 md:grid-cols-4 gap-4 border border-border shadow-xs">
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
            <span>{formatDate(event.start_date)}</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Budget</div>
          <div className="text-xs font-bold text-emerald-600 dark:text-[#30d158] mt-1.5 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>{event.budget != null ? formatIDR(event.budget) : "Tidak Ditentukan"}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Spreadsheet UI (Horizontal Tabs & Inline Data Grid) */}
      <section className="space-y-3">
        <EventSpreadsheetTabs
          eventId={event.id}
          initialSheets={sheets}
          canManage={canEditEvent}
        />
      </section>

      {/* Additional Event Modules: Operasional, Keuangan, Dokumen */}
      <section className="pt-6 border-t border-border">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-foreground">Modul & Administrasi Acara</h2>
          <p className="text-xs text-muted-foreground">Manajemen kru internal, vendor pihak ketiga, pencatatan biaya riil, dan dokumen lampiran.</p>
        </div>
        <EventDetailTabs
          event={event}
          crew={crew}
          tasks={tasks}
          allProfiles={allProfiles}
          eventVendors={eventVendors}
          allVendors={allVendors}
          expenses={expenses}
          documents={documents}
          canManage={canEditEvent}
          canManageFinance={canManageFinance}
          canManageDocuments={canManageDocs}
          initialTab={initialTab}
        />
      </section>
    </div>
  );
}
