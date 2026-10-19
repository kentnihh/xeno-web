"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import type { Profile } from "@/types/database";

export const PRESET_ROLES = [
  "LO",
  "LO Family",
  "Food and Beverage",
  "Front Desk",
  "Multi Media",
  "Lightning Operator",
  "Sound Operator",
  "Event",
  "Social Media",
  "VIP manager",
  "Guest Manager",
  "Event Manager",
  "Technical Manager",
] as const;

export function AssignCrewModal({
  isOpen,
  onClose,
  availableProfiles,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  availableProfiles: Profile[];
  onSubmit: (profileId: string, role: string, notes: string) => void;
  isPending: boolean;
}) {
  const [profileId, setProfileId] = useState(availableProfiles[0]?.id || "");
  const [role, setRole] = useState<string>(PRESET_ROLES[0]);
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (availableProfiles.length > 0 && (!profileId || !availableProfiles.some(p => p.id === profileId))) {
      setProfileId(availableProfiles[0].id);
    }
  }, [availableProfiles, profileId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = profileId || availableProfiles[0]?.id;
    if (!pid || !role.trim()) return;
    onSubmit(pid, role.trim(), notes);
  };

  const staffOptions = availableProfiles.map((p) => ({
    value: p.id,
    label: p.full_name || "Tanpa Nama",
    badge: p.role?.toUpperCase(),
    subLabel: p.email || undefined,
  }));

  const roleOptions = PRESET_ROLES.map((r) => ({
    value: r,
    label: r,
  }));

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[calc(100%-1.5rem)] sm:w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card backdrop-blur-2xl border border-border shadow-2xl p-4 sm:p-6 space-y-4 text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#007aff]" />
            <span>Tambahkan Kru</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Pilih Staf Kru
            </label>
            {availableProfiles.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-muted border border-border text-xs text-[#ff9f0a]">
                Semua anggota staf telah ditugaskan.
              </div>
            ) : (
              <Combobox
                options={staffOptions}
                value={profileId || availableProfiles[0]?.id || ""}
                onChange={(val) => setProfileId(val)}
                placeholder="Pilih staf kru..."
                searchPlaceholder="Ketik nama atau jabatan staf..."
                emptyText="Tidak ada staf yang sesuai."
              />
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Peran di Acara
            </label>
            <Combobox
              options={roleOptions}
              value={role}
              onChange={(val) => setRole(val)}
              allowCustom={true}
              customOptionPrefix="Gunakan peran kustom:"
              placeholder="Cari atau pilih peran di acara..."
              searchPlaceholder="Ketik peran (contoh: Sound, LO, Manager)..."
              emptyText="Peran tidak ditemukan dalam daftar standar."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Catatan Singkat (Opsional)
            </label>
            <input
              placeholder="Contoh: Standby FOH jam 14:00"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="apple-input w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={availableProfiles.length === 0 || isPending}
              className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tugaskan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !mounted) {
    return content;
  }

  return createPortal(content, document.body);
}
