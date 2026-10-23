"use client";

import { useState, useEffect, useTransition } from "react";
import { Loader2, Eye, EyeOff, Palette, Check, Lock } from "lucide-react";
import { createUser, updateUser } from "@/app/(dashboard)/users/actions";
import { Combobox } from "@/components/ui/combobox";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";
import type { Role, UserWithRBAC } from "@/types/database";

const ADMIN_COLOR_SWATCHES = [
  { hex: "#007aff", label: "Classic Blue" },
  { hex: "#5856d6", label: "Indigo" },
  { hex: "#af52de", label: "Purple" },
  { hex: "#ff2d55", label: "Pink" },
  { hex: "#ff3b30", label: "Red" },
  { hex: "#ff9500", label: "Orange" },
  { hex: "#ffcc00", label: "Yellow" },
  { hex: "#34c759", label: "Green" },
  { hex: "#00c7be", label: "Teal" },
  { hex: "#1c1c1e", label: "Midnight" },
];

export function UserModal({
  user,
  roles,
  onClose,
  onSuccess,
  currentUserId,
  currentUserRole,
}: {
  user: UserWithRBAC | null;
  roles: Role[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
  currentUserId?: string | null;
  currentUserRole?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [callerRole, setCallerRole] = useState<string | null>(currentUserRole || null);

  useEffect(() => {
    if (currentUserRole) {
      setCallerRole(currentUserRole);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .maybeSingle();
        if (prof?.role) {
          setCallerRole(prof.role.toUpperCase());
        }
      }
    });
  }, [currentUserRole]);

  const effectiveCallerRole = (currentUserRole || callerRole || "").toUpperCase();
  const isCallerAdminOrSuper = effectiveCallerRole === "SUPER_ADMIN" || effectiveCallerRole === "ADMIN";
  const isCallerSuper = effectiveCallerRole === "SUPER_ADMIN";

  const isEdit = Boolean(user);
  const isSelf = Boolean(user && currentUserId && user.id === currentUserId);
  const isRootAdmin = user?.email?.toLowerCase() === "admin@xenoent.com";

  // Lock Role Selector:
  // 1. Root admin account (admin@xenoent.com) cannot be edited by other users
  // 2. Self-role edit is strictly blocked (users cannot change their own role)
  // 3. If caller is NOT SUPER_ADMIN and NOT ADMIN (e.g. MANAGER, STAFF), role selector MUST be disabled/locked
  const isRoleLocked = isRootAdmin || isSelf || !isCallerAdminOrSuper;

  const [roleId, setRoleId] = useState(user?.roles?.[0]?.id || user?.role || roles[0]?.id || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || "#007aff");

  const isAdminRole =
    (roleId || "").toLowerCase() === "admin" ||
    (roleId || "").toLowerCase() === "super_admin";

  const filteredRoleOptions = roles
    .filter((r) => {
      const id = r.id.toLowerCase();
      const name = r.name.toLowerCase();

      // Only SUPER_ADMIN can assign SUPER_ADMIN role
      if (!isCallerSuper) {
        if (
          id === "super_admin" ||
          id === "superadmin" ||
          name.includes("super administrator")
        ) {
          return false;
        }
      }

      // Non-admins cannot assign or see elevated admin roles
      if (!isCallerAdminOrSuper) {
        if (id === "admin" || id === "super_admin" || name.includes("administrator")) {
          return false;
        }
      }

      return true;
    })
    .map((r) => ({
      value: r.id,
      label: r.name,
      subLabel: r.description || undefined,
    }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    if (!isEdit) {
      if (!isCallerAdminOrSuper) {
        setError("Akses ditolak: Hanya Administrator yang berwenang menambahkan pengguna baru.");
        return;
      }

      const password = formData.get("password") as string;

      if (!password || password.length < 6) {
        setError("Kata sandi minimal 6 karakter.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = isEdit ? await updateUser(formData) : await createUser(formData);
        if (res.error) {
          setError(res.error);
        } else {
          const fullName = (formData.get("fullName") as string) || user?.full_name || "Staf";
          onSuccess?.(
            isEdit
              ? `Data staf "${fullName}" berhasil diperbarui.`
              : `Staf baru "${fullName}" berhasil didaftarkan.`
          );
          onClose();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan data staf.");
      }
    });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Data Staf" : "Tambah Pengguna Baru"}
      subtitle={
        isEdit
          ? "Perbarui informasi akun dan peran hak akses staf"
          : "Daftarkan akun staf baru dan buat kredensial login di Supabase Auth"
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {isRootAdmin && !isSelf && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Akun Sistem Utama (Terkunci) — Peran akun admin@xenoent.com dilindungi sistem dan tidak dapat diubah oleh pengguna lain.</span>
          </div>
        )}

        {!isEdit && !isCallerAdminOrSuper && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Akses ditolak: Hanya Administrator yang berwenang menambahkan pengguna baru.</span>
          </div>
        )}

        {isEdit && <input type="hidden" name="id" value={user!.id} />}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Nama Lengkap <span className="text-[#ff453a]">*</span>
          </label>
          <input
            name="fullName"
            defaultValue={user?.full_name || ""}
            required
            placeholder="Misal: Rian Pratama"
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Email Staf <span className="text-[#ff453a]">*</span>
          </label>
          <input
            name="email"
            type="email"
            defaultValue={user?.email || ""}
            disabled={isEdit}
            required
            placeholder="staf@xenoent.com"
            className={`apple-input w-full px-3.5 py-2 text-sm ${
              isEdit ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kata Sandi Login <span className="text-[#ff453a]">*</span>
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="apple-input w-full pl-3.5 pr-10 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nomor Telepon
            </label>
            <input
              name="phone"
              defaultValue={user?.phone || ""}
              placeholder="+62 812-xxxx-xxxx"
              className="apple-input w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-foreground">
                Peran (Role) <span className="text-[#ff453a]">*</span>
              </label>
              {isRootAdmin ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md"
                  title="Akun Sistem Utama (Terkunci)"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Akun Sistem Utama (Terkunci)</span>
                </span>
              ) : isSelf ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md"
                  title="Anda tidak dapat mengubah peran Anda sendiri."
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Anda tidak dapat mengubah peran Anda sendiri</span>
                </span>
              ) : !isCallerAdminOrSuper ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md"
                  title="Hanya Administrator yang dapat mengubah peran staf."
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Hanya Administrator yang dapat mengubah peran staf</span>
                </span>
              ) : null}
            </div>

            {isRoleLocked ? (
              <div
                className="relative"
                title={
                  isRootAdmin
                    ? "Akun Sistem Utama (Terkunci)"
                    : isSelf
                      ? "Anda tidak dapat mengubah peran Anda sendiri."
                      : "Hanya Administrator yang dapat mengubah peran staf."
                }
              >
                <input type="hidden" name="roleId" value={roleId} />
                <div className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-muted-foreground border-border cursor-not-allowed opacity-75 font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {roles.find((r) => r.id === roleId)?.name ||
                        (roleId === "super_admin" || roleId === "SUPER_ADMIN"
                          ? "Super Administrator"
                          : roleId === "admin" || roleId === "ADMIN"
                            ? "Administrator"
                            : roleId === "manager" || roleId === "MANAGER"
                              ? "Event Manager"
                              : roleId === "staff" || roleId === "STAFF"
                                ? "Kru Operasional"
                                : roleId)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase">
                    <span>(Terkunci)</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>
                    {isRootAdmin
                      ? "Peran akun admin@xenoent.com dilindungi sistem dan tidak dapat diubah."
                      : isSelf
                        ? "Anda tidak dapat mengubah peran Anda sendiri."
                        : "Hanya Administrator yang dapat mengubah peran staf."}
                  </span>
                </p>
              </div>
            ) : (
              <Combobox
                name="roleId"
                value={roleId}
                onChange={setRoleId}
                options={filteredRoleOptions}
                placeholder="Pilih peran..."
                searchPlaceholder="Cari peran..."
              />
            )}
          </div>
        </div>

        {/* Color picker for ADMIN role */}
        {isAdminRole && (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#007aff]" />
                <label className="text-xs font-bold text-foreground">
                  Warna Ikon (Khusus Administrator)
                </label>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-[11px] font-mono font-bold uppercase">{avatarColor}</span>
                <UserAvatar role={roleId} avatarColor={avatarColor} size="sm" showTooltip={false} />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Pilih warna khusus yang akan digunakan pada ikon Shield Administrator di Navbar, tabel pengguna, dan daftar penugasan kru.
            </p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {ADMIN_COLOR_SWATCHES.map((swatch) => {
                const isSelected = avatarColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setAvatarColor(swatch.hex)}
                    title={swatch.label}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform flex items-center justify-center cursor-pointer border shadow-xs hover:scale-110 active:scale-95",
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#007aff] scale-110 border-white dark:border-black"
                        : "border-black/10 dark:border-white/10"
                    )}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-sm" />}
                  </button>
                );
              })}

              {/* Native color picker */}
              <label
                className="relative w-7 h-7 rounded-full border border-dashed border-border/80 hover:border-[#007aff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 bg-background shadow-xs"
                title="Pilih Warna Kustom"
              >
                <input
                  type="color"
                  value={avatarColor}
                  onChange={(e) => setAvatarColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span className="text-[10px] font-bold text-muted-foreground">+</span>
              </label>
            </div>

            <input type="hidden" name="avatarColor" value={avatarColor} />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending || (isRootAdmin && !isSelf)}
            title={isRootAdmin && !isSelf ? "Akun Sistem Utama (Terkunci)" : undefined}
            className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEdit ? "Simpan Perubahan" : "Buat Pengguna"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
