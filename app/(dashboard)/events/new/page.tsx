import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { CreateEventForm } from "@/components/events/create-event-form";
import type { Client } from "@/types/database";

export default async function NewEventPage() {
  const canCreate = await hasPermission("events.create");
  if (!canCreate) {
    redirect("/events");
  }

  const supabase = await createClient();
  const { data: clientsData } = await supabase
    .from("clients")
    .select("id, name, company")
    .order("name", { ascending: true });
  const clients = (clientsData as Client[]) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="apple-btn-secondary p-2 rounded-xl text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Buat Acara Baru</h1>
          <p className="text-xs text-muted-foreground font-medium">Inisialisasi project event dan timeline panggung.</p>
        </div>
      </div>

      <CreateEventForm clients={clients} />
    </div>
  );
}
