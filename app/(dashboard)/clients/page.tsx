import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { ClientsView } from "@/components/clients/clients-view";
import type { Client } from "@/types/database";

const FALLBACK_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Rian Pratama",
    company: "PT Sinar Jaya Abadi",
    phone: "+62 812-3456-7890",
    email: "rian@sinarjaya.co.id",
    address: "Sudirman SCBD Lot 8, Jakarta Selatan",
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Jessica Tan",
    company: "Tan & Partners",
    phone: "+62 819-8765-4321",
    email: "jessica.tan@gmail.com",
    address: "Menteng, Jakarta Pusat",
    notes: null,
    created_at: new Date().toISOString(),
  },
];

export default async function ClientsPage() {
  const [canCreateClient, canDeleteClient] = await Promise.all([
    hasPermission("clients.create"),
    hasPermission("clients.delete"),
  ]);

  const supabase = await createClient();
  const { data: rawClients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ClientsPage] Error fetching clients:", error.message);
  }

  const clients: Client[] = rawClients && rawClients.length > 0 ? (rawClients as Client[]) : (rawClients && rawClients.length === 0 ? [] : FALLBACK_CLIENTS);

  return (
    <ClientsView
      initialClients={clients}
      canCreateClient={canCreateClient}
      canDeleteClient={canDeleteClient}
    />
  );
}
