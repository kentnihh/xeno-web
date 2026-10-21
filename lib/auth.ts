import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import {
  FALLBACK_USERS,
  FALLBACK_PERMISSIONS,
  FALLBACK_ROLE_PERMS,
} from "@/lib/rbac-fallbacks";

/**
 * Normalizes permission strings between dot and colon notation,
 * mapping synonymous keys like events.edit <-> events:update.
 */
function getPermissionAliases(perm: string): string[] {
  const normalized = perm.trim().toLowerCase();
  const colonForm = normalized.replace(/\./g, ":");
  const dotForm = normalized.replace(/:/g, ".");
  const set = new Set([normalized, colonForm, dotForm]);

  if (
    [
      "events.edit", "events:edit",
      "events.update", "events:update",
      "events.manage", "events:manage",
      "events.create", "events:create",
    ].includes(normalized) ||
    [
      "events.edit", "events:edit",
      "events.update", "events:update",
      "events.manage", "events:manage",
      "events.create", "events:create",
    ].includes(colonForm)
  ) {
    if (["events.manage", "events:manage"].includes(colonForm)) {
      set.add("events:manage");
      set.add("events.manage");
      set.add("events:create");
      set.add("events.create");
      set.add("events:update");
      set.add("events.update");
      set.add("events:edit");
      set.add("events.edit");
    } else if (["events.create", "events:create"].includes(colonForm)) {
      set.add("events.create");
      set.add("events:create");
      set.add("events.manage");
      set.add("events.manage");
    } else {
      set.add("events.edit");
      set.add("events:edit");
      set.add("events.update");
      set.add("events.update");
      set.add("events.manage");
      set.add("events.manage");
    }
  }

  if (
    ["users.manage", "users:manage", "team.manage", "team:manage", "rbac.manage", "rbac:manage"].includes(normalized) ||
    ["users.manage", "users:manage", "team.manage", "team:manage", "rbac.manage", "rbac:manage"].includes(colonForm)
  ) {
    set.add("users:manage");
    set.add("users.manage");
    set.add("team:manage");
    set.add("team.manage");
    set.add("rbac:manage");
    set.add("rbac.manage");
  }

  if (
    [
      "clients.manage", "clients:manage",
      "clients.create", "clients:create",
      "clients.edit", "clients:edit",
      "clients.update", "clients:update",
      "clients.delete", "clients:delete",
    ].includes(normalized) ||
    [
      "clients.manage", "clients:manage",
      "clients.create", "clients:create",
      "clients.edit", "clients:edit",
      "clients.update", "clients:update",
      "clients.delete", "clients:delete",
    ].includes(colonForm)
  ) {
    set.add("clients:manage");
    set.add("clients.manage");
    set.add("clients:create");
    set.add("clients.create");
    set.add("clients:edit");
    set.add("clients.edit");
    set.add("clients:update");
    set.add("clients.update");
    set.add("clients:delete");
    set.add("clients.delete");
  }

  if (
    [
      "vendors.manage", "vendors:manage",
      "vendors.create", "vendors:create",
      "vendors.edit", "vendors:edit",
      "vendors.update", "vendors:update",
      "vendors.delete", "vendors:delete",
    ].includes(normalized) ||
    [
      "vendors.manage", "vendors:manage",
      "vendors.create", "vendors:create",
      "vendors.edit", "vendors:edit",
      "vendors.update", "vendors:update",
      "vendors.delete", "vendors:delete",
    ].includes(colonForm)
  ) {
    set.add("vendors:manage");
    set.add("vendors.manage");
    set.add("vendors:create");
    set.add("vendors.create");
    set.add("vendors:edit");
    set.add("vendors.edit");
    set.add("vendors:update");
    set.add("vendors.update");
    set.add("vendors:delete");
    set.add("vendors.delete");
  }

  return Array.from(set);
}

/**
 * Deduplicated retrieval of the current Supabase Auth user within a single request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn("[getCurrentUser] Error fetching user:", err);
    return null;
  }
});

/**
 * Guards server actions — throws if no authenticated user.
 * Returns the authenticated user so callers can use user.id.
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
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
  const admin = await isAdmin(user.id);
  if (!admin) {
    throw new Error("Akses ditolak: Hanya Administrator yang berwenang.");
  }
  return user;
}

/**
 * Retrieves the current user's profile, deduplicated across the request.
 */
