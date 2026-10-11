import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIDR, formatDate } from "@/lib/utils";
import { CalendarDays, Plus, MapPin, Building2, ChevronRight } from "lucide-react";

const FALLBACK_EVENTS = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "Sinar Jaya Annual Gala 2026",
    start_date: "2026-10-20T11:00:00.000Z",
    end_date: "2026-10-20T19:00:00.000Z",
    venue: "Grand Ballroom Hotel Indonesia Kempinski",
    budget: 250000000,
    status: "confirmed",
    client: { name: "Rian Pratama", company: "PT Sinar Jaya Abadi" },
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    title: "Jessica & Kevin Wedding Reception",
    start_date: "2026-10-29T11:00:00.000Z",
    end_date: "2026-10-29T17:00:00.000Z",
    venue: "Plataran Dharmawangsa",
    budget: 180000000,
    status: "planning",
    client: { name: "Jessica Tan", company: "Tan & Partners" },
  },
];

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: rawEvents } = await supabase
    .from("events")
    .select("*, client:clients(*)")
    .order("start_date", { ascending: true });

  const events = (rawEvents && rawEvents.length > 0) ? rawEvents : FALLBACK_EVENTS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Manajemen Acara
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Kelola seluruh portofolio produksi dan jadwal panggung Xeno Entertainment.
          </p>
        </div>
        <Link
          href="/events/new"
          className="apple-btn-primary px-4 py-2 text-xs font-bold gap-2 w-fit shadow-lg shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Buat Acara Baru</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="apple-card-interactive p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group rounded-2xl border border-border shadow-xs hover:shadow-md transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-foreground group-hover:text-[#007aff] transition-colors">
                  {event.title}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    event.status === "confirmed"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30"
                  }`}
                >
                  {event.status}
                </span>
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

            <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
              <div className="text-left md:text-right">
                <div className="text-xs font-medium text-muted-foreground">
                  Estimasi Budget
                </div>
                <div className="text-sm font-bold text-emerald-600 dark:text-[#30d158]">
                  {event.budget != null ? formatIDR(event.budget) : "-"}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-[#007aff] group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
