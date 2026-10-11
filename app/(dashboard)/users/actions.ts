"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

type ActionResult = { success?: boolean; error?: string };

/** Create user in Supabase Auth, profiles, and user_roles */
export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const roleId = ((formData.get("roleId") as string)?.trim() || "staff").toLowerCase();

    if (!fullName || !email || !password) {
      return { error: "Nama lengkap, email, dan kata sandi wajib diisi." };
    }
    if (password.length < 6) {
      return { error: "Kata sandi minimal 6 karakter." };
    }

    const adminClient = createAdminClient();
    const supabase = await createClient();
    let createdUserId: string | null = null;

    // 1. Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (!authError && authData?.user) {
      createdUserId = authData.user.id;
    } else {
      // ponytail: fallback signup when service role key not provided in env
      const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) return { error: signUpError.message };
      createdUserId = signUpData.user?.id || null;
    }

    if (!createdUserId) {
      return { error: "Gagal membuat kredensial pengguna di Supabase Auth." };
    }

    // 2. Profile
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: createdUserId,
        full_name: fullName,
        email,
        phone,
        role: roleId as "admin" | "manager" | "staff",
      },
      { onConflict: "id" }
    );
    if (profileError) return { error: profileError.message };

    // 3. User Role
    await supabase.from("user_roles").upsert(
      { user_id: createdUserId, role_id: roleId },
      { onConflict: "user_id,role_id" }
    );

    revalidatePath("/users");
    revalidatePath("/team");
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

    revalidatePath("/users");
    revalidatePath("/team");
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

    revalidatePath("/users");
    revalidatePath("/team");
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

    revalidatePath("/users");
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

    revalidatePath("/users");
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

    revalidatePath("/users");
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
    const description = (formData.get("description") as string)?.trim() || null;
    const targetModule = ((formData.get("module") as string)?.trim() || "general").toLowerCase();

    if (!id || !name) return { error: "Kode izin dan nama izin wajib diisi." };

    const supabase = await createClient();
    const { error } = await supabase.from("permissions").insert({
      id,
      name,
      description,
      module: targetModule,
    });
    if (error) return { error: error.message };

    revalidatePath("/users");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Delete permission definition */
export async function deletePermission(permissionId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase.from("permissions").delete().eq("id", permissionId);
    if (error) return { error: error.message };

    revalidatePath("/users");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

