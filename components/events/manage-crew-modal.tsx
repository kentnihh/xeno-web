"use client";

import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Loader2,
  Shield,
  AlertCircle,
} from "lucide-react";
import { PRESET_ROLES } from "./assign-crew-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { EventCrew, Profile } from "@/types/database";

interface ManageCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  crew: EventCrew[];
  allProfiles: Profile[];
  onAssign: (profileId: string, role: string, notes?: string) => Promise<boolean | void>;
  onRemove: (crewId: string) => Promise<boolean | void>;
  onUpdateRole: (crewId: string, newRole: string) => Promise<boolean | void>;
  initialTab?: "list" | "assign";
  initialEditCrewId?: string | null;
}

export function ManageCrewModal({
  isOpen,
  onClose,
  crew,
  allProfiles,
  onAssign,
  onRemove,
  onUpdateRole,
  initialTab = "list",
  initialEditCrewId = null,
}: ManageCrewModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "assign">(
    crew.length === 0 ? "assign" : initialTab
  );

  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [newRole, setNewRole] = useState<string>(PRESET_ROLES[0]);
  const [customNewRole, setCustomNewRole] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [crewSearchQuery, setCrewSearchQuery] = useState("");
  const [editingCrewId, setEditingCrewId] = useState<string | null>(initialEditCrewId);
  const [editingRoleChoice, setEditingRoleChoice] = useState<string>("");
  const [editingCustomRole, setEditingCustomRole] = useState<string>("");

  const [assignPending, setAssignPending] = useState(false);
  const [updatingCrewId, setUpdatingCrewId] = useState<string | null>(null);
  const [removingCrewId, setRemovingCrewId] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<EventCrew | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const assignedProfileIds = useMemo(() => new Set(crew.map((c) => c.profile_id)), [crew]);
  const availableProfiles = useMemo(
    () => allProfiles.filter((p) => !assignedProfileIds.has(p.id)),
    [allProfiles, assignedProfileIds]
  );

  const filteredAvailableProfiles = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    if (!q) return availableProfiles;
    return availableProfiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
    );
  }, [availableProfiles, staffSearchQuery]);

  const filteredAssignedCrew = useMemo(() => {
    const q = crewSearchQuery.trim().toLowerCase();
    if (!q) return crew;
    return crew.filter((c) => {
      const name = c.profile?.full_name?.toLowerCase() || "";
      const email = c.profile?.email?.toLowerCase() || "";
      const role = c.role_in_event?.toLowerCase() || "";
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [crew, crewSearchQuery]);

  if (!isOpen) return null;

  const handleStartEdit = (m: EventCrew) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingCrewId(m.id);
    if (PRESET_ROLES.includes(m.role_in_event)) {
      setEditingRoleChoice(m.role_in_event);
      setEditingCustomRole("");
    } else {
      setEditingRoleChoice("Custom");
      setEditingCustomRole(m.role_in_event);
    }
  };

  const handleCancelEdit = () => {
    setEditingCrewId(null);
    setEditingRoleChoice("");
    setEditingCustomRole("");
  };

  const handleSaveRole = async (crewId: string) => {
    const finalRole = editingRoleChoice === "Custom" ? editingCustomRole.trim() : editingRoleChoice;
    if (!finalRole) {
      setErrorMsg("Peran di acara tidak boleh kosong.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setUpdatingCrewId(crewId);
    try {
      await onUpdateRole(crewId, finalRole);
      setSuccessMsg("Peran kru berhasil diperbarui.");
      setEditingCrewId(null);
    } catch {
      setErrorMsg("Gagal memperbarui peran kru.");
    } finally {
      setUpdatingCrewId(null);
    }
  };

  const confirmRemoveMember = async () => {
    if (!deletingMember) return;
    const crewId = deletingMember.id;
    setErrorMsg(null);
    setSuccessMsg(null);
    setRemovingCrewId(crewId);
    try {
      await onRemove(crewId);
      setSuccessMsg("Kru berhasil dilepas dari penugasan.");
    } catch {
      setErrorMsg("Gagal menghapus penugasan kru.");
      throw new Error("Gagal menghapus penugasan kru.");
    } finally {
      setRemovingCrewId(null);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const staffId = selectedStaffId || filteredAvailableProfiles[0]?.id;
    if (!staffId) {
      setErrorMsg("Pilih anggota staf kru terlebih dahulu.");
      return;
    }

    const effectiveRole = newRole === "Custom" ? customNewRole.trim() : newRole;
    if (!effectiveRole) {
      setErrorMsg("Tentukan peran staf di acara.");
      return;
    }

    setAssignPending(true);
    try {
      await onAssign(staffId, effectiveRole, notes);
      setSuccessMsg("Kru berhasil ditugaskan ke acara.");
      setSelectedStaffId("");
      setCustomNewRole("");
      setNotes("");
      setStaffSearchQuery("");
      setActiveTab("list");
    } catch {
      setErrorMsg("Gagal menugaskan kru.");
    } finally {
      setAssignPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl text-foreground overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Manajemen Tim Kru
              </h2>
              <p className="text-xs text-muted-foreground">
                Atur peran tim kru dan penugasan staf di acara ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => {
                setActiveTab("list");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={"py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer " + (activeTab === "list" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground")}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kru Ditugaskan ({crew.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("assign");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={"py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer " + (activeTab === "assign" ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground")}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tugaskan Kru Baru ({availableProfiles.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {activeTab === "list" && (
            <div className="space-y-3">
              {crew.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={crewSearchQuery}
                    onChange={(e) => setCrewSearchQuery(e.target.value)}
                    placeholder="Filter nama, peran..."
                    className="apple-input w-full pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
              )}

              {crew.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-border rounded-2xl p-6 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Belum ada kru ditugaskan</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("assign")}
                    className="apple-btn-primary px-3 py-1.5 text-xs font-semibold mt-2 cursor-pointer"
                  >
                    Tugaskan Kru Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssignedCrew.map((m) => {
                    const isEditing = editingCrewId === m.id;
                    const p = m.profile;
                    return (
                      <div
                        key={m.id}
                        className={"p-3 rounded-2xl border " + (isEditing ? "bg-[#007aff]/5 border-[#007aff]/40" : "bg-card border-border")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span>{p?.full_name || "Anggota Tim"}</span>
                              {p?.role === "admin" && (
                                <Shield className="w-3 h-3 text-[#ff9f0a]" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {p?.email}
                            </div>
                          </div>

                          {!isEditing ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#007aff]/15 text-[#007aff]">
                                {m.role_in_event}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(m)}
                                className="p-1 rounded text-muted-foreground hover:text-[#007aff] cursor-pointer"
                                title="Ubah Peran"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingMember(m)}
                                disabled={removingCrewId === m.id}
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                                title="Lepas"
                              >
                                {removingCrewId === m.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={editingRoleChoice}
                                onChange={(e) => setEditingRoleChoice(e.target.value)}
                                className="apple-input text-xs px-2 py-1"
                              >
                                {PRESET_ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                                <option value="Custom">Kustom...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveRole(m.id)}
                                disabled={updatingCrewId === m.id}
                                className="apple-btn-primary px-2 py-1 text-xs cursor-pointer"
                              >
                                {updatingCrewId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="apple-btn-secondary px-2 py-1 text-xs cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditing && editingRoleChoice === "Custom" && (
                          <input
                            type="text"
                            value={editingCustomRole}
                            onChange={(e) => setEditingCustomRole(e.target.value)}
                            placeholder="Nama peran kustom..."
                            className="apple-input w-full px-2 py-1 text-xs mt-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "assign" && (
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Pilih Anggota Tim Staf
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Cari anggota tim..."
                    className="apple-input w-full pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-border rounded-xl p-1">
                  {filteredAvailableProfiles.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 text-center">
                      Tidak ada staf tersedia.
                    </div>
                  ) : (
                    filteredAvailableProfiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedStaffId(p.id)}
                        className={"w-full text-left p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer " + ((selectedStaffId || filteredAvailableProfiles[0]?.id) === p.id ? "bg-[#007aff]/15 text-[#007aff] font-semibold" : "hover:bg-muted text-foreground")}
                      >
                        <div>
                          <div>{p.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.email}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">
                          {p.role}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Peran di Acara
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="apple-input w-full px-3 py-2 text-xs"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Custom">Peran Kustom...</option>
                </select>
                {newRole === "Custom" && (
                  <input
                    type="text"
                    value={customNewRole}
                    onChange={(e) => setCustomNewRole(e.target.value)}
                    placeholder="Ketik nama peran kustom..."
                    className="apple-input w-full px-3 py-1.5 text-xs mt-2"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Catatan Tugas (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Koordinator panggung utama"
                  className="apple-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="apple-btn-secondary px-4 py-2 text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assignPending || availableProfiles.length === 0}
                  className="apple-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  {assignPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tugaskan Kru"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deletingMember}
        title="Konfirmasi Lepas Penugasan Kru"
        itemName={deletingMember?.profile?.full_name || "Kru"}
        message={deletingMember ? `Apakah Anda yakin ingin melepas penugasan kru "${deletingMember.profile?.full_name || "Kru"}" dari acara ini?` : undefined}
        onConfirm={confirmRemoveMember}
        onClose={() => setDeletingMember(null)}
      />
    </div>
  );
}
