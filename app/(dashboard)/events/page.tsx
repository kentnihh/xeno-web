import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, getUserRoles } from "@/lib/auth";
import { formatDate, sortEventsUpcomingFirst } from "@/lib/utils";
import {
  CalendarDays,
  Plus,
  MapPin,
  Building2,
  ChevronRight,
  List,
  ChevronLeft,
} from "lucide-react";
import { EditEventButton } from "@/components/events/edit-event-modal";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { EventSearchBar } from "@/components/dashboard/event-search-bar";
import {
  EventStatusBadge,
  EventCountdownBadge,
} from "@/components/events/event-status-badge";
import { SyncGCalButton } from "@/components/events/sync-gcal-button";
import type { Event, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const FALLBACK_EVENTS: Event[] = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "Sinar Jaya Annual Gala 2026",
    start_date: "2026-10-20T11:00:00.000Z",
    end_date: "2026-10-20T19:00:00.000Z",
    venue: "Grand Ballroom Hotel Indonesia Kempinski",
    pic: "Jonathan Admin",
    status: "confirmed",
    description: "Annual gala dinner Xeno production",
    client_id: "c-1",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    client: { id: "c-1", name: "Rian Pratama", company: "PT Sinar Jaya Abadi", email: null, phone: "", address: null, notes: null, created_at: "" },
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    title: "Jessica & Kevin Wedding Reception",
    start_date: "2026-10-29T11:00:00.000Z",
    end_date: "2026-10-29T17:00:00.000Z",
    venue: "Plataran Dharmawangsa",
    pic: "Rian Kru Operasional",
    status: "planning",
    description: "Wedding reception ceremony and celebration",
    client_id: "c-2",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    client: { id: "c-2", name: "Jessica Tan", company: "Tan & Partners", email: null, phone: "", address: null, notes: null, created_at: "" },
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    title: "Jakarta Jazz Festival Production 2026",
    start_date: "2026-09-15T09:00:00.000Z",
    end_date: "2026-09-15T23:00:00.000Z",
    venue: "Carnaval Circuit Ancol",
    pic: "Budi Show Director",
    status: "completed",
    description: "Stage management and audio production",
    client_id: "c-1",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    client: { id: "c-1", name: "Rian Pratama", company: "PT Sinar Jaya Abadi", email: null, phone: "", address: null, notes: null, created_at: "" },
  },
];

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "active", label: "Aktif" },
  { key: "past", label: "Terlewat" },
  { key: "all", label: "Semua Status" },
  { key: "planning", label: "Planning" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Batal" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; view?: string }>;
}) {
  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved?.page || "1", 10) || 1);
  const statusFilter = resolved?.status || "active";
  const viewMode = resolved?.view === "calendar" ? "calendar" : "list";
  const isPastFilter = statusFilter === "past" || statusFilter === "terlewat";

  const supabase = await createClient();

  // 1. Identify current logged-in user and role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile: Profile | null = null;
  let userRoles: string[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = profile as Profile | null;
    userRoles = await getUserRoles(user.id);
  }

  const isAdminUser = userProfile?.role === "admin" || userRoles.includes("admin");
  const isManagerUser = userProfile?.role === "manager" || userRoles.includes("manager");
  const isPrivileged = isAdminUser || isManagerUser;
  const isStaff = !isPrivileged;
  const canSyncGCal = isPrivileged;

  // 2. If user is STAFF: fetch assigned event IDs from event_crew
  let assignedEventIds: string[] = [];
  if (isStaff && user?.id) {
    const { data: crewData } = await supabase
      .from("event_crew")
      .select("event_id")
      .eq("profile_id", user.id);

    assignedEventIds = (crewData || []).map((c) => c.event_id).filter(Boolean);
  }

  const [canCreateEvent, canEditEvent] = await Promise.all([
    hasPermission("events.create"),
    hasPermission("events.edit"),
  ]);

  // Timezone-safe start of today (beginning of day at 00:00:00.000)
  // Stripping the time so events happening today are considered "Aktif" and not "Terlewat"
  const now = new Date();
  const localTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const jakartaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const jakartaTodayStart = new Date(`${jakartaDate}T00:00:00+07:00`);
  const todayStart = localTodayStart < jakartaTodayStart ? localTodayStart : jakartaTodayStart;
  const todayStartISO = todayStart.toISOString();

  let query = supabase
    .from("events")
    .select("*, client:clients(*)", { count: "exact" })
    .order("start_date", { ascending: isPastFilter ? false : true });

  if (isStaff) {
    if (assignedEventIds.length > 0) {
      query = query.in("id", assignedEventIds);
    } else {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (isPastFilter) {
    query = query.lt("start_date", todayStartISO);
  } else if (statusFilter === "active") {
    query = query.neq("status", "completed").gte("start_date", todayStartISO);
  } else if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (viewMode === "list") {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);
  }

  const { data: rawEvents, count } = await query;

  let allSearchQuery = supabase
    .from("events")
    .select("id, title, start_date, venue, status, pic")
    .order("start_date", { ascending: true });

  if (isStaff) {
    if (assignedEventIds.length > 0) {
      allSearchQuery = allSearchQuery.in("id", assignedEventIds);
    } else {
      allSearchQuery = allSearchQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data: allSearchEvents } = await allSearchQuery;

  let eventsList: Event[] = [];
  if (rawEvents && rawEvents.length > 0) {
    eventsList = rawEvents as Event[];
  } else if (!isStaff) {
    eventsList = FALLBACK_EVENTS.filter((ev) => {
      const isPast = new Date(ev.start_date).getTime() < todayStart.getTime();

      if (isPastFilter) {
        return isPast;
      }
      if (statusFilter === "active") {
        return ev.status !== "completed" && !isPast;
      }
      if (statusFilter !== "all") {
        return ev.status === statusFilter;
      }
      return true;
    });
  } else {
    eventsList = [];
  }

  const events = sortEventsUpcomingFirst(eventsList);
  const totalCount = count ?? events.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const searchableList = (allSearchEvents && allSearchEvents.length > 0
    ? allSearchEvents
    : isStaff
      ? []
      : FALLBACK_EVENTS) as Event[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Manajemen Acara
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Kelola seluruh portofolio produksi dan jadwal panggung Xeno Entertainment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {canSyncGCal && <SyncGCalButton canSync={canSyncGCal} />}
          {canCreateEvent && (
            <Link
              href="/events/new"
              className="apple-btn-primary px-4 py-2 text-xs font-bold gap-2 w-full sm:w-fit justify-center shadow-lg shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Acara Baru</span>
            </Link>
          )}
        </div>
      </div>

      {/* Controls Bar: Cmd+K Search + View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-lg">
          <EventSearchBar events={searchableList} />
        </div>

        {/* List vs Calendar Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border shrink-0 self-start md:self-auto">
          <Link
            href={`/events?view=list&status=${statusFilter}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </Link>
          <Link
            href={`/events?view=calendar&status=${statusFilter}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Kalender</span>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {STATUS_FILTERS.map((f) => {
          const isActive =
            statusFilter === f.key ||
            (f.key === "past" && isPastFilter);
          return (
            <Link
              key={f.key}
              href={`/events?status=${f.key}&view=${viewMode}`}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-[#007aff] text-white border-[#007aff] shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border hover:border-foreground/20"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Content View: Calendar or List */}
      {viewMode === "calendar" ? (
        <MonthlyCalendar events={events} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            {events.length === 0 ? (
              <div className="apple-card p-12 text-center text-xs text-muted-foreground space-y-2">
                <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-foreground text-sm">
                  Tidak ada acara ditemukan
                </p>
                <p>
                  {isPastFilter
                    ? "Tidak ada riwayat acara yang telah terlewat."
                    : "Coba ubah filter status atau tambahkan acara baru ke portofolio."}
                </p>
              </div>
            ) : (
              events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="apple-card-interactive p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group rounded-2xl border border-border shadow-xs hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-foreground group-hover:text-[#007aff] transition-colors">
                        {event.title}
                      </span>
                      <EventCountdownBadge startDate={event.start_date} />
                      <EventStatusBadge status={event.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#007aff]" />
                        {event.venue}
                      </span>
                      {event.client && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#007aff]" />
                          {event.client.company || event.client.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[#007aff]" />
                        {formatDate(event.start_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-left md:text-right space-y-0.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        PIC
                      </div>
                      <div className="text-xs font-semibold text-foreground">
                        {event.pic || "-"}
                      </div>
                    </div>
                    {canEditEvent && (
                      <div className="flex items-center">
                        <EditEventButton event={event} variant="icon" />
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-[#007aff] group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <span className="text-muted-foreground font-medium">
                Halaman {page} dari {totalPages} ({totalCount} acara)
              </span>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/events?page=${page - 1}&status=${statusFilter}&view=${viewMode}`}
                    className="apple-btn-secondary px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sebelumnya
                  </Link>
                ) : (
                  <button
                    disabled
                    className="apple-btn-secondary px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 opacity-40 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sebelumnya
                  </button>
                )}

                {page < totalPages ? (
                  <Link
                    href={`/events?page=${page + 1}&status=${statusFilter}&view=${viewMode}`}
                    className="apple-btn-secondary px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
                  >
                    Berikutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="apple-btn-secondary px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 opacity-40 cursor-not-allowed"
                  >
                    Berikutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
