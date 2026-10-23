"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Lock } from "lucide-react";
import { deleteMemberAction } from "@/app/(dashboard)/team/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { UserModal } from "@/components/users/user-modal";
import type { UserRole, Profile, Role } from "@/types/database";

interface TeamMemberActionsProps {
  member?: Profile;
  memberId: string;
  memberName: string;
  currentRole: UserRole;
  isSelf: boolean;
  canEditRole?: boolean;
  isRootAdmin?: boolean;
  roles?: Role[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
}

export function TeamMemberActions({
  member,
  memberId,
  memberName,
  currentRole,
  isSelf,
  canEditRole = false,
  isRootAdmin = false,
  roles = [],
  currentUserId,
  currentUserRole,
}: TeamMemberActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const id = member?.id || memberId;
  const name = member?.full_name || memberName;
  const isTargetRootAdmin = isRootAdmin || member?.email?.toLowerCase() === "admin@xenoent.com";

  const normalizedCallerRole = (currentUserRole || "").toUpperCase();
  const isCallerAdminOrSuper = normalizedCallerRole === "SUPER_ADMIN" || normalizedCallerRole === "ADMIN";
  const isCallerManager = normalizedCallerRole === "MANAGER";
  const canDeleteUser = isCallerAdminOrSuper;
  const canEditStaff = canEditRole || isCallerAdminOrSuper || isCallerManager;

  const confirmDelete = async () => {
    const res = await deleteMemberAction(id);
    if (!res.success) {
      throw new Error(res.error || "Gagal menghapus anggota tim");
    }
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {isSelf && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff]">
            Anda
          </span>
        )}

        {!isSelf && isTargetRootAdmin && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md"
            title="Akun Sistem Utama (Terkunci)"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>Terkunci</span>
          </span>
        )}

        {canEditStaff && (
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            disabled={isTargetRootAdmin && !isSelf}
            title={
              isTargetRootAdmin && !isSelf
                ? "Akun Sistem Utama (Terkunci)"
                : isCallerManager
                  ? "Edit Kontak Staf (Nama & Telepon)"
                  : "Edit Profil & Peran Staf"
            }
            className={`p-1.5 rounded-lg transition-colors ${
              isTargetRootAdmin && !isSelf
                ? "text-muted-foreground/30 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {canDeleteUser && !isSelf && !isTargetRootAdmin && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Hapus Akun Staf"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {canDeleteUser && !isSelf && !isTargetRootAdmin && (
        <ConfirmModal
          isOpen={showConfirm}
          title="Konfirmasi Hapus Akun Staf"
          itemName={name}
          onConfirm={confirmDelete}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {showEditModal && (
        <UserModal
          user={
            member
              ? {
                  ...member,
                  roles: [{ id: member.role, name: member.role, description: null, created_at: member.created_at }],
                  permissions: [],
                }
              : {
                  id,
                  full_name: name,
                  email: "",
                  phone: null,
                  avatar_url: null,
                  role: currentRole,
                  avatar_color: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  roles: [{ id: currentRole, name: currentRole, description: null, created_at: new Date().toISOString() }],
                  permissions: [],
                }
          }
          roles={roles}
          currentUserId={currentUserId || (isSelf ? id : null)}
          currentUserRole={currentUserRole}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
