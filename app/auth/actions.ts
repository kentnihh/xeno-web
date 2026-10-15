"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error?: string;
}

/**
 * Authenticates user credentials using email & password.
 * Redirects to dashboard on success, returns error object on failure.
 * @param formData - Form data containing `email` and `password`
 */
export async function login(formData: FormData): Promise<AuthActionResult | void> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat proses login." };
  }

  redirect("/dashboard");
}

/**
 * Signs out current user session from Supabase Auth and clears session cookies.
 * Redirects user to `/login`.
 */
export async function logout(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
  } catch (err: unknown) {
    console.error("[logout] Error signing out:", err);
  }

  redirect("/login");
}

