"use client";

import { useState, useMemo } from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
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
}: {
  initialUsers: UserWithRBAC[];
  initialRoles: Role[];
  initialPermissions: Permission[];
  initialRolePermissions: RolePermission[];
  currentUserId: string | null;
}) {
  const [tab, setTab] = useState<"users" | "roles" | "permissions">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogState>(null);

  const rolePermissionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    initialRolePermissions.forEach((rp) => {
      if (!map[rp.role_id]) map[rp.role_id] = [];
      map[rp.role_id].push(rp.permission_id);
    });
    return map;
  }, [initialRolePermissions]);

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const roleId = u.roles?.[0]?.id || u.role;
      return matchSearch && (roleFilter === "all" || roleId === roleFilter);
    });
  }, [initialUsers, search, roleFilter]);

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

        <div>
          {tab === "users" && (
            <button
              onClick={() => setDialog({ type: "create_user" })}
              className="apple-btn-primary px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Tambah Staf</span>
            </button>
          )}
          {tab === "roles" && (
            <button
              onClick={() => setDialog({ type: "create_role" })}
              className="apple-btn-primary px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Buat Peran</span>
            </button>
          )}
          {tab === "permissions" && (
            <button
              onClick={() => setDialog({ type: "create_perm" })}
              className="apple-btn-primary px-3.5 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Tambah Izin</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border gap-6 text-xs font-semibold">
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
            {t === "users" ? `Staf (${initialUsers.length})` : t === "roles" ? `Peran (${initialRoles.length})` : `Izin (${initialPermissions.length})`}
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
              {initialRoles.map((r) => (
                <option key={r.id} value={r.id} className="bg-card text-foreground">{r.name}</option>
              ))}
            </select>
          </div>
          <UsersTable
            users={filteredUsers}
            currentUserId={currentUserId}
            onEdit={(u) => setDialog({ type: "edit_user", user: u })}
            onDelete={(u) => setDialog({ type: "delete_user", user: u })}
          />
        </div>
      )}

      {tab === "roles" && (
        <RolesTable
          roles={initialRoles}
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
        roles={initialRoles}
        permissions={initialPermissions}
        rolePermissionsMap={rolePermissionsMap}
      />
    </div>
  );
}
