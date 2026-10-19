"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/users/modal-shell";
import { Combobox } from "@/components/ui/combobox";
import { createClientAction, updateClientAction } from "@/app/(dashboard)/clients/actions";
import {
  Loader2,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  FileText,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import type { Client } from "@/types/database";

export const CLIENT_EVENT_TYPES = [
  { value: "Wedding", label: "Wedding / Pernikahan", icon: Heart },
  { value: "Birthday", label: "Birthday / Ulang Tahun", icon: PartyPopper },
  { value: "Corporate", label: "Corporate / Perusahaan", icon: Building2 },
  { value: "Social Event", label: "Social Event / Komunitas", icon: Sparkles },
  { value: "Lainnya", label: "Lainnya", icon: Calendar },
] as const;

export interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  clientToEdit?: Client | null;
}

export function AddClientModal({ isOpen, onClose, onSuccess, clientToEdit }: AddClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string>("");

  const isEditMode = Boolean(clientToEdit);

  useEffect(() => {
    if (isOpen) {
      setEventType(clientToEdit?.event_type || "");
      setErrorMsg(null);
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    // If event type is not wedding, clear partner data
    if (eventType !== "Wedding") {
      fd.delete("partner_name");
      fd.delete("partner_email");
      fd.delete("partner_phone");
      fd.delete("partner_address");
    }

    startTransition(async () => {
      const res = clientToEdit
        ? await updateClientAction(clientToEdit.id, fd)
        : await createClientAction(fd);

      if (!res.success) {
        setErrorMsg(res.error || (isEditMode ? "Gagal memperbarui klien." : "Gagal menambahkan klien baru."));
      } else {
        setErrorMsg(null);
        form.reset();
        onClose();
        if (onSuccess) {
          onSuccess(isEditMode ? "Data klien berhasil diperbarui!" : "Klien baru berhasil ditambahkan!");
        }
        router.refresh();
      }
    });
  };

  const isWedding = eventType === "Wedding";

  return (
    <ModalShell
      title={isEditMode ? "Edit Data Klien" : "Tambah Klien Baru"}
      subtitle={
        isEditMode
          ? "Perbarui rincian kontak dan profil acara klien"
          : "Tambahkan kontak korporasi atau perorangan klien Xeno"
      }
      onClose={onClose}
      maxWidthClassName={isWedding ? "max-w-3xl" : "max-w-lg"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Tipe Acara (Event Type Dropdown) */}
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-2">
          <label
            htmlFor="client-event-type-select"
            className="block text-xs font-bold text-foreground flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[#007aff]" />
            <span>Tipe Acara (Event Type)</span>
          </label>
          <Combobox
            name="event_type"
            value={eventType}
            onChange={(val) => setEventType(val)}
            disabled={isPending}
            options={[
              { value: "", label: "-- Pilih Tipe Acara (Opsional) --" },
              ...CLIENT_EVENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
            ]}
            allowClear
            placeholder="Pilih Tipe Acara (Opsional)..."
            searchPlaceholder="Cari tipe acara (Wedding, Birthday, dll)..."
            emptyText="Tipe acara tidak ditemukan."
          />
          <p className="text-[11px] text-muted-foreground">
            {isWedding
              ? "✨ Mode Wedding aktif: Form akan menampilkan input ganda untuk Data Mempelai 1 dan Mempelai 2."
              : "Pilih tipe acara untuk menyesuaikan struktur isian kontak klien."}
          </p>
        </div>

        {/* 2. Dynamic Sections: Wedding (Dual Column) vs Standard (Single Client) */}
        {isWedding ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SECTION 1: Data Mempelai 1 */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-500/15">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Data Mempelai 1</h3>
                    <p className="text-[10px] text-muted-foreground">Kontak utama mempelai pertama</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-rose-500" /> Nama Mempelai 1 *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={clientToEdit?.name || ""}
                    placeholder="Contoh: Jessica Tan"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-rose-500" /> No. Telepon Mempelai 1 *
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    defaultValue={clientToEdit?.phone || ""}
                    placeholder="Contoh: +62 812-3456-7890"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-rose-500" /> Email Mempelai 1
                  </label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={clientToEdit?.email || ""}
                    placeholder="Contoh: jessica@example.com"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Alamat Domisili Mempelai 1
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={clientToEdit?.address || ""}
                    placeholder="Contoh: Menteng, Jakarta Pusat"
                    className="apple-input w-full px-3 py-1.5 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* SECTION 2: Data Mempelai 2 */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-500/15">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Data Mempelai 2</h3>
                    <p className="text-[10px] text-muted-foreground">Kontak pasangan mempelai kedua</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-rose-500" /> Nama Mempelai 2
                  </label>
                  <input
                    name="partner_name"
                    type="text"
                    defaultValue={clientToEdit?.partner_name || ""}
                    placeholder="Contoh: Budi Santoso"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-rose-500" /> No. Telepon Mempelai 2
                  </label>
                  <input
                    name="partner_phone"
                    type="tel"
                    defaultValue={clientToEdit?.partner_phone || ""}
                    placeholder="Contoh: +62 813-9876-5432"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-rose-500" /> Email Mempelai 2
                  </label>
                  <input
                    name="partner_email"
                    type="email"
                    defaultValue={clientToEdit?.partner_email || ""}
                    placeholder="Contoh: budi@example.com"
                    className="apple-input w-full px-3 py-2 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Alamat Domisili Mempelai 2
                  </label>
                  <textarea
                    name="partner_address"
                    rows={2}
                    defaultValue={clientToEdit?.partner_address || ""}
                    placeholder="Contoh: Kebayoran Baru, Jakarta Selatan"
                    className="apple-input w-full px-3 py-1.5 text-xs font-medium"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Optional Wedding Family / Organizer notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Keluarga Besar / Penyelenggara (Opsional)
                </label>
                <input
                  name="company"
                  type="text"
                  defaultValue={clientToEdit?.company || ""}
                  placeholder="Contoh: Keluarga Besar Tan & Santoso"
                  className="apple-input w-full px-3 py-2 text-xs font-medium"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Catatan Acara (Opsional)
                </label>
                <input
                  name="notes"
                  type="text"
                  defaultValue={clientToEdit?.notes || ""}
                  placeholder="Contoh: Konsep Garden Party, Akad pagi"
                  className="apple-input w-full px-3 py-2 text-xs font-medium"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD FORM (Single Client) */
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#007aff]" /> Nama Klien *
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={clientToEdit?.name || ""}
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
                defaultValue={clientToEdit?.company || ""}
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
                  defaultValue={clientToEdit?.phone || ""}
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
                  defaultValue={clientToEdit?.email || ""}
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
                defaultValue={clientToEdit?.address || ""}
                placeholder="Contoh: Menteng, Jakarta Pusat"
                className="apple-input w-full px-3.5 py-2 text-xs font-medium"
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#007aff]" /> Catatan Khusus
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={clientToEdit?.notes || ""}
                placeholder="Contoh: Preferensi komunikasi via WhatsApp"
                className="apple-input w-full px-3.5 py-2 text-xs font-medium"
                disabled={isPending}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs font-medium cursor-pointer justify-center text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary w-full sm:w-auto px-5 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isEditMode ? "Simpan Perubahan" : "Simpan Klien"}</span>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
