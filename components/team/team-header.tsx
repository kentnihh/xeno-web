"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserModal } from "@/components/users/user-modal";
import type { Role } from "@/types/database";

export interface TeamHeaderProps {
  currentUserRole?: string | null;
  currentUserId?: string | null;
  roles?: Role[];
  onStaffCreated?: () => void;
}

export function TeamHeader({
  currentUserRole,
  currentUserId,
  roles = [],
  onStaffCreated,
}: TeamHeaderProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const normalizedRole = (currentUserRole || "").toUpperCase();
  const canCreateUser = normalizedRole === "SUPER_ADMIN" || normalizedRole === "ADMIN";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Kru & Tim Internal</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          Daftar staf operasional Xeno Entertainment & manajemen hak akses
        </p>
      </div>

      {canCreateUser && (
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="apple-btn-primary w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Staf
        </Button>
      )}

      {isCreateOpen && (
        <UserModal
          user={null}
          roles={roles}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            if (onStaffCreated) {
              onStaffCreated();
            } else if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}
