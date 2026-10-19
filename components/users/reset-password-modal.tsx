"use client";

import { useState, useTransition } from "react";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { resetUserPassword } from "@/app/(dashboard)/users/actions";
import { ModalShell } from "./modal-shell";
import type { UserWithRBAC } from "@/types/database";

export function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserWithRBAC;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const newPassword = (formData.get("newPassword") as string) || "";

    if (!newPassword || newPassword.length < 6) {
      setError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await resetUserPassword(formData);
      if (res.error) {
        setError(res.error);
      } else {
        onSuccess?.(`Kata sandi untuk ${user.full_name} berhasil diperbarui.`);
        onClose();
      }
    });
  }

  return (
    <ModalShell
      title="Reset Kata Sandi"
      subtitle={`Perbarui kata sandi login untuk staf "${user.full_name}" (${user.email})`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <input type="hidden" name="userId" value={user.id} />

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Kata Sandi Baru <span className="text-[#ff453a]">*</span>
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              className="apple-input w-full pl-3.5 pr-10 py-2 text-sm"
              autoFocus
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
          <p className="text-[11px] text-muted-foreground mt-1">
            Kata sandi baru akan langsung berlaku untuk login akun staf bersangkutan.
          </p>
        </div>

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
            disabled={isPending}
            className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            <span>{isPending ? "Memproses..." : "Reset Sandi"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
