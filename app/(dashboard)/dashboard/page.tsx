import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { formatDate, sortEventsUpcomingFirst, sortTasksByPriority } from "@/lib/utils";
import { CalendarDays, Plus, MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { EventSearchBar } from "@/components/dashboard/event-search-bar";
import { PriorityTasksWidget } from "@/components/dashboard/priority-tasks-widget";
import { EventStatusBadge, EventCountdownBadge } from "@/components/events/event-status-badge";

export const dynamic = "force-dynamic";

const FALLBACK_EVENTS = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "Sinar Jaya Annual Gala 2026",
    start_date: "2026-10-20T11:00:00.000Z",
    venue: "Grand Ballroom Hotel Indonesia",
    status: "confirmed",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    title: "Jessica & Kevin Wedding Reception",
    start_date: "2026-10-29T11:00:00.000Z",
    venue: "Plataran Dharmawangsa",
    status: "planning",
  },
];

const FALLBACK_TASKS = [
  {
    id: "t1",
    title: "Finalize Rundown with MC",
    description: "Meeting dengan MC dan show director di venue",
    priority: "high",
    status: "todo",
    due_date: "2026-10-18T10:00:00.000Z",
    event: { id: "66666666-6666-6666-6666-666666666666", title: "Sinar Jaya Gala" },
    assignee: { full_name: "Budi Santoso", role: "Show Director" },
  },
  {
    id: "t2",
    title: "Sound Check 20kW Rig",
    description: "Cek line array dan mixer digital",
    priority: "urgent",
    status: "in_progress",
    due_date: "2026-10-19T14:00:00.000Z",
    event: { id: "66666666-6666-6666-6666-666666666666", title: "Sinar Jaya Gala" },
    assignee: { full_name: "Reza Fikri", role: "Audio Engineer" },
  },
  {
    id: "t3",
    title: "Briefing Vendor Katering & Dekorasi",
    description: "Sinkronisasi loading dock dan jadwal pemasangan",
    priority: "medium",
    status: "todo",
    due_date: "2026-10-25T09:00:00.000Z",
    event: { id: "77777777-7777-7777-7777-777777777777", title: "Jessica & Kevin Wedding Reception" },
    assignee: { full_name: "Maya Anggraini", role: "Event Coordinator" },
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: rawEvents } = await supabase
    .from("events")
    .select("*, client:clients(*)")
    .order("start_date", { ascending: true });

  const { data: rawTasks } = await supabase
    .from("event_tasks")
    .select("*, event:events(id, title), assignee:profiles(id, full_name, role)");

  const eventsList = rawEvents && rawEvents.length > 0 ? rawEvents : FALLBACK_EVENTS;
  const events = sortEventsUpcomingFirst(eventsList);
  const tasksList = rawTasks && rawTasks.length > 0 ? rawTasks : FALLBACK_TASKS;
  const tasks = sortTasksByPriority(tasksList);

  const canCreateEvent = await hasPermission("events.create");

  const pendingTasksCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ringkasan acara, kru, dan vendor Xeno Entertainment
          </p>
        </div>
        {canCreateEvent && (
          <Link
            href="/events/new"
            className="apple-btn-primary px-4 py-2 text-xs font-bold gap-2 w-fit shadow-lg shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="apple-card p-5 space-y-2 border border-border shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Acara Aktif</span>
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
            <span>Tugas Pending</span>
            <div className="w-7 h-7 rounded-lg bg-[#ff9f0a]/15 flex items-center justify-center text-[#ff9f0a]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {pendingTasksCount}
          </div>
        </div>
      </div>

      <MonthlyCalendar events={events} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Jadwal Acara Terdekat
            </h2>
            <Link
              href="/events"
              className="text-xs text-[#007aff] hover:underline font-bold"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {events.slice(0, 5).map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="apple-card-interactive block p-4 rounded-xl border border-border shadow-xs hover:shadow-md hover:border-[#007aff] transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm group-hover:text-[#007aff] transition-colors truncate">
                        {ev.title}
                      </span>
                      <EventCountdownBadge startDate={ev.start_date} />
                      <EventStatusBadge status={ev.status} />
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
            ))}
          </div>
        </div>

        <div>
          <PriorityTasksWidget tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
