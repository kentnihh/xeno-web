"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2 } from "lucide-react";
import type { Profile } from "@/types/database";

export const PRESET_ROLES = [
  "Stage Manager",
  "Sound Engineer (FOH)",
  "Lighting Operator",
  "Show Director",
  "Visual / VJ",
  "Production Runner",
  "Hospitality & LO",
  "Stage Hand",
];

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
  const [role, setRole] = useState(PRESET_ROLES[0]);
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const effectiveRole = role === "Custom" ? custom.trim() : role;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = profileId || availableProfiles[0]?.id;
    if (!pid || !effectiveRole) return;
    onSubmit(pid, effectiveRole, notes);
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-card backdrop-blur-2xl border border-border shadow-2xl p-6 space-y-4 text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#007aff]" />
            <span>Tugaskan Kru ke Acara</span>
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
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Pilih Staf Kru
            </label>
            {availableProfiles.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-muted border border-border text-xs text-[#ff9f0a]">
                Semua anggota staf telah ditugaskan.
              </div>
            ) : (
              <select
                value={profileId || availableProfiles[0]?.id}
                onChange={(e) => setProfileId(e.target.value)}
                className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
              >
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-card text-foreground">
                    {p.full_name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Peran di Acara
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer mb-2"
            >
              {PRESET_ROLES.map((r) => (
                <option key={r} value={r} className="bg-card text-foreground">{r}</option>
              ))}
              <option value="Custom" className="bg-card text-foreground">Peran Lainnya...</option>
            </select>
            {role === "Custom" && (
              <input
                required
                placeholder="Nama peran teknis..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="apple-input w-full px-3.5 py-2 text-sm"
              />
            )}
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

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary px-4 py-2 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={availableProfiles.length === 0 || isPending}
              className="apple-btn-primary px-4 py-2 text-xs gap-1.5 disabled:opacity-50"
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
