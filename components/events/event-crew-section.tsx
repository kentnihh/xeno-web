"use client";

import { useState, useTransition } from "react";
import { UserCheck, Plus, Trash2, User, Loader2 } from "lucide-react";
import { assignEventCrew, removeEventCrew } from "@/app/(dashboard)/events/actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AssignCrewModal } from "./assign-crew-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { EventCrew, Profile } from "@/types/database";

export function EventCrewSection({
  eventId,
  initialCrew,
  allProfiles,
  canManage = true,
  onCrewChange,
}: {
  eventId: string;
  initialCrew: EventCrew[];
  allProfiles: Profile[];
  canManage?: boolean;
  onCrewChange?: (crew: EventCrew[]) => void;
}) {
  const [crew, setCrew] = useState<EventCrew[]>(initialCrew);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCrew, setDeletingCrew] = useState<EventCrew | null>(null);

  const assignedIds = new Set(crew.map((c) => c.profile_id));
  const available = allProfiles.filter((p) => !assignedIds.has(p.id));

  const handleAssign = (profileId: string, role: string, notes: string) => {
    setErrorMsg(null);
    const target = allProfiles.find((p) => p.id === profileId);
    if (!target) return;

    const tempId = `temp-${Date.now()}`;
    const item: EventCrew = {
      id: tempId,
      event_id: eventId,
      profile_id: profileId,
      role_in_event: role,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
      profile: target,
    };

    const nextCrew = [...crew, item];
    setCrew(nextCrew);
    onCrewChange?.(nextCrew);
    setIsOpen(false);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("event_id", eventId);
      fd.append("profile_id", profileId);
      fd.append("role_in_event", role);
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await assignEventCrew(fd);
      if (!res.success) {
        const reverted = nextCrew.filter((c) => c.id !== tempId);
        setCrew(reverted);
        onCrewChange?.(reverted);
        setErrorMsg(res.error || "Gagal menugaskan kru.");
      }
    });
  };

  const confirmRemove = async () => {
    if (!deletingCrew) return;
    const target = deletingCrew;
    setDeletingId(target.id);
    const nextCrew = crew.filter((c) => c.id !== target.id);
    setCrew(nextCrew);
    onCrewChange?.(nextCrew);

    const res = await removeEventCrew(target.id, eventId);
    setDeletingId(null);
    if (!res.success) {
      const reverted = [...nextCrew, target];
      setCrew(reverted);
      onCrewChange?.(reverted);
      throw new Error(res.error || "Gagal menghapus.");
    }
  };

  return (
    <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#007aff]" />
          <span>Tim Kru Ditugaskan ({crew.length})</span>
        </h2>
        {canManage && (
          <button
            onClick={() => { setIsOpen(true); setErrorMsg(null); }}
            className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Kru</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {crew.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border/70 rounded-2xl">
          <User className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground font-medium">Belum ada kru yang ditugaskan ke acara ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {crew.map((m) => {
            const p = m.profile;

            return (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-card border border-border hover:border-[#007aff] transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar user={p} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                      <span>{p?.full_name || "Staf"}</span>
                    </div>
                    <div className="text-[11px] text-[#007aff] dark:text-[#3894ff] font-semibold truncate">{m.role_in_event}</div>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => setDeletingCrew(m)}
                    disabled={deletingId === m.id}
                    className="text-muted-foreground/70 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Hapus Penugasan Kru"
                  >
                    {deletingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AssignCrewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        availableProfiles={available}
        onSubmit={handleAssign}
        isPending={isPending}
      />

      <ConfirmModal
        isOpen={!!deletingCrew}
        title="Konfirmasi Hapus Penugasan Kru"
        itemName={deletingCrew?.profile?.full_name || "Kru"}
        message={deletingCrew ? `Apakah Anda yakin ingin melepas penugasan kru "${deletingCrew.profile?.full_name || "Kru"}" dari acara ini?` : undefined}
        onConfirm={confirmRemove}
        onClose={() => setDeletingCrew(null)}
      />
    </div>
  );
}
