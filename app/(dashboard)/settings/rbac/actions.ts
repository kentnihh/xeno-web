"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth";
import { FALLBACK_PERMISSIONS } from "@/lib/rbac-fallbacks";

type ActionResult = { success?: boolean; error?: string };

function revalidateRBAC() {
  revalidatePath("/settings/rbac");
  revalidatePath("/settings/rbac", "page");
  revalidatePath("/users");
  revalidatePath("/team");
}

async function getRBACClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient();
  }
  return await createClient();
}

/** Create user in Supabase Auth, profiles, and user_roles */
export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const roleId = ((formData.get("roleId") as string)?.trim() || "staff").toLowerCase();
    const avatarColor = (formData.get("avatarColor") as string)?.trim() || null;

    if (!fullName || !email || !password) {
      return { error: "Nama lengkap, email, dan kata sandi wajib diisi." };
    }
    if (password.length < 6) {
      return { error: "Kata sandi minimal 6 karakter." };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server. Pembuatan pengguna memerlukan Admin API.",
      };
    }

    const adminClient = createAdminClient();

    // 1. Supabase Auth via Admin API (prevents signing out the current admin session)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData?.user) {
      return { error: authError?.message || "Gagal membuat kredensial pengguna di Supabase Auth." };
    }

    const createdUserId = authData.user.id;

    // 2. Profile
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: createdUserId,
        full_name: fullName,
        email,
        phone,
        role: roleId as "admin" | "manager" | "staff",
        avatar_color: roleId === "admin" ? avatarColor : null,
      },
      { onConflict: "id" }
    );
    if (profileError) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      return { error: profileError.message };
    }

    // 3. User Role
    const { error: roleError } = await adminClient.from("user_roles").upsert(
      { user_id: createdUserId, role_id: roleId },
      { onConflict: "user_id,role_id" }
    );
    if (roleError) return { error: roleError.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Update user profile and assigned role */
export async function updateUser(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");

    const id = formData.get("id") as string;
    const fullName = (formData.get("fullName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const roleId = ((formData.get("roleId") as string)?.trim() || "staff").toLowerCase();
    const avatarColor = (formData.get("avatarColor") as string)?.trim() || null;

    if (!id || !fullName) return { error: "ID dan nama lengkap wajib diisi." };

    const supabase = await getRBACClient();
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        role: roleId as "admin" | "manager" | "staff",
        avatar_color: roleId === "admin" ? avatarColor : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (profileError) return { error: profileError.message };

    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", id);
    if (delError) return { error: delError.message };

    const { error: insError } = await supabase.from("user_roles").insert({ user_id: id, role_id: roleId });
    if (insError) return { error: insError.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Reset user password via Supabase Admin API */
export async function resetUserPassword(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");

    const userId = (formData.get("userId") as string)?.trim();
    const newPassword = formData.get("newPassword") as string;

    if (!userId) {
      return { error: "ID pengguna wajib diisi." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: "Kata sandi baru minimal 6 karakter." };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server. Reset kata sandi pengguna memerlukan Admin API.",
      };
    }

    const supabaseAdmin = createAdminClient();
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (resetError) {
      return { error: resetError.message };
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete user from Supabase Auth and profiles */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      return { error: "Anda tidak dapat menghapus akun Anda sendiri." };
    }

    const adminClient = createAdminClient();
    await adminClient.auth.admin.deleteUser(userId);
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) return { error: error.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Create new RBAC role with permissions */
export async function createRole(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("rbac.manage");

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const permissionIds = formData.getAll("permissionIds") as string[];

    if (!id || !name) return { error: "Kode role dan nama role wajib diisi." };

    const supabase = await getRBACClient();
    const { error: roleError } = await supabase.from("roles").insert({ id, name, description });
    if (roleError) {
      console.error("[createRole] Failed to insert role:", roleError);
      return { error: roleError.message };
    }

    if (permissionIds.length > 0) {
      const { data: existingPerms } = await supabase.from("permissions").select("id");
      const existingPermIds = new Set((existingPerms || []).map((p) => p.id));
      const missingPerms = FALLBACK_PERMISSIONS.filter(
        (fp) => !existingPermIds.has(fp.id) && permissionIds.includes(fp.id)
      );
      if (missingPerms.length > 0) {
        await supabase.from("permissions").upsert(
          missingPerms.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            module: p.module,
          })),
          { onConflict: "id" }
        );
      }

      const records = permissionIds.map((pId) => ({ role_id: id, permission_id: pId }));
      const { error: permError } = await supabase.from("role_permissions").insert(records);
      if (permError) {
        console.error("[createRole] Failed to insert role_permissions:", permError);
        return { error: `Gagal menyimpan izin peran: ${permError.message}` };
      }
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    console.error("[createRole] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Update RBAC role details and associated permissions */
export async function updateRole(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("rbac.manage");

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const permissionIds = formData.getAll("permissionIds") as string[];

    if (!id || !name) return { error: "ID dan nama role wajib diisi." };

    const supabase = await getRBACClient();

    // 1. Ensure the role exists in the database
    const { data: existingRole, error: checkError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      console.error("[updateRole] Failed to check role existence:", checkError);
      return { error: `Gagal memeriksa peran: ${checkError.message}` };
    }

    if (!existingRole) {
      const { error: insRoleError } = await supabase
        .from("roles")
        .insert({ id, name, description });
      if (insRoleError) {
        console.error("[updateRole] Failed to insert missing role:", insRoleError);
        return { error: `Gagal membuat peran: ${insRoleError.message}` };
      }
    } else {
      const { error: roleError } = await supabase
        .from("roles")
        .update({ name, description })
        .eq("id", id);
      if (roleError) {
        console.error("[updateRole] Failed to update role:", roleError);
        return { error: `Gagal memperbarui peran: ${roleError.message}` };
      }
    }

    // 2. Clear old role_permissions
    const { error: delError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", id);
    if (delError) {
      console.error("[updateRole] Failed to clear role permissions:", delError);
      return { error: `Gagal memperbarui izin peran: ${delError.message}` };
    }

    // 3. Insert new role_permissions if any
    if (permissionIds.length > 0) {
      const { data: existingPerms } = await supabase.from("permissions").select("id");
      const existingPermIds = new Set((existingPerms || []).map((p) => p.id));
      const missingPerms = FALLBACK_PERMISSIONS.filter(
        (fp) => !existingPermIds.has(fp.id) && permissionIds.includes(fp.id)
      );
      if (missingPerms.length > 0) {
        await supabase.from("permissions").upsert(
          missingPerms.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            module: p.module,
          })),
          { onConflict: "id" }
        );
      }

      const records = permissionIds.map((pId) => ({ role_id: id, permission_id: pId }));
      const { error: insPermError } = await supabase.from("role_permissions").insert(records);
      if (insPermError) {
        console.error("[updateRole] Failed to insert role permissions:", insPermError);
        return { error: `Gagal menyimpan izin peran: ${insPermError.message}` };
      }
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    console.error("[updateRole] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete custom RBAC role */
export async function deleteRole(roleId: string): Promise<ActionResult> {
  try {
    await requirePermission("rbac.manage");

    const protectedRoles = ["admin", "staff", "manager"];
    if (protectedRoles.includes(roleId.toLowerCase())) {
      return { error: `Peran bawaan sistem '${roleId}' tidak dapat dihapus.` };
    }

    const supabase = await getRBACClient();
    const { error } = await supabase.from("roles").delete().eq("id", roleId);
    if (error) {
      console.error("[deleteRole] Failed to delete role:", error);
      return { error: error.message };
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteRole] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Create granular permission definition */
export async function createPermission(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("rbac.manage");

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const permModule = (formData.get("module") as string)?.trim().toLowerCase();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!id || !name || !permModule) {
      return { error: "ID, nama, dan modul permission wajib diisi." };
    }

    const supabase = await getRBACClient();
    const { error } = await supabase.from("permissions").insert({ id, name, module: permModule, description });
    if (error) {
      console.error("[createPermission] Failed to insert permission:", error);
      return { error: error.message };
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    console.error("[createPermission] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete custom permission definition */
export async function deletePermission(permId: string): Promise<ActionResult> {
  try {
    await requirePermission("rbac.manage");

    const supabase = await getRBACClient();
    const { error } = await supabase.from("permissions").delete().eq("id", permId);
    if (error) {
      console.error("[deletePermission] Failed to delete permission:", error);
      return { error: error.message };
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    console.error("[deletePermission] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

