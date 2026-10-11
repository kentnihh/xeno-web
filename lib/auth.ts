import { createClient } from "./supabase/server";
import { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";

/**
 * Guards server actions — throws if no authenticated user.
 * Returns the authenticated user so callers can use user.id.
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Autentikasi diperlukan. Silakan login terlebih dahulu.");
  }
  return user;
}

/**
 * Guards admin-only server actions — throws if not authenticated or not admin.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Akses ditolak: Hanya Administrator yang berwenang.");
  }
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile as Profile | null;
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") return true;

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id)
    .eq("role_id", "admin")
    .maybeSingle();

  return Boolean(userRole);
}

export async function hasPermission(permissionId: string): Promise<boolean> {
  const admin = await isAdmin();
  if (admin) return true;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  if (!userRoles || userRoles.length === 0) return false;
  const roleIds = userRoles.map((r) => r.role_id);

  const { data: rolePerm } = await supabase
    .from("role_permissions")
    .select("id")
    .in("role_id", roleIds)
    .eq("permission_id", permissionId)
    .limit(1);

  return Boolean(rolePerm && rolePerm.length > 0);
}

