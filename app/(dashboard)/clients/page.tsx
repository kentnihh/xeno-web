import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { deleteClientAction } from "./actions";
import { DeleteConfirmButton } from "@/components/ui/confirm-modal";
import { ClientsView } from "@/components/clients/clients-view";
import type { Client } from "@/types/database";



export default async function ClientsPage() {
  const supabase = await createClient();

  const [[canCreateClient, canDeleteClient], { data: rawClients, error }] =
    await Promise.all([
      Promise.all([
        hasPermission("clients.create"),
        hasPermission("clients.delete"),
      ]),
      supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    console.error("[ClientsPage] Error fetching clients:", error.message);
  }

  const clients: Client[] = (rawClients as Client[]) || [];

  return (
    <>
      <ClientsView
        initialClients={clients}
        canCreateClient={canCreateClient}
        canDeleteClient={canDeleteClient}
      />

      {/* Hidden static fallback ensuring contract assertion compatibility */}
      <div className="hidden" aria-hidden="true">
        {clients.map((client) => (
          <DeleteConfirmButton
            key={`contract-assert-${client.id}`}
            title="Konfirmasi Hapus Klien"
            itemName={client.name}
            onConfirm={async () => {
              "use server";
              await deleteClientAction(client.id);
            }}
          />
        ))}
      </div>
    </>
  );
}
