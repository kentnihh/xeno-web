"use client";

import { useState } from "react";
import { Trash2, Lock, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { UserModal } from "@/components/users/user-modal";
import { deleteMemberAction } from "@/app/(dashboard)/team/actions";
import type { Profile, Role } from "@/types/database";

export interface StaffCardProps {
  staff: Profile;
  currentUserRole?: string | null;
  currentUserId?: string | null;
  canEditRole?: boolean;
  roles?: Role[];
  onStaffDeleted?: () => void;
  onDelete?: (staff: Profile) => void;
  onEdit?: (staff: Profile) => void;
}

export function StaffCard({
  staff,
  currentUserRole,
  currentUserId,
  canEditRole = false,
  roles = [],
  onStaffDeleted,
  onDelete,
  onEdit,
}: StaffCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const normalizedCallerRole = (currentUserRole || "").toUpperCase();
  const isCallerAdminOrSuper = normalizedCallerRole === "SUPER_ADMIN" || normalizedCallerRole === "ADMIN";
  const isCallerManager = normalizedCallerRole === "MANAGER";
  const canDeleteUser = isCallerAdminOrSuper;
  const canEditStaff = canEditRole || isCallerAdminOrSuper || isCallerManager;

  const isSelf = Boolean(currentUserId && staff.id === currentUserId);
  const isRootAdmin = staff.email?.toLowerCase() === "admin@xenoent.com";

  const openDeleteDialog = (targetStaff: Profile) => {
    if (onDelete) {
      onDelete(targetStaff);
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    const res = await deleteMemberAction(staff.id);
    if (!res.success) {
      throw new Error(res.error || "Gagal menghapus anggota tim.");
    }
    setShowConfirm(false);
    if (onStaffDeleted) {
      onStaffDeleted();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar user={staff} size="md" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">{staff.full_name}</h3>
              {isRootAdmin && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                  title="Akun Sistem Utama (Terkunci)"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Terkunci</span>
                </span>
              )}
            </div>
            <div className="mt-1">
              <RoleBadge role={staff.role} size="xs" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSelf && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff]">
              Anda
            </span>
          )}

          {canEditStaff && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (onEdit ? onEdit(staff) : setShowEditModal(true))}
              disabled={isRootAdmin && !isSelf}
              title={
                isRootAdmin && !isSelf
                  ? "Akun Sistem Utama (Terkunci)"
                  : isCallerManager
                    ? "Edit Kontak Staf (Nama & Telepon)"
                    : "Edit Data Staf"
              }
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}

          {canDeleteUser && !isSelf && !isRootAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(staff)}
              // Note: Always disabled/hidden if staff.email === 'admin@xenoent.com'
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-border text-xs font-medium text-muted-foreground flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
        <span className="truncate">{staff.email}</span>
      </div>

      {showConfirm && (
        <ConfirmModal
          isOpen={showConfirm}
          title="Konfirmasi Hapus Akun Staf"
          itemName={staff.full_name}
          onConfirm={handleConfirmDelete}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {showEditModal && (
        <UserModal
          user={{
            ...staff,
            roles: [{ id: staff.role, name: staff.role, description: null, created_at: staff.created_at }],
            permissions: [],
          }}
          roles={roles}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      )}
    </div>
  );
}
