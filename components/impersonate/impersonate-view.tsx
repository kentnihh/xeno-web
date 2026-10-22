"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Search,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Combobox } from "@/components/ui/combobox";
import { impersonateUser } from "@/app/actions/impersonate";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface ImpersonateViewProps {
  users: Profile[];
  realUserId: string;
  currentImpersonatedId: string | null;
}

export function ImpersonateView({
  users,
  realUserId,
  currentImpersonatedId,
}: ImpersonateViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedComboboxId, setSelectedComboboxId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" ||
        u.role.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleImpersonate = (targetUserId: string) => {
    if (targetUserId === realUserId) {
      setError("Anda tidak dapat mengimpersonasi akun Super Admin Anda sendiri.");
      return;
    }

    setError(null);
    setPendingTargetId(targetUserId);

    startTransition(async () => {
      const res = await impersonateUser(targetUserId);
      if (res.error) {
        setError(res.error);
        setPendingTargetId(null);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  const comboboxOptions = useMemo(() => {
    return users
      .filter((u) => u.id !== realUserId)
      .map((u) => ({
        value: u.id,
        label: `${u.full_name} (${u.role.toUpperCase()})`,
        subLabel: u.email,
      }));
  }, [users, realUserId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              User Impersonation
            </h1>
            <RoleBadge role="SUPER_ADMIN" size="xs" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Masuk dan gunakan sistem persis seperti akun anggota tim lain tanpa memerlukan kata sandi.
          </p>
        </div>

        {/* Quick select combobox */}
        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Pilih Cepat Pengguna
          </label>
          <Combobox
            name="quickSelect"
            value={selectedComboboxId}
            onChange={(val) => {
              setSelectedComboboxId(val);
              if (val) handleImpersonate(val);
            }}
            options={comboboxOptions}
            placeholder="Ketik nama staf..."
            searchPlaceholder="Cari pengguna..."
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, email, atau peran..."
            className="apple-input w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm"
          />
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Semua" },
            { id: "admin", label: "Admin" },
            { id: "manager", label: "Manager" },
            { id: "staff", label: "Staff" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setRoleFilter(pill.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                roleFilter === pill.id
                  ? "bg-[#007aff] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Daftar Akun Pengguna ({filteredUsers.length})</span>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Tidak ada pengguna yang cocok dengan pencarian "{search}".
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map((user) => {
              const isSelf = user.id === realUserId;
              const isCurrentlyActive = user.id === currentImpersonatedId;
              const isTargetPending = isPending && pendingTargetId === user.id;

              return (
                <div
                  key={user.id}
                  className={cn(
                    "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                    isCurrentlyActive
                      ? "bg-amber-500/5 dark:bg-amber-500/10"
                      : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <UserAvatar
                      name={user.full_name}
                      role={user.role}
                      avatarColor={user.avatar_color}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {user.full_name}
                        </span>
                        <RoleBadge role={user.role} size="xs" />
                        {isSelf && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Akun Utama Anda
                          </span>
                        )}
                        {isCurrentlyActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Sedang Diimpersonasi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{user.email}</span>
                        {user.phone && (
                          <>
                            <span>•</span>
                            <span>{user.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground px-3 py-1.5 font-medium">
                        Akun Asli
                      </span>
                    ) : isCurrentlyActive ? (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        Sesi Aktif
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleImpersonate(user.id)}
                        disabled={isPending}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title={`Masuk dan gunakan sistem sebagai ${user.full_name}`}
                      >
                        {isTargetPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Masuk sebagai User Ini</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
