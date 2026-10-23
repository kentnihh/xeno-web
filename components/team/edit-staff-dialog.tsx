"use client";

import { UserModal } from "@/components/users/user-modal";
import type { Role, UserWithRBAC, Profile } from "@/types/database";

export interface EditStaffDialogProps {
  staff?: Profile | UserWithRBAC | null;
  roles?: Role[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function EditStaffDialog({
  staff,
  roles = [],
  currentUserId,
  currentUserRole,
  onClose,
  onSuccess,
}: EditStaffDialogProps) {
  const user: UserWithRBAC | null = staff
    ? {
        ...staff,
        roles: (staff as UserWithRBAC).roles || [
          {
            id: staff.role,
            name: staff.role,
            description: null,
            created_at: staff.created_at,
          },
        ],
        permissions: (staff as UserWithRBAC).permissions || [],
      }
    : null;

  return (
    <UserModal
      user={user}
      roles={roles}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

export { EditStaffDialog as UserModal };
