import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { deleteClientAction } from "./actions";
import { Users, Phone, Mail, MapPin, Trash2 } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/confirm-modal";
import { AddClientSection } from "@/components/clients/add-client-section";
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
    .order("name", { ascending: true });

  if (error) {
    console.error("[ClientsPage] Error fetching clients:", error.message);
  }

  const clients: Client[] =
    rawClients && rawClients.length > 0
      ? (rawClients as Client[])
      : rawClients && rawClients.length === 0
      ? []
      : FALLBACK_CLIENTS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Database Klien</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Daftar kontak korporasi & individu klien Xeno Entertainment
          </p>
        </div>

        <AddClientSection canCreate={canCreateClient} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-tight">{client.name}</h3>
                    <span className="text-xs text-[#007aff] dark:text-[#3894ff] font-semibold">
                      {client.company || "Personal"}
                    </span>
                  </div>
                </div>

                {canDeleteClient && (
                  <DeleteConfirmButton
                    title="Konfirmasi Hapus Klien"
                    itemName={client.name}
                    onConfirm={async () => {
                      "use server";
                      await deleteClientAction(client.id);
                    }}
                    triggerClassName="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    triggerTitle="Hapus Klien"
                  >
                    <Trash2 className="w-4 h-4" />
                  </DeleteConfirmButton>
                )}
              </div>

              <div className="space-y-1.5 text-xs font-medium text-muted-foreground pt-3 mt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
