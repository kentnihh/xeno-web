"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

type ActionResult = { success?: boolean; error?: string };

function revalidateRBAC() {
  revalidatePath("/settings/rbac");
  revalidatePath("/users");
  revalidatePath("/team");
}

/** Create user in Supabase Auth, profiles, and user_roles */
export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const roleId = ((formData.get("roleId") as string)?.trim() || "staff").toLowerCase();

    if (!fullName || !email || !password) {
      return { error: "Nama lengkap, email, dan kata sandi wajib diisi." };
    }
    if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) {
      return { error: "Kata sandi dan konfirmasi kata sandi tidak cocok." };
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
    await requireAdmin();

    const id = formData.get("id") as string;
    const fullName = (formData.get("fullName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const roleId = ((formData.get("roleId") as string)?.trim() || "staff").toLowerCase();

    if (!id || !fullName) return { error: "ID dan nama lengkap wajib diisi." };

    const supabase = await createClient();
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, role: roleId as "admin" | "manager" | "staff" })
      .eq("id", id);

    if (profileError) return { error: profileError.message };

    await supabase.from("user_roles").delete().eq("user_id", id);
    await supabase.from("user_roles").insert({ user_id: id, role_id: roleId });

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Reset user password via Supabase Admin API */
export async function resetUserPassword(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const permissionIds = formData.getAll("permissionIds") as string[];

    if (!id || !name) return { error: "Kode role dan nama role wajib diisi." };

    const supabase = await createClient();
    const { error: roleError } = await supabase.from("roles").insert({ id, name, description });
    if (roleError) return { error: roleError.message };

    if (permissionIds.length > 0) {
      const records = permissionIds.map((pId) => ({ role_id: id, permission_id: pId }));
      await supabase.from("role_permissions").insert(records);
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Update RBAC role details and associated permissions */
export async function updateRole(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const permissionIds = formData.getAll("permissionIds") as string[];

    if (!id || !name) return { error: "ID dan nama role wajib diisi." };

    const supabase = await createClient();
    const { error: roleError } = await supabase
      .from("roles")
      .update({ name, description })
      .eq("id", id);
    if (roleError) return { error: roleError.message };

    await supabase.from("role_permissions").delete().eq("role_id", id);
    if (permissionIds.length > 0) {
      const records = permissionIds.map((pId) => ({ role_id: id, permission_id: pId }));
      await supabase.from("role_permissions").insert(records);
    }

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete custom RBAC role */
export async function deleteRole(roleId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const protectedRoles = ["admin", "staff", "manager"];
    if (protectedRoles.includes(roleId.toLowerCase())) {
      return { error: `Peran bawaan sistem '${roleId}' tidak dapat dihapus.` };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("roles").delete().eq("id", roleId);
    if (error) return { error: error.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Create granular permission definition */
export async function createPermission(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = (formData.get("id") as string)?.trim().toLowerCase();
    const name = (formData.get("name") as string)?.trim();
    const permModule = (formData.get("module") as string)?.trim().toLowerCase();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!id || !name || !permModule) {
      return { error: "ID, nama, dan modul permission wajib diisi." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("permissions").insert({ id, name, module: permModule, description });
    if (error) return { error: error.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete custom permission definition */
export async function deletePermission(permId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase.from("permissions").delete().eq("id", permId);
    if (error) return { error: error.message };

    revalidateRBAC();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

