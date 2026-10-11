"use client";

import { UserModal } from "./user-modal";
import { RoleModal } from "./role-modal";
import { PermissionModal } from "./permission-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { deleteUser, deleteRole, deletePermission } from "@/app/(dashboard)/users/actions";
import type { Role, Permission, UserWithRBAC } from "@/types/database";

export type DialogState =
  | { type: "create_user" }
  | { type: "edit_user"; user: UserWithRBAC }
  | { type: "delete_user"; user: UserWithRBAC }
  | { type: "create_role" }
  | { type: "edit_role"; role: Role }
  | { type: "delete_role"; role: Role }
  | { type: "create_perm" }
  | { type: "delete_perm"; perm: Permission }
  | null;

export function UsersDialogHandler({
  dialog,
  onClose,
  roles,
  permissions,
  rolePermissionsMap,
}: {
  dialog: DialogState;
  onClose: () => void;
  roles: Role[];
  permissions: Permission[];
  rolePermissionsMap: Record<string, string[]>;
}) {
  if (!dialog) return null;

  if (dialog.type === "create_user") {
    return <UserModal user={null} roles={roles} onClose={onClose} />;
  }
  if (dialog.type === "edit_user") {
    return <UserModal user={dialog.user} roles={roles} onClose={onClose} />;
  }
  if (dialog.type === "delete_user") {
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Staf"
        message={`Hapus staf "${dialog.user.full_name}" (${dialog.user.email})?`}
        onConfirm={async () => {
          const res = await deleteUser(dialog.user.id);
          if (res.error) throw new Error(res.error);
        }}
        onClose={onClose}
      />
    );
  }
  if (dialog.type === "create_role") {
    return <RoleModal role={null} allPermissions={permissions} onClose={onClose} />;
  }
  if (dialog.type === "edit_role") {
    return (
      <RoleModal
        role={dialog.role}
        allPermissions={permissions}
        assignedPermissionIds={rolePermissionsMap[dialog.role.id] || []}
        onClose={onClose}
      />
    );
  }
  if (dialog.type === "delete_role") {
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Peran"
        message={`Hapus peran "${dialog.role.name}" (${dialog.role.id})?`}
        onConfirm={async () => {
          const res = await deleteRole(dialog.role.id);
          if (res.error) throw new Error(res.error);
        }}
        onClose={onClose}
      />
    );
  }
  if (dialog.type === "create_perm") {
    return <PermissionModal onClose={onClose} />;
  }
  if (dialog.type === "delete_perm") {
    return (
      <ConfirmDialog
        title="Konfirmasi Hapus Izin"
        message={`Hapus izin "${dialog.perm.name}" (${dialog.perm.id})?`}
        onConfirm={async () => {
          const res = await deletePermission(dialog.perm.id);
          if (res.error) throw new Error(res.error);
        }}
        onClose={onClose}
      />
    );
  }
  return null;
}

