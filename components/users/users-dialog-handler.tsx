"use client";

import { UserModal } from "./user-modal";
import { RoleModal } from "./role-modal";
import { PermissionModal } from "./permission-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { ResetPasswordModal } from "./reset-password-modal";
import { deleteUser, deleteRole, deletePermission } from "@/app/(dashboard)/users/actions";
import type { Role, Permission, UserWithRBAC } from "@/types/database";

export type DialogState =
  | { type: "create_user" }
  | { type: "edit_user"; user: UserWithRBAC }
  | { type: "delete_user"; user: UserWithRBAC }
  | { type: "reset_password"; user: UserWithRBAC }
  | { type: "create_role" }
  | { type: "edit_role"; role: Role }
  | { type: "delete_role"; role: Role }
  | { type: "create_perm" }
  | { type: "delete_perm"; perm: Permission }
  | null;

export function UsersDialogHandler({
  dialog,
  onClose,
  onSuccess,
  roles,
  permissions,
  rolePermissionsMap,
  currentUserId,
  currentUserRole,
}: {
  dialog: DialogState;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  roles: Role[];
  permissions: Permission[];
  rolePermissionsMap: Record<string, string[]>;
  currentUserId?: string | null;
  currentUserRole?: string | null;
}) {
  if (!dialog) return null;

  const normalizedRole = (currentUserRole || "").toUpperCase();
  const canCreateUser = normalizedRole === "SUPER_ADMIN" || normalizedRole === "ADMIN";
  const canDeleteUser = canCreateUser;

  if (dialog.type === "create_user") {
    if (!canCreateUser) return null;
    return <UserModal user={null} roles={roles} onClose={onClose} onSuccess={onSuccess} currentUserId={currentUserId} currentUserRole={currentUserRole} />;
  }
  if (dialog.type === "edit_user") {
    return <UserModal user={dialog.user} roles={roles} onClose={onClose} onSuccess={onSuccess} currentUserId={currentUserId} currentUserRole={currentUserRole} />;
  }
  if (dialog.type === "reset_password") {
    return <ResetPasswordModal user={dialog.user} onClose={onClose} onSuccess={onSuccess} />;
  }
  if (dialog.type === "delete_user") {
    if (!canDeleteUser) {
      onClose();
      return null;
    }
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Staf"
        message={`Apakah Anda yakin ingin menghapus staf "${dialog.user.full_name}" (${dialog.user.email})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={async () => {
          const res = await deleteUser(dialog.user.id);
          if (res.error) throw new Error(res.error);
          onSuccess?.(`Staf "${dialog.user.full_name}" berhasil dihapus.`);
        }}
        onClose={onClose}
      />
    );
  }
  if (dialog.type === "create_role") {
    return <RoleModal role={null} allPermissions={permissions} onClose={onClose} onSuccess={onSuccess} />;
  }
  if (dialog.type === "edit_role") {
    return (
      <RoleModal
        role={dialog.role}
        allPermissions={permissions}
        assignedPermissionIds={rolePermissionsMap[dialog.role.id] || []}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }
  if (dialog.type === "delete_role") {
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Peran"
        message={`Apakah Anda yakin ingin menghapus peran "${dialog.role.name}" (${dialog.role.id})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={async () => {
          const res = await deleteRole(dialog.role.id);
          if (res.error) throw new Error(res.error);
          onSuccess?.(`Peran "${dialog.role.name}" berhasil dihapus.`);
        }}
        onClose={onClose}
      />
    );
  }
  if (dialog.type === "create_perm") {
    return <PermissionModal onClose={onClose} onSuccess={onSuccess} />;
  }
  if (dialog.type === "delete_perm") {
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Izin"
        message={`Apakah Anda yakin ingin menghapus izin "${dialog.perm.name}" (${dialog.perm.id})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={async () => {
          const res = await deletePermission(dialog.perm.id);
          if (res.error) throw new Error(res.error);
          onSuccess?.(`Izin "${dialog.perm.name}" berhasil dihapus.`);
        }}
        onClose={onClose}
      />
    );
  }
  return null;
}

