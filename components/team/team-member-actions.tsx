"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { updateMemberRoleAction, deleteMemberAction } from "@/app/(dashboard)/team/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { UserRole } from "@/types/database";

interface TeamMemberActionsProps {
  memberId: string;
  memberName: string;
  currentRole: UserRole;
  isSelf: boolean;
}

export function TeamMemberActions({
  memberId,
  memberName,
  currentRole,
  isSelf,
}: TeamMemberActionsProps) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isUpdating, startRoleTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === role) return;
    const prev = role;
    setRole(newRole);

    startRoleTransition(async () => {
      const res = await updateMemberRoleAction(memberId, newRole);
      if (!res.success) {
        setRole(prev);
        alert(res.error || "Gagal mengubah peran");
      }
    });
  };

  const confirmDelete = async () => {
    const res = await deleteMemberAction(memberId);
    if (!res.success) {
      throw new Error(res.error || "Gagal menghapus anggota tim");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <select
          value={role}
          disabled={isUpdating || role.toLowerCase() === "super_admin"}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="apple-input text-[11px] uppercase font-bold px-2.5 py-1 bg-muted text-foreground border-border cursor-pointer disabled:opacity-50"
          title="Ubah peran staf"
        >
          {role.toLowerCase() === "super_admin" && (
            <option value="super_admin" className="bg-card text-foreground">Super Admin</option>
          )}
          <option value="staff" className="bg-card text-foreground">Staff</option>
          <option value="admin" className="bg-card text-foreground">Admin</option>
        </select>
        {isUpdating && (
          <Loader2 className="w-3 h-3 animate-spin text-[#007aff] absolute right-6 pointer-events-none" />
        )}
      </div>

      {!isSelf && (
        <>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => setShowConfirm(true)}
            className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
            title="Hapus Akun Staf"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <ConfirmModal
            isOpen={showConfirm}
            title="Konfirmasi Hapus Akun Staf"
            itemName={memberName}
            onConfirm={confirmDelete}
            onClose={() => setShowConfirm(false)}
          />
        </>
      )}
    </div>
  );
}
