"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRealSuperAdmin, getRealUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Initiates user impersonation mode for the current session.
 * Strictly guarded: only authentic SUPER_ADMIN users can invoke this action.
 */
export async function impersonateUser(
  targetUserId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const realUser = await getRealUser();
    if (!realUser) {
      return { error: "Autentikasi diperlukan. Silakan login terlebih dahulu." };
    }

    const superAdmin = await isRealSuperAdmin();
    if (!superAdmin) {
      return {
        error: "Akses ditolak: Fitur impersonasi hanya berwenang digunakan oleh Super Admin.",
      };
    }

    if (!targetUserId || targetUserId === realUser.id) {
      return { error: "Pilih akun staf lain untuk melakukan impersonasi." };
    }

    // Verify target user profile exists
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    const { data: targetProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return { error: "Pengguna target tidak ditemukan dalam sistem." };
    }

    const cookieStore = await cookies();
    cookieStore.set("x-impersonate-user-id", targetUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/events");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Gagal memulai mode impersonasi.",
    };
  }
}

/**
 * Terminates user impersonation mode, restores Super Admin context,
 * and redirects to the main dashboard.
 */
export async function stopImpersonating(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("x-impersonate-user-id");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
