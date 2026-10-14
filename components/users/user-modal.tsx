"use client";

import { useState, useTransition } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createUser, updateUser } from "@/app/(dashboard)/users/actions";
import { ModalShell } from "./modal-shell";
import type { Role, UserWithRBAC } from "@/types/database";

export function UserModal({
  user,
  roles,
  onClose,
}: {
  user: UserWithRBAC | null;
  roles: Role[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = Boolean(user);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    if (!isEdit) {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (!password || password.length < 6) {
        setError("Kata sandi minimal 6 karakter.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
        return;
      }
    }

    startTransition(async () => {
      const res = isEdit ? await updateUser(formData) : await createUser(formData);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Konfirmasi Kata Sandi <span className="text-[#ff453a]">*</span>
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Ulangi kata sandi"
                className="apple-input w-full px-3.5 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Peran (Role) <span className="text-[#ff453a]">*</span>
            </label>
            <select
              name="roleId"
              defaultValue={user?.roles?.[0]?.id || user?.role || "staff"}
              className="apple-input w-full px-3.5 py-2 text-sm cursor-pointer capitalize bg-muted text-foreground border-border"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-card text-foreground">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary px-4 py-2 text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary px-4 py-2 text-xs gap-1.5 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEdit ? "Simpan Perubahan" : "Buat Pengguna"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
