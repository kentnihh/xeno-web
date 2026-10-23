"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, isSuperAdmin, isSuperAdminRole, getCurrentUser, getCurrentProfile, isAdmin } from "@/lib/auth";
import type { UserRole } from "@/types/database";

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1, "ID pengguna wajib diisi"),
  newRole: z.string().min(1, "Peran pengguna wajib diisi"),
  avatarColor: z.string().optional().nullable(),
});

export async function updateMemberRoleAction(
  userId: string,
  newRole: UserRole,
  avatarColor?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Strict Permission Verification: rbac.manage required to change roles
    await requirePermission("rbac.manage");

    const validated = updateMemberRoleSchema.parse({ userId, newRole, avatarColor });

    // 2. Prevent Self-Role Modification
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Autentikasi diperlukan." };
    }
    const callerProfile = await getCurrentProfile(currentUser.id);
    const callerRole = (callerProfile?.role || "staff").toUpperCase();

    // Check 1 (Self-edit block):
    if (validated.userId === currentUser.id) {
      return { success: false, error: "Anda tidak dapat mengubah peran akun Anda sendiri." };
    }

    // 3. Role Hierarchy Check:
    // Only SUPER_ADMIN and ADMIN can assign roles. MANAGER and STAFF can NEVER assign roles.
    const callerIsSuper = callerRole === "SUPER_ADMIN" || (await isSuperAdmin(currentUser.id));
    const callerIsAdmin = callerRole === "ADMIN" || (await isAdmin(currentUser.id));

    if (!callerIsSuper && !callerIsAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin dan Administrator yang dapat mengelola peran pengguna.",
      };
    }

    if (!["SUPER_ADMIN", "ADMIN"].includes(callerRole)) {
      return {
        success: false,
        error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah peran.",
      };
    }

    // Standard ADMIN cannot assign or touch SUPER_ADMIN
    if (isSuperAdminRole(validated.newRole) && !callerIsSuper) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin yang berwenang menetapkan peran Super Admin.",
      };
    }

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    // Guardrail: Non-Super Admin cannot modify a Super Admin profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", validated.userId)
      .maybeSingle();

    // Root Admin Protection:
    if (targetProfile?.email?.toLowerCase() === "admin@xenoent.com" && currentUser.email?.toLowerCase() !== "admin@xenoent.com") {
      return {
        success: false,
        error: "Peran akun admin@xenoent.com dilindungi sistem dan tidak dapat diubah.",
      };
    }

    if (targetProfile && isSuperAdminRole(targetProfile.role) && !callerIsSuper) {
      return {
        success: false,
        error: "Akses ditolak: Akun Super Admin tidak dapat diubah oleh peran Admin standar.",
      };
    }

    const updatePayload: Record<string, unknown> = {
      role: validated.newRole,
      updated_at: new Date().toISOString(),
    };
    if (validated.newRole === "admin" && validated.avatarColor) {
      updatePayload.avatar_color = validated.avatarColor;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", validated.userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Keep user_roles table synchronized with profiles.role (for operational roles)
    await supabase.from("user_roles").delete().eq("user_id", validated.userId);
    if (!isSuperAdminRole(validated.newRole)) {
      await supabase.from("user_roles").insert({ user_id: validated.userId, role_id: validated.newRole });
    }

    revalidatePath("/team");
    revalidatePath("/settings/rbac");
    revalidatePath("/users");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui peran anggota tim.",
    };
  }
}

const updateAvatarColorSchema = z.object({
  userId: z.string().min(1, "ID pengguna wajib diisi"),
  avatarColor: z.string().min(1, "Warna avatar wajib diisi"),
});

export async function updateMemberAvatarColorAction(
  userId: string,
  avatarColor: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("team.manage");
    const validated = updateAvatarColorSchema.parse({ userId, avatarColor });
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_color: validated.avatarColor, updated_at: new Date().toISOString() })
      .eq("id", validated.userId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/team");
    revalidatePath("/settings/rbac");
    revalidatePath("/users");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui warna avatar.",
    };
  }
}

export async function deleteMemberAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("team.manage");

    const validId = z.string().min(1, "ID pengguna wajib diisi").parse(userId);
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Autentikasi diperlukan." };
    }

    // Prevent self-deletion
    if (currentUser.id === validId) {
      return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
    }

    const callerIsSuper = await isSuperAdmin(currentUser.id);
    const callerIsAdmin = await isAdmin(currentUser.id);

    if (!callerIsSuper && !callerIsAdmin) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin dan Administrator yang dapat menghapus akun anggota tim.",
      };
    }

    const callerProfile = (await getCurrentProfile()) || (await getCurrentProfile(currentUser.id));
    const callerRole = (callerProfile?.role || "").toUpperCase();

    // 1. Role Authorization
    if (!["SUPER_ADMIN", "ADMIN"].includes(callerRole)) {
      return {
        success: false,
        error: "Akses ditolak: Hanya Administrator yang berwenang menghapus pengguna.",
      };
    }

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    // Guardrail: Non-Super Admin cannot delete a Super Admin profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", validId)
      .maybeSingle();

    // Root Admin Protection:
    if (targetProfile?.email?.toLowerCase() === "admin@xenoent.com") {
      return {
        success: false,
        error: "Akses ditolak: Akun root admin tidak dapat dihapus.",
      };
    }

    if (targetProfile && isSuperAdminRole(targetProfile.role) && !callerIsSuper) {
      return {
        success: false,
        error: "Akses ditolak: Akun Super Admin tidak dapat dihapus oleh Admin standar.",
      };
    }

    // Delete from Supabase Auth via Admin API if service key exists
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.deleteUser(validId);
    }

    // Delete role relations and profile record
    await supabase.from("user_roles").delete().eq("user_id", validId);
    const { error } = await supabase.from("profiles").delete().eq("id", validId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/team");
    revalidatePath("/settings/rbac");
    revalidatePath("/users");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus anggota tim.",
    };
  }
}

/** Updates staff profile and validates caller authorization against role modifications */
export async function updateStaff(formData: FormData) {
  const { updateUser } = await import("@/app/(dashboard)/settings/rbac/actions");
  return updateUser(formData);
}

/** Creates staff profile and validates caller authorization */
export async function createStaff(formData: FormData) {
  const { createUser } = await import("@/app/(dashboard)/settings/rbac/actions");
  return createUser(formData);
}

/** Semantic alias for createStaff / createUser */
export const createUser = createStaff;

/** Deletes staff profile and validates caller authorization */
export async function deleteStaff(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validId = z.string().min(1, "ID pengguna wajib diisi").parse(userId);
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Autentikasi diperlukan.");
    }
    const callerProfile = (await getCurrentProfile()) || (await getCurrentProfile(currentUser.id));
    const callerRole = (callerProfile?.role || "").toUpperCase();

    // 1. Role Authorization
    if (!["SUPER_ADMIN", "ADMIN"].includes(callerRole) && !["SUPER_ADMIN", "ADMIN"].includes(callerProfile?.role || "")) {
      throw new Error("Akses ditolak: Hanya Administrator yang berwenang menghapus pengguna.");
    }

    // 2. Prevent Self-Deletion
    if (validId === currentUser.id) {
      throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    const res = await deleteMemberAction(validId);
    if (!res.success) {
      throw new Error(res.error || "Gagal menghapus pengguna.");
    }
    return res;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus pengguna.",
    };
  }
}



