import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIDR, formatDate } from "@/lib/utils";
import { CalendarDays, Clock, Coins, Plus, ArrowUpRight, MapPin, ChevronRight } from "lucide-react";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";

const FALLBACK_EVENTS = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "Sinar Jaya Annual Gala 2026",
    start_date: "2026-10-20T11:00:00.000Z",
    venue: "Grand Ballroom Hotel Indonesia",
    budget: 250000000,
    status: "confirmed",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    title: "Jessica & Kevin Wedding Reception",
    start_date: "2026-10-29T11:00:00.000Z",
    venue: "Plataran Dharmawangsa",
    budget: 180000000,
    status: "planning",
  },
];

const FALLBACK_TASKS = [
  {
    id: "t1",
    title: "Finalize Rundown with MC",
    priority: "high",
    event: { title: "Sinar Jaya Gala" },
  },
  {
    id: "t2",
    title: "Sound Check 20kW Rig",
    priority: "urgent",
    event: { title: "Sinar Jaya Gala" },
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
    .select("*, event:events(title)")
    .eq("status", "todo")
    .limit(4);

  const events = (rawEvents && rawEvents.length > 0) ? rawEvents : FALLBACK_EVENTS;
  const tasks = (rawTasks && rawTasks.length > 0) ? rawTasks : FALLBACK_TASKS;

  const totalBudget = events.reduce((acc, ev) => acc + Number(ev.budget || 0), 0);

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
        <Link
          href="/events/new"
          className="apple-btn-primary px-4 py-2 text-xs font-bold gap-2 w-fit shadow-lg shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Buat Acara</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span>Kelolaan Budget</span>
            <div className="w-7 h-7 rounded-lg bg-[#30d158]/15 flex items-center justify-center text-[#30d158]">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {formatIDR(totalBudget)}
          </div>
        </div>

        <div className="apple-card p-5 space-y-2 border border-border shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Tugas Pending</span>
            <div className="w-7 h-7 rounded-lg bg-[#ff9f0a]/15 flex items-center justify-center text-[#ff9f0a]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Monthly Interactive Calendar */}
      <MonthlyCalendar events={events} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Daftar Acara Mendatang
            </h2>
            <Link
              href="/events"
              className="text-xs text-[#007aff] hover:text-[#0066d6] font-semibold inline-flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {events.slice(0, 4).map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="apple-card-interactive block p-4 group rounded-xl border border-border hover:border-[#007aff] shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm group-hover:text-[#007aff] transition-colors truncate">
                        {ev.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          ev.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30"
                        }`}
                      >
                        {ev.status}
                      </span>
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
                      <div className="text-xs text-emerald-600 dark:text-[#30d158] font-bold">
                        {ev.budget != null ? formatIDR(ev.budget) : "-"}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-[#007aff] group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="apple-card p-6 space-y-4">
          <div className="pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Tugas Kru Prioritas
            </h2>
          </div>
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href="/events"
                className="apple-card-interactive block p-3.5 rounded-xl border border-border shadow-xs hover:shadow-md hover:border-[#007aff] transition-all group"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-foreground group-hover:text-[#007aff] transition-colors leading-tight">
                    {task.title}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      task.priority === "urgent"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : task.priority === "high"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border text-[11px] font-medium text-muted-foreground">
                  <span className="truncate">
                    Acara: {task.event?.title || "Xeno Production"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-[#007aff] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
