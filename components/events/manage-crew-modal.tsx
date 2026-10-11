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
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { PRESET_ROLES } from "./assign-crew-modal";
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
  eventId,
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

  const handleRemoveMember = async (crewId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setRemovingCrewId(crewId);

    try {
      await onRemove(crewId);
      setSuccessMsg("Kru berhasil dilepas dari penugasan.");
    } catch {
      setErrorMsg("Gagal menghapus penugasan kru.");
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl text-foreground overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Manajemen Tim Kru
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Atur peran tim kru dan penugasan staf di acara ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-5 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Apple Segmented Tab Switcher */}
        <div className="px-5 sm:px-6 pt-4 pb-2 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/80 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => {
                setActiveTab("list");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "list"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kru Ditugaskan</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "list"
                    ? "bg-[#007aff]/15 text-[#007aff]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {crew.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("assign");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "assign"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tugaskan Kru Baru</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "assign"
                    ? "bg-[#007aff]/15 text-[#007aff]"
                    : "bg-muted text-muted-foreground"
          {/* TAB 1: LIST ASSIGNED CREW */}
          {activeTab === "list" && (
            <div className="space-y-3">
              {crew.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={crewSearchQuery}
                    onChange={(e) => setCrewSearchQuery(e.target.value)}
                    placeholder="Filter nama, peran, atau email kru..."
                    className="apple-input w-full pl-9 pr-3.5 py-2 text-xs"
                  />
                </div>
              )}

              {crew.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border/80 rounded-2xl p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Belum ada kru ditugaskan</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tugaskan staf internal untuk mengelola acara ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("assign")}
                    className="apple-btn-primary px-4 py-2 text-xs font-semibold gap-1.5 inline-flex shadow-md shadow-[#007aff]/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tugaskan Kru Sekarang</span>
                  </button>
                </div>
              ) : filteredAssignedCrew.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Tidak ditemukan kru dengan kata kunci &quot;{crewSearchQuery}&quot;.
                </div>
              ) : (
                <div className="space-y-2">

                }`}
              >
                {availableProfiles.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-4">

  };

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
