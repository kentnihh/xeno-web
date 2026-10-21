"use client";

import { Pencil, Trash2, Shield, Lock } from "lucide-react";
import type { Role, Permission } from "@/types/database";

export function RolesTable({
  roles,
  rolePermissions,
  onEdit,
  onDelete,
}: {
  roles: Role[];
  rolePermissions: Record<string, string[]>;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}) {
  const protectedRoles = ["admin", "staff", "manager"];

  if (roles.length === 0) {
    return (
      <div className="apple-card p-12 text-center text-xs text-muted-foreground space-y-2 border border-border shadow-xs">
        <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold text-foreground text-sm">Belum ada peran terdaftar</p>
        <p>Tidak ada peran pengguna yang tercatat dalam sistem.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roles.map((r) => {
        const perms = rolePermissions[r.id] || [];
        const isProtected = protectedRoles.includes(r.id.toLowerCase());

        return (
          <div
            key={r.id}
            className="apple-card-interactive p-5 space-y-3.5 flex flex-col justify-between rounded-2xl border border-border shadow-xs hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{r.name}</h3>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">{r.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isProtected ? (
                    <span title="Peran sistem bawaan terkunci" className="p-1 text-muted-foreground/50">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      className="p-1 rounded-lg text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {r.description && (
                <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed font-medium">{r.description}</p>
              )}
            </div>

            <div className="pt-2.5 border-t border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                Izin Terkait ({perms.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {perms.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground/60 italic">Belum ada izin</span>
                ) : (
                  perms.map((pId) => (
                    <span
                      key={pId}
                      className="px-2 py-0.5 rounded-full bg-[#007aff]/15 border border-[#007aff]/25 text-[10px] text-[#007aff] dark:text-[#3894ff] font-mono font-bold"
                    >
                      {pId}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PermissionsList({
  permissions,
  onDelete,
}: {
  permissions: Permission[];
  onDelete: (permission: Permission) => void;
}) {
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const mod = p.module || "general";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  if (permissions.length === 0) {
    return (
      <div className="apple-card p-12 text-center text-xs text-muted-foreground space-y-2 border border-border shadow-xs">
        <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold text-foreground text-sm">Belum ada izin terdaftar</p>
        <p>Tidak ada konfigurasi izin modul yang tercatat dalam sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([mod, perms]) => (
        <div key={mod} className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#007aff] dark:text-[#3894ff]">
            Modul: {mod} ({perms.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {perms.map((p) => (
              <div
                key={p.id}
                className="apple-card p-4 flex items-start justify-between gap-2 border border-border shadow-xs hover:shadow-md transition-all rounded-xl"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#007aff] dark:text-[#3894ff] block mt-0.5">
                    {p.id}
                  </span>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">{p.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className="p-1 rounded-lg text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
