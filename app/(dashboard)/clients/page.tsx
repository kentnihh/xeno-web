import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { createClientAction, deleteClientAction } from "./actions";
import { Users, Phone, Mail, MapPin, Trash2, Plus } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/confirm-modal";

const FALLBACK_CLIENTS = [
  {
    id: "1",
    name: "Rian Pratama",
    company: "PT Sinar Jaya Abadi",
    phone: "+62 812-3456-7890",
    email: "rian@sinarjaya.co.id",
    address: "Sudirman SCBD Lot 8, Jakarta Selatan",
  },
  {
    id: "2",
    name: "Jessica Tan",
    company: "Tan & Partners",
    phone: "+62 819-8765-4321",
    email: "jessica.tan@gmail.com",
    address: "Menteng, Jakarta Pusat",
  },
];

export default async function ClientsPage() {
  const [canCreateClient, canDeleteClient] = await Promise.all([
    hasPermission("clients.create"),
    hasPermission("clients.delete"),
  ]);
  const supabase = await createClient();
  const { data: rawClients } = await supabase.from("clients").select("*").order("name");

  const clients = (rawClients && rawClients.length > 0) ? rawClients : FALLBACK_CLIENTS;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Database Klien</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Daftar kontak korporasi & individu klien Xeno Entertainment</p>
        </div>
      </div>

      {/* Add Client Form */}
      {canCreateClient && (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createClientAction(formData);
          }}
          className="apple-card p-5 space-y-4 border border-border shadow-xs"
        >
          <h3 className="text-xs font-bold text-[#007aff] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Tambah Klien Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input name="name" required placeholder="Nama Klien *" className="apple-input px-3.5 py-2 text-xs" />
            <input name="company" placeholder="Perusahaan" className="apple-input px-3.5 py-2 text-xs" />
            <input name="phone" required placeholder="Nomor Telepon *" className="apple-input px-3.5 py-2 text-xs" />
            <input name="email" type="email" placeholder="Email" className="apple-input px-3.5 py-2 text-xs" />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className="apple-btn-primary px-4 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30">
              Simpan Klien
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{client.name}</h3>
                  <span className="text-xs text-[#007aff] dark:text-[#3894ff] font-semibold">{client.company || "Personal"}</span>
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

            <div className="space-y-1.5 text-xs font-medium text-muted-foreground pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
