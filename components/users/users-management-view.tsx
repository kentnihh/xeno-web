"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ShieldCheck, CheckCircle2, X } from "lucide-react";
import { UsersTable } from "./users-table";
import { RolesTable, PermissionsList } from "./roles-table";
import { UsersDialogHandler, DialogState } from "./users-dialog-handler";
import type { Role, Permission, UserWithRBAC, RolePermission } from "@/types/database";

export function UsersManagementView({
  initialUsers,
  initialRoles,
  initialPermissions,
  initialRolePermissions,
  currentUserId,
  currentUserRole,
}: {
  initialUsers: UserWithRBAC[];
  initialRoles: Role[];
  initialPermissions: Permission[];
  initialRolePermissions: RolePermission[];
  currentUserId: string | null;
  currentUserRole?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "roles" | "permissions">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSuccess = (message: string) => {
    setToast(message);
    router.refresh();
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const rolePermissionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    initialRolePermissions.forEach((rp) => {
      if (!map[rp.role_id]) map[rp.role_id] = [];
      map[rp.role_id].push(rp.permission_id);
    });
    return map;
  }, [initialRolePermissions]);

  // Operational roles only (Administrator, Event Manager, Kru Operasional).
  // SUPER_ADMIN is a hardcoded system role that bypasses all RBAC checks and must never appear here.
  const manageableRoles = useMemo(() => {
    return initialRoles.filter(
      (r) =>
        r.id !== "SUPER_ADMIN" &&
        r.id.toLowerCase() !== "super_admin" &&
        r.id.toLowerCase() !== "superadmin" &&
        r.name !== "Super Administrator" &&
        !r.name.toLowerCase().includes("super administrator")
    );
  }, [initialRoles]);

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const roleId = u.roles?.[0]?.id || u.role;
      return matchSearch && (roleFilter === "all" || roleId === roleFilter);
    });
  }, [initialUsers, search, roleFilter]);

  const normalizedCallerRole = (currentUserRole || "").toUpperCase();
  const canCreateUser = normalizedCallerRole === "SUPER_ADMIN" || normalizedCallerRole === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#007aff]" />
            <span>Manajemen Pengguna & RBAC</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Konfigurasi otorisasi, peran staf, dan hak akses keamanan
          </p>
        </div>

        <div className="w-full sm:w-auto">
          {tab === "users" && canCreateUser && (
            <button
              onClick={() => setDialog({ type: "create_user" })}
              className="apple-btn-primary w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Tambah Staf</span>
            </button>
          )}
          {tab === "roles" && canCreateUser && (
            <button
              onClick={() => setDialog({ type: "create_role" })}
              className="apple-btn-primary w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Buat Peran</span>
            </button>
          )}
          {tab === "permissions" && canCreateUser && (
            <button
              onClick={() => setDialog({ type: "create_perm" })}
              className="apple-btn-primary w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Tambah Izin</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border gap-6 text-xs font-semibold overflow-x-auto scrollbar-none whitespace-nowrap">
        {(["users", "roles", "permissions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 capitalize border-b-2 cursor-pointer transition-all duration-150 ${
              tab === t
                ? "border-[#007aff] text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "users" ? `Staf (${initialUsers.length})` : t === "roles" ? `Peran (${manageableRoles.length})` : `Izin (${initialPermissions.length})`}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="apple-input w-full pl-9 pr-3.5 py-2 text-xs"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="apple-input px-3.5 py-2 text-xs bg-muted text-foreground border-border cursor-pointer font-medium"
            >
              <option value="all" className="bg-card text-foreground">Semua Peran</option>
              {manageableRoles.map((r) => (
                <option key={r.id} value={r.id} className="bg-card text-foreground">{r.name}</option>
              ))}
            </select>
          </div>
          <UsersTable
            users={filteredUsers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onEdit={(u) => setDialog({ type: "edit_user", user: u })}
            onResetPassword={(u) => setDialog({ type: "reset_password", user: u })}
            onDelete={(u) => setDialog({ type: "delete_user", user: u })}
          />
        </div>
      )}

      {tab === "roles" && (
        <RolesTable
          roles={manageableRoles}
          rolePermissions={rolePermissionsMap}
          onEdit={(r) => setDialog({ type: "edit_role", role: r })}
          onDelete={(r) => setDialog({ type: "delete_role", role: r })}
        />
      )}

      {tab === "permissions" && (
        <PermissionsList
          permissions={initialPermissions}
          onDelete={(p) => setDialog({ type: "delete_perm", perm: p })}
        />
      )}

      <UsersDialogHandler
        dialog={dialog}
        onClose={() => setDialog(null)}
        onSuccess={handleSuccess}
        roles={manageableRoles}
        permissions={initialPermissions}
        rolePermissionsMap={rolePermissionsMap}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-black/20 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
