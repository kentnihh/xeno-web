"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createRole, updateRole } from "@/app/(dashboard)/users/actions";
import { ModalShell } from "./modal-shell";
import type { Role, Permission } from "@/types/database";

export function RoleModal({
  role,
  allPermissions,
  assignedPermissionIds = [],
  onClose,
  onSuccess,
}: {
  role: Role | null;
  allPermissions: Permission[];
  assignedPermissionIds?: string[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>(assignedPermissionIds);
  const isEdit = Boolean(role);

  function togglePerm(pId: string) {
    setSelectedPerms((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    if (isEdit && role?.id) {
      formData.set("id", role.id);
    }
    formData.delete("permissionIds");
    selectedPerms.forEach((pId) => formData.append("permissionIds", pId));

    startTransition(async () => {
      try {
        const res = isEdit ? await updateRole(formData) : await createRole(formData);
        if (res.error) {
          setError(res.error);
        } else {
          const roleName = (formData.get("name") as string) || role?.name || "Peran";
          onSuccess?.(
            isEdit
              ? `Peran "${roleName}" berhasil diperbarui.`
              : `Peran "${roleName}" berhasil dibuat.`
          );
          onClose();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses peran.");
      }
    });
  }

  return (
    <ModalShell
      title={isEdit ? `Edit Peran: ${role?.name}` : "Buat Peran Baru"}
      subtitle="Konfigurasikan hak akses dan izin modul operasional untuk peran ini"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {isEdit && <input type="hidden" name="id" value={role!.id} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kode / Slug <span className="text-[#ff453a]">*</span>
            </label>
            <input
              name={isEdit ? undefined : "id"}
              defaultValue={role?.id || ""}
              disabled={isEdit}
              required={!isEdit}
              placeholder="misal: stage_coordinator"
              className={`apple-input w-full px-3.5 py-2 text-sm ${
                isEdit ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nama Tampilan <span className="text-[#ff453a]">*</span>
            </label>
            <input
              name="name"
              defaultValue={role?.name || ""}
              required
              placeholder="misal: Stage Coordinator"
              className="apple-input w-full px-3.5 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Deskripsi</label>
          <input
            name="description"
            defaultValue={role?.description || ""}
            placeholder="Tanggung jawab & cakupan peran..."
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-2">
            Pilih Izin Akses ({selectedPerms.length} terpilih)
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-muted/50 border border-border">
            {allPermissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedPerms.includes(perm.id)}
                  onChange={() => togglePerm(perm.id)}
                  className="mt-0.5 rounded-md border-border text-[#007aff] focus:ring-[#007aff] bg-card cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{perm.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff]">
                      {perm.id}
                    </span>
                  </div>
                  {perm.description && (
                    <p className="text-muted-foreground text-[11px] mt-0.5">{perm.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
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
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEdit ? "Simpan Peran" : "Buat Peran"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
