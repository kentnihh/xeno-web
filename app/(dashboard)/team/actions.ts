"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, isSuperAdmin, isSuperAdminRole } from "@/lib/auth";
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
    await requirePermission("team.manage");

    const validated = updateMemberRoleSchema.parse({ userId, newRole, avatarColor });

    // Guardrail: Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (isSuperAdminRole(validated.newRole)) {
      const callerIsSuper = await isSuperAdmin();
      if (!callerIsSuper) {
        return {
          success: false,
          error: "Akses ditolak: Hanya Super Admin yang berwenang menetapkan peran Super Admin.",
        };
      }
    }

    const supabase = await createClient();

    // Guardrail: Non-Super Admin cannot modify a Super Admin profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", validated.userId)
      .maybeSingle();

    if (targetProfile && isSuperAdminRole(targetProfile.role)) {
      const callerIsSuper = await isSuperAdmin();
      if (!callerIsSuper) {
        return {
          success: false,
          error: "Akses ditolak: Akun Super Admin tidak dapat diubah oleh peran Admin standar.",
        };
      }
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

    // Keep user_roles table synchronized with profiles.role
    await supabase.from("user_roles").delete().eq("user_id", validated.userId);
    await supabase.from("user_roles").insert({ user_id: validated.userId, role_id: validated.newRole });

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
    const supabase = await createClient();

    // Prevent self-deletion
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === validId) {
      return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
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
