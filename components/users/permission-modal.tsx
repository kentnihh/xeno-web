"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createPermission } from "@/app/(dashboard)/users/actions";
import { ModalShell } from "./modal-shell";

export function PermissionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const res = await createPermission(formData);
        if (res.error) {
          setError(res.error);
        } else {
          const permName = (formData.get("name") as string) || "Izin";
          onSuccess?.(`Izin "${permName}" berhasil dibuat.`);
          onClose();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat izin.");
      }
    });
  }

  return (
    <ModalShell
      title="Tambah Izin Baru"
      subtitle="Definisikan izin otorisasi sistem baru untuk modul aplikasi"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kode Izin <span className="text-[#ff453a]">*</span>
            </label>
            <input
              name="id"
              required
              placeholder="misal: finance:reports"
              className="apple-input w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Modul <span className="text-[#ff453a]">*</span>
            </label>
            <select
              name="module"
              defaultValue="events"
              className="apple-input w-full px-3.5 py-2 text-sm cursor-pointer bg-muted text-foreground border-border"
            >
              <option value="events" className="bg-card text-foreground">Acara & Event</option>
              <option value="clients" className="bg-card text-foreground">Database Klien</option>
              <option value="vendors" className="bg-card text-foreground">Database Vendor</option>
              <option value="tasks" className="bg-card text-foreground">Tugas & Kru</option>
              <option value="users" className="bg-card text-foreground">Manajemen Pengguna</option>
              <option value="system" className="bg-card text-foreground">Sistem</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Nama Izin <span className="text-[#ff453a]">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="misal: Lihat Laporan Finansial"
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Deskripsi</label>
          <input
            name="description"
            placeholder="Penjelasan hak tindakan..."
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Simpan Izin</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
