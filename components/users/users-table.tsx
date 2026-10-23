"use client";

import { Pencil, Trash2, KeyRound, Lock } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import type { UserWithRBAC } from "@/types/database";

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  users: UserWithRBAC[];
  currentUserId: string | null;
  onEdit: (user: UserWithRBAC) => void;
  onResetPassword: (user: UserWithRBAC) => void;
  onDelete: (user: UserWithRBAC) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl apple-card border border-border shadow-xs">
      <table className="w-full min-w-[640px] text-left text-xs text-foreground">
        <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
          <tr>
            <th className="py-3.5 px-4 font-bold">Staf & Pengguna</th>
            <th className="py-3.5 px-4 font-bold">Peran</th>
            <th className="py-3.5 px-4 font-bold">Izin Aktif</th>
            <th className="py-3.5 px-4 font-bold">Kontak</th>
            <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium">
                Tidak ada staf yang cocok.
              </td>
            </tr>
          ) : (
            users.map((u) => {
              const roleName = u.roles?.[0]?.name || u.role || "Staff";
              const isAdmin = (u.roles?.[0]?.id || u.role) === "admin";
              const isSelf = currentUserId === u.id;
              const isRootAdmin = u.email?.toLowerCase() === "admin@xenoent.com";

              return (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="md" />
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{u.full_name}</span>
                          {isRootAdmin && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                              title="Akun Sistem Utama (Terkunci)"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Akun Sistem Utama (Terkunci)</span>
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#007aff]/15 text-[#007aff] font-mono font-bold">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-medium">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <RoleBadge role={u.roles?.[0]?.id || u.role} size="sm" />
                      {isRootAdmin && (
                        <span title="Akun Sistem Utama (Terkunci)" className="text-amber-500 inline-flex">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#007aff]/15 text-[10px] text-[#007aff] dark:text-[#3894ff] font-mono font-bold border border-[#007aff]/20">
                        <KeyRound className="w-2.5 h-2.5" />
                        {u.permissions?.length || 0}
                      </span>
                      {u.permissions?.slice(0, 2).map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] text-muted-foreground font-mono font-medium"
                        >
                          {p.id}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground font-medium">
                    {u.phone || <span className="text-muted-foreground/40">-</span>}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        disabled={isRootAdmin && !isSelf}
                        title={
                          isRootAdmin && !isSelf
                            ? "Akun Sistem Utama (Terkunci)"
                            : "Edit Data Staf"
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          isRootAdmin && !isSelf
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetPassword(u)}
                        disabled={isRootAdmin && !isSelf}
                        title={
                          isRootAdmin && !isSelf
                            ? "Akun Sistem Utama (Terkunci)"
                            : "Reset Sandi"
                        }
                        aria-label="Reset Sandi"
                        className={`p-1.5 rounded-lg transition-colors ${
                          isRootAdmin && !isSelf
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-muted-foreground hover:text-[#007aff] hover:bg-[#007aff]/10 cursor-pointer"
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(u)}
                        disabled={isSelf || isRootAdmin}
                        title={
                          isRootAdmin
                            ? "Akun Sistem Utama (Terkunci)"
                            : isSelf
                            ? "Tidak dapat menghapus akun sendiri"
                            : "Hapus Pengguna"
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSelf || isRootAdmin
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