export const getCurrentProfile = cache(async (userId?: string): Promise<Profile | null> => {
  let targetId = userId;
  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return null;
    targetId = user.id;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  return profile as Profile | null;
});

/**
 * Retrieves all assigned role IDs for the user (or current user if userId omitted).
 * Deduplicated per request lifecycle using React cache().
 */
export const getUserRoles = cache(async (userId?: string): Promise<string[]> => {
  let targetId = userId;
  let profileRole: string | null = null;

  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return [];
    targetId = user.id;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (profile?.role) {
    profileRole = profile.role;
  }

  const roles = new Set<string>();
  if (profileRole) {
    roles.add(profileRole.toLowerCase());
  }

  try {
    const { data: userRoles, error } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", targetId);

    if (!error && userRoles) {
      userRoles.forEach((r) => {
        if (r.role_id) roles.add(r.role_id.toLowerCase());
      });
    }
  } catch (err) {
    console.warn("getUserRoles error:", err);
  }

  if (roles.size === 0) {
    const fallbackUser = FALLBACK_USERS.find((u) => u.id === targetId);
    if (fallbackUser?.role) {
      roles.add(fallbackUser.role.toLowerCase());
    }
  }

  return Array.from(roles);
});

/**
 * Checks if a user has the administrator role.
 * Deduplicated per request lifecycle using React cache().
 */
export const isAdmin = cache(async (userId?: string): Promise<boolean> => {
  const roles = await getUserRoles(userId);
  return roles.includes("admin");
});

/**
 * Retrieves all permission keys assigned to the user across all their roles.
 * Deduplicated per request lifecycle using React cache().
 */
export const getUserPermissions = cache(async (userId?: string): Promise<string[]> => {
  const roles = await getUserRoles(userId);
  if (roles.length === 0) return [];

  // Admin holds all permissions
  if (roles.includes("admin")) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("permissions").select("id");
      if (data && data.length > 0) {
        const set = new Set<string>(data.map((p) => p.id));
        FALLBACK_PERMISSIONS.forEach((p) => set.add(p.id));
        return Array.from(set);
      }
    } catch {
      // Fallback
    }
    return FALLBACK_PERMISSIONS.map((p) => p.id);
  }

  const perms = new Set<string>();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", roles);

    if (!error && data && data.length > 0) {
      data.forEach((r) => {
        if (r.permission_id) perms.add(r.permission_id);
      });
    }
  } catch (err) {
    console.warn("getUserPermissions error:", err);
  }

  if (perms.size === 0) {
    roles.forEach((r) => {
      const fallbackList = FALLBACK_ROLE_PERMS.filter((rp) => rp.role_id === r);
      fallbackList.forEach((rp) => perms.add(rp.permission_id));
    });
  }

  return Array.from(perms);
});

/**
 * Evaluates whether the user holds a specific permission or its canonical alias.
 * Deduplicated per request lifecycle using React cache().
 */
export const hasPermission = cache(async (
  permission: string,
  userId?: string
): Promise<boolean> => {
  const roles = await getUserRoles(userId);
  if (roles.includes("admin")) return true;

  const userPerms = await getUserPermissions(userId);
  if (userPerms.length === 0) return false;

  const aliases = getPermissionAliases(permission);
  return aliases.some((a) => userPerms.includes(a));
});

/**
 * Enforces that user has at least one of the specified roles; throws Error if not.
 */
export async function requireRole(
  role: string | string[],
  userId?: string
): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles(userId || user.id);
  const targetRoles = Array.isArray(role)
    ? role.map((r) => r.toLowerCase())
    : [role.toLowerCase()];

  if (roles.includes("admin") || targetRoles.some((r) => roles.includes(r))) {
    return user;
  }

  throw new Error("Akses ditolak: Peran tidak mencukupi.");
}

/**
 * Enforces that user holds a specific permission; throws Error if not.
 */
export async function requirePermission(
  permission: string,
  userId?: string
): Promise<User> {
  const user = await requireAuth();
  const allowed = await hasPermission(permission, userId || user.id);
  if (!allowed) {
    throw new Error(`Akses ditolak: Izin '${permission}' diperlukan.`);
  }
  return user;
}

