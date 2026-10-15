"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
} from "lucide-react";
import { AddClientModal } from "./add-client-modal";
import { DeleteConfirmButton } from "@/components/ui/confirm-modal";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import type { Client } from "@/types/database";

export interface ClientsViewProps {
  initialClients: Client[];
  canCreateClient: boolean;
  canDeleteClient: boolean;
}

export function ClientsView({
  initialClients,
  canCreateClient,
  canDeleteClient,
}: ClientsViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return initialClients;
    const q = search.toLowerCase();
    return initialClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [initialClients, search]);

  const stats = useMemo(() => {
    const total = initialClients.length;
    const corporate = initialClients.filter((c) => !!c.company).length;
    const personal = total - corporate;
    return { total, corporate, personal };
  }, [initialClients]);

  const handleDelete = (clientId: string) => {
    startTransition(async () => {
      const res = await deleteClientAction(clientId);
      if (!res.success) {
        showToast(res.error || "Gagal menghapus klien.", "error");
      } else {
        showToast("Klien berhasil dihapus.", "success");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Database Klien</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Daftar kontak korporasi & individu klien Xeno Entertainment
          </p>
        </div>

        {canCreateClient && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="apple-btn-primary px-4 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Klien</span>
          </button>
        )}
      </div>

      {/* 2. KPI Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="apple-card p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#007aff]/15 text-[#007aff] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Total Klien</div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.total}</div>
          </div>
        </div>

        <div className="apple-card p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Klien Korporasi</div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.corporate}</div>
          </div>
        </div>

        <div className="apple-card p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-[#30d158] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Klien Personal</div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.personal}</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari klien berdasarkan nama, perusahaan, email, atau telepon..."
          className="apple-input w-full pl-9 pr-4 py-2.5 text-xs font-medium"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="apple-card p-12 text-center border border-border rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <Users className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Tidak Ada Klien Ditemukan</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
            {search
              ? `Tidak ada hasil yang cocok dengan kata kunci "${search}".`
              : "Belum ada klien terdaftar. Klik 'Tambah Klien' untuk menambahkan klien pertama."}
          </p>
          {canCreateClient && !search && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="apple-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Klien Baru
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => (
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
                      onConfirm={async () => handleDelete(client.id)}
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
      )}

      {/* 5. Add Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => showToast(msg, "success")}
      />

      {/* 6. Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card border shadow-xl shadow-black/20 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "border-emerald-500/30 text-emerald-600 dark:text-[#30d158]"
              : "border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
