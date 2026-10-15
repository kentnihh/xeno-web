import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { createVendorAction, deleteVendorAction } from "./actions";
import { Briefcase, Phone, Mail, User, Trash2, Plus } from "lucide-react";

const FALLBACK_VENDORS = [
  {
    id: "1",
    name: "Spectrum Lighting Pro",
    category: "Lighting",
    pic_name: "Budi Santoso",
    phone: "+62 813-1122-3344",
    email: "budi@spectrumlight.id",
    notes: "Moving beam 350W, par LED, laser controller",
  },
  {
    id: "2",
    name: "Sonic Wave Audio",
    category: "Sound System",
    pic_name: "Agus Salim",
    phone: "+62 817-0099-8877",
    email: "info@sonicwave.com",
    notes: "Line array L-Acoustics, digital mixer Allen & Heath",
  },
  {
    id: "3",
    name: "Delight Gourmet Catering",
    category: "Catering",
    pic_name: "Chef Melinda",
    phone: "+62 815-5566-7788",
    email: "melinda@delightgourmet.id",
    notes: "Indonesian & Western buffet, VIP canapes",
  },
];

export default async function VendorsPage() {
  const [canCreateVendor, canDeleteVendor] = await Promise.all([
    hasPermission("vendors.create"),
    hasPermission("vendors.delete"),
  ]);
  const supabase = await createClient();
  const { data: rawVendors } = await supabase.from("vendors").select("*").order("name");

  const vendors = (rawVendors && rawVendors.length > 0) ? rawVendors : FALLBACK_VENDORS;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Database Vendor Mitra</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Daftar mitra teknis pencahayaan, sound system, panggung, dan catering</p>
        </div>
      </div>

      {/* Add Vendor Form */}
      {canCreateVendor && (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createVendorAction(formData);
          }}
          className="apple-card p-5 space-y-4 border border-border shadow-xs"
        >
          <h3 className="text-xs font-bold text-[#007aff] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Tambah Vendor Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="name" required placeholder="Nama Vendor *" className="apple-input px-3.5 py-2 text-xs" />
            <input name="category" required placeholder="Kategori (Lighting, Sound, dll) *" className="apple-input px-3.5 py-2 text-xs" />
            <input name="pic_name" required placeholder="Nama PIC *" className="apple-input px-3.5 py-2 text-xs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="phone" required placeholder="Nomor Telepon PIC *" className="apple-input px-3.5 py-2 text-xs" />
            <input name="email" type="email" placeholder="Email" className="apple-input px-3.5 py-2 text-xs" />
            <input name="notes" placeholder="Catatan spesifikasi/alat" className="apple-input px-3.5 py-2 text-xs" />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className="apple-btn-primary px-4 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30">
              Simpan Vendor
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158]">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{v.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-[#007aff] dark:text-[#3894ff]">{v.category}</span>
                </div>
              </div>

              {canDeleteVendor && (
                <form action={async () => { "use server"; await deleteVendorAction(v.id); }}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Hapus Vendor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-1.5 text-xs font-medium text-muted-foreground pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>PIC: {v.pic_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{v.phone}</span>
              </div>
              {v.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{v.email}</span>
                </div>
              )}
              {v.notes && <div className="text-[11px] text-muted-foreground/70 italic mt-1">{v.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
