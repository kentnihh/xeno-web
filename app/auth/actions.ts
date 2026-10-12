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
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Registers a new staff member into Supabase Auth.
 * Supabase triggers automatically populate the public.profiles record.
 * @param formData - Form data containing `email`, `password`, and `fullName`
 */
export async function signup(formData: FormData): Promise<AuthActionResult | void> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Signs out current user session from Supabase Auth and clears session cookies.
 * Redirects user to `/login`.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
