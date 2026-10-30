import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, getUserRoles, getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { formatDate, sortEventsUpcomingFirst, sortTasksByPriority } from "@/lib/utils";
import { CalendarDays, Plus, MapPin, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { EventSearchBar } from "@/components/dashboard/event-search-bar";
import { PriorityTasksWidget } from "@/components/dashboard/priority-tasks-widget";
import { EventCountdownBadge } from "@/components/events/event-status-badge";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";



export default async function DashboardPage() {
  const supabase = await createClient();

  // Timezone-safe start of today (beginning of day at 00:00:00.000)
  // Ensures events happening today are included and not prematurely excluded as past events.
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

  // 1. Fetch Current User, Profile, Roles, and Permission concurrently (cached request deduplication)
  const [user, userProfile, userRoles, canCreateEvent] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getUserRoles(),
    hasPermission("events.create"),
  ]);

  const currentUserId = user?.id;
  const isAdminUser = userProfile?.role === "admin" || userRoles.includes("admin");
  const isManagerUser = userProfile?.role === "manager" || userRoles.includes("manager");
  const isPrivileged =
    isAdminUser || isManagerUser || userProfile?.role?.toLowerCase() === "super_admin";
  const isStaff = !isPrivileged;

  // 2. If user is STAFF: fetch assigned event IDs from event_crew
  let assignedEventIds: string[] = [];
  if (isStaff && currentUserId) {
    const { data: crewData } = await supabase
      .from("event_crew")
      .select("event_id")
      .eq("profile_id", currentUserId);

    assignedEventIds = (crewData || []).map((c) => c.event_id).filter(Boolean);
  }

  // 3. Active Events query (filter for STAFF: only assigned events)
  let eventsQuery = supabase
    .from("events")
    .select("*, client:clients(*)")
    .gte("start_date", todayStart.toISOString())
    .order("start_date", { ascending: true });

  if (isStaff) {
    if (assignedEventIds.length > 0) {
      eventsQuery = eventsQuery.in("id", assignedEventIds);
    } else {
      eventsQuery = eventsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 4. Total Events query (for STAFF: only assigned events)
  let totalEventsQuery = supabase
    .from("events")
    .select("id", { count: "exact", head: true });

  if (isStaff) {
    if (assignedEventIds.length > 0) {
      totalEventsQuery = totalEventsQuery.in("id", assignedEventIds);
    } else {
      totalEventsQuery = totalEventsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 5. Tasks query (for STAFF: assigned ONLY to current user, incomplete/pending, ordered by priority)
  let tasksQuery = supabase
    .from("event_tasks")
    .select("*, event:events(id, title), assignee:profiles!assigned_to(id, full_name, role), creator:profiles!created_by(id, full_name, role)");

  if (isStaff) {
    if (currentUserId) {
      tasksQuery = tasksQuery
        .eq("assigned_to", currentUserId)
        .neq("status", "done")
        .order("priority", { ascending: false });
    } else {
      tasksQuery = tasksQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // Execute all dashboard queries in parallel
  const [
    { data: rawEvents },
    totalEventsRes,
    { data: rawTasks },
  ] = await Promise.all([
    eventsQuery,
    totalEventsQuery,
    tasksQuery,
  ]);

  const totalEventsCount = totalEventsRes.count ?? 0;
  const eventsList = rawEvents || [];
  const events = sortEventsUpcomingFirst(eventsList);

  const tasksList = rawTasks || [];
  const tasks = sortTasksByPriority(tasksList);
  const pendingTasksCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isStaff
              ? "Ringkasan penugasan acara dan tugas kru Anda di Xeno Entertainment"
              : "Ringkasan acara, kru, dan vendor Xeno Entertainment"}
          </p>
        </div>
        {canCreateEvent && (
          <Link
            href="/events/new"
            className="apple-btn-primary px-4 py-2 text-xs font-bold gap-2 w-full sm:w-fit justify-center shadow-lg shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Acara</span>
          </Link>
        )}
      </div>

      {/* Global Cmd+K Event Search */}
      <div className="max-w-xl">
        <EventSearchBar events={events} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="apple-card p-5 space-y-2 border border-border shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>{isStaff ? "Acara Ditugaskan (Aktif)" : "Acara Aktif"}</span>
            <div className="w-7 h-7 rounded-lg bg-[#007aff]/15 flex items-center justify-center text-[#007aff]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {events.length}
          </div>
        </div>

        <div className="apple-card p-5 space-y-2 border border-border shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>{isStaff ? "Total Acara Ditugaskan" : "Total Acara"}</span>
            <div className="w-7 h-7 rounded-lg bg-[#bf5af2]/15 flex items-center justify-center text-[#bf5af2]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {totalEventsCount}
          </div>
        </div>

        <div className="apple-card p-5 space-y-2 border border-border shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>{isStaff ? "Tugas Saya (Pending)" : "Tugas Pending"}</span>
            <div className="w-7 h-7 rounded-lg bg-[#ff9f0a]/15 flex items-center justify-center text-[#ff9f0a]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {pendingTasksCount}
          </div>
        </div>
      </div>

      {/* 4. Kalender Acara Bulanan & Jadwal Terdekat (Bersebelahan di Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kalender (Rasio 7:5 di Desktop) */}
        <div className="lg:col-span-7">
          <MonthlyCalendar events={events} />
        </div>

        {/* Kolom Jadwal Acara Terdekat (Rasio 7:5 di Desktop) */}
        <div className="lg:col-span-5 apple-card p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              {isStaff ? "Jadwal Acara Saya Terdekat" : "Jadwal Acara Terdekat"}
            </h2>
            <Link
              href="/events"
              className="text-xs text-[#007aff] hover:underline font-bold"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {isStaff
                  ? "Belum ada jadwal acara yang ditugaskan kepada Anda saat ini."
                  : "Tidak ada jadwal acara aktif saat ini."}
              </div>
            ) : (
              events.slice(0, 6).map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="apple-card-interactive block p-3.5 sm:p-4 rounded-xl border border-border shadow-xs hover:shadow-md hover:border-[#007aff] transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm group-hover:text-[#007aff] transition-colors truncate">
                          {ev.title}
                        </span>
                        <EventCountdownBadge startDate={ev.start_date} />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#007aff] shrink-0" />
                        <span className="truncate">{ev.venue}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right space-y-0.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatDate(ev.start_date)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-[#007aff] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Tugas Kru Prioritas (Full Width 100%) */}
      <div className="w-full">
        <PriorityTasksWidget tasks={tasks} />
      </div>
    </div>
  );
}
