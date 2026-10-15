"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/users/modal-shell";
import { createClientAction } from "@/app/(dashboard)/clients/actions";
import { Loader2, AlertCircle, Building2, User, Phone, Mail, MapPin } from "lucide-react";

export interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const res = await createClientAction(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal menambahkan klien baru.");
      } else {
        setErrorMsg(null);
        form.reset();
        onClose();
        if (onSuccess) {
          onSuccess("Klien berhasil ditambahkan!");
        }
        router.refresh();
      }
    });
  };

  return (
    <ModalShell
      title="Tambah Klien Baru"
      subtitle="Tambahkan kontak korporasi atau perorangan klien Xeno"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#007aff]" /> Nama Klien *
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Contoh: Jessica Tan / Budi Santoso"
            className="apple-input w-full px-3.5 py-2.5 text-xs font-medium"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#007aff]" /> Perusahaan / Instansi
          </label>
          <input
            name="company"
            type="text"
            placeholder="Contoh: PT Sinar Jaya Abadi (kosongkan jika perorangan)"
            className="apple-input w-full px-3.5 py-2.5 text-xs font-medium"
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#007aff]" /> Nomor Telepon *
            </label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="Contoh: +62 812-3456-7890"
              className="apple-input w-full px-3.5 py-2.5 text-xs font-medium"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#007aff]" /> Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Contoh: jessica@example.com"
              className="apple-input w-full px-3.5 py-2.5 text-xs font-medium"
              disabled={isPending}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#007aff]" /> Alamat Kantor / Domisili
          </label>
          <textarea
            name="address"
            rows={2}
            placeholder="Contoh: Menteng, Jakarta Pusat"
            className="apple-input w-full px-3.5 py-2 text-xs font-medium"
            disabled={isPending}
          />
        </div>

        <div className="pt-3 flex justify-end gap-2.5 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary px-5 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Klien</span>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
