import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { EditEventForm } from "@/components/events/edit-event-form";
import type { EventStatus } from "@/types/database";

const FALLBACK_EVENT = {
  title: "Sinar Jaya Annual Gala 2026",
  venue: "Grand Ballroom Hotel Indonesia",
  start_date: "2026-10-20T11:00:00.000Z",
  end_date: "2026-10-20T19:00:00.000Z",
  pic: "Jonathan Admin",
  status: "confirmed" as EventStatus,
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canEdit = await hasPermission("events.edit");
  if (!canEdit) {
    redirect(`/events/${id}`);
  }
  const supabase = await createClient();

  const [{ data: rawEvent }, { data: rawClients }] = await Promise.all([
    supabase.from("events").select("*, client:clients(*)").eq("id", id).single(),
    supabase.from("clients").select("*").order("name"),
  ]);

  const event = rawEvent || { id, ...FALLBACK_EVENT };
  const clients = rawClients || [];

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/events/${event.id}`}
          className="apple-btn-secondary p-2 rounded-xl text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Edit Informasi Acara</h1>
          <p className="text-xs text-muted-foreground font-medium">{event.title}</p>
        </div>
      </div>

      <EditEventForm event={event} clients={clients} />
    </div>
  );
}
