import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import {
  FALLBACK_USERS,
  FALLBACK_PERMISSIONS,
  FALLBACK_ROLE_PERMS,
} from "./rbac-fallbacks";

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

export function isSuperAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return normalized === "super_admin" || normalized === "superadmin";
}

/**
 * Retrieves the genuine Supabase Auth user directly from the session,
 * uninfluenced by impersonation context.
 */
export const getRealUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn("[getRealUser] Error fetching user:", err);
    return null;
  }
});

/**
 * Evaluates whether the genuine session user (not impersonated) holds SUPER_ADMIN role.
 */
export const isRealSuperAdmin = cache(async (): Promise<boolean> => {
  const realUser = await getRealUser();
  if (!realUser) return false;

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", realUser.id)
      .maybeSingle();

    if (profile?.role && isSuperAdminRole(profile.role)) return true;

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", realUser.id);

    if (userRoles?.some((ur) => isSuperAdminRole(ur.role_id))) return true;
  } catch (err) {
    console.warn("[isRealSuperAdmin] Database check error:", err);
  }

  const fallbackUser = FALLBACK_USERS.find(
    (u) => u.id === realUser.id || u.email === realUser.email
  );
  if (fallbackUser?.role && isSuperAdminRole(fallbackUser.role)) return true;

  return false;
});

export interface ImpersonationContext {
  isImpersonating: boolean;
  realUser: User | null;
  realProfile: Profile | null;
  impersonatedUser: Profile | null;
}

/**
 * Resolves current impersonation status and profile context.
 */
export const getImpersonationContext = cache(async (): Promise<ImpersonationContext> => {
  const realUser = await getRealUser();
  if (!realUser) {
    return {
      isImpersonating: false,
      realUser: null,
      realProfile: null,
      impersonatedUser: null,
    };
  }

  const superAdmin = await isRealSuperAdmin();
  if (!superAdmin) {
    return {
      isImpersonating: false,
      realUser,
      realProfile: null,
      impersonatedUser: null,
    };
  }

  let impersonateUserId: string | undefined;
  try {
    const cookieStore = await cookies();
    impersonateUserId = cookieStore.get("x-impersonate-user-id")?.value;
  } catch {
    return {
      isImpersonating: false,
      realUser,
      realProfile: null,
      impersonatedUser: null,
    };
  }

  if (!impersonateUserId || impersonateUserId === realUser.id) {
    return {
      isImpersonating: false,
      realUser,
      realProfile: null,
      impersonatedUser: null,
    };
  }

  let targetProfile: Profile | null = null;
  let realProfile: Profile | null = null;

  try {
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    const [targetRes, realRes] = await Promise.all([
      adminClient.from("profiles").select("*").eq("id", impersonateUserId).maybeSingle(),
      adminClient.from("profiles").select("*").eq("id", realUser.id).maybeSingle(),
    ]);

    targetProfile = (targetRes.data as Profile) || null;
    realProfile = (realRes.data as Profile) || null;
  } catch (err) {
    console.warn("[getImpersonationContext] Error fetching profile via admin client:", err);
  }

  if (!targetProfile) {
    const fallbackTarget = FALLBACK_USERS.find((u) => u.id === impersonateUserId);
    targetProfile = fallbackTarget || null;
  }

  if (!targetProfile) {
    return {
      isImpersonating: false,
      realUser,
      realProfile,
      impersonatedUser: null,
    };
  }

  return {
    isImpersonating: true,
    realUser,
    realProfile,
    impersonatedUser: targetProfile,
  };
});

/**
 * Deduplicated retrieval of the current active user within a single request.
 * Resolves to the impersonated user if an active Super Admin impersonation session is present.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const impersonation = await getImpersonationContext();
  if (impersonation.isImpersonating && impersonation.impersonatedUser) {
    const target = impersonation.impersonatedUser;
    return {
      id: target.id,
      email: target.email,
      app_metadata: {},
      user_metadata: { full_name: target.full_name },
      aud: "authenticated",
      created_at: target.created_at,
    } as User;
  }
  return impersonation.realUser;
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
 * Respects active impersonation context when target userId is omitted.
 */
export const getCurrentProfile = cache(async (userId?: string): Promise<Profile | null> => {
  let targetId = userId;
  if (!targetId) {
    const impersonation = await getImpersonationContext();
    if (impersonation.isImpersonating && impersonation.impersonatedUser) {
      return impersonation.impersonatedUser;
    }
    const user = impersonation.realUser;
    if (!user) return null;
    targetId = user.id;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (profile) return profile as Profile;

  const fallbackUser = FALLBACK_USERS.find((u) => u.id === targetId);
  return (fallbackUser as Profile) || null;
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

  const profile = await getCurrentProfile(targetId);
  if (profile?.role) {
    profileRole = profile.role;
  }

  const roles = new Set<string>();
  if (profileRole) {
    roles.add(profileRole.toLowerCase());
  }

  try {
    const supabase = await createClient();
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
 * Checks if the specified user (or currently active user) holds the SUPER_ADMIN role.
 */
export const isSuperAdmin = cache(async (userId?: string): Promise<boolean> => {
  let targetId = userId;
  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return false;
    targetId = user.id;
  }

  const profile = await getCurrentProfile(targetId);
  if (profile?.role && isSuperAdminRole(profile.role)) return true;

  const roles = await getUserRoles(targetId);
  return roles.some((r) => isSuperAdminRole(r));
});

/**
 * Checks if a user has the administrator or super_admin role.
 * Deduplicated per request lifecycle using React cache().
 */
export const isAdmin = cache(async (userId?: string): Promise<boolean> => {
  const superAdmin = await isSuperAdmin(userId);
  if (superAdmin) return true;

  const roles = await getUserRoles(userId);
  return roles.includes("admin") || roles.some((r) => isSuperAdminRole(r));
});

/**
 * Retrieves all permission keys assigned to the user across all their roles.
 * Deduplicated per request lifecycle using React cache().
 */
export const getUserPermissions = cache(async (userId?: string): Promise<string[]> => {
  const superAdmin = await isSuperAdmin(userId);
  if (superAdmin) {
    return FALLBACK_PERMISSIONS.map((p) => p.id);
  }

  const roles = await getUserRoles(userId);
  if (roles.length === 0) return [];

  // Admin holds all permissions
  if (roles.includes("admin") || roles.some((r) => isSuperAdminRole(r))) {
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
 * SUPER_ADMIN automatically inherits and bypasses ALL permissions.
 * Deduplicated per request lifecycle using React cache().
 */
export const hasPermission = cache(async (
  permission: string,
  userId?: string
): Promise<boolean> => {
  let targetId = userId;
  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return false;
    targetId = user.id;
  }

  // 1. SUPER_ADMIN immediately bypasses and returns true for ALL permissions
  const profile = await getCurrentProfile(targetId);
  if (profile?.role && isSuperAdminRole(profile.role)) return true;

  const roles = await getUserRoles(targetId);
  if (roles.some((r) => isSuperAdminRole(r))) return true;

  // 2. Admin holds all permissions
  if (roles.includes("admin")) return true;

  const userPerms = await getUserPermissions(targetId);
  if (userPerms.length === 0) return false;

  const aliases = getPermissionAliases(permission);
  return aliases.some((a) => userPerms.includes(a));
});

/** Alias for hasPermission */
export const can = hasPermission;

/**
 * Enforces that user has at least one of the specified roles; throws Error if not.
 * SUPER_ADMIN bypasses all role requirements.
 */
export async function requireRole(
  role: string | string[],
  userId?: string
): Promise<User> {
  const user = await requireAuth();
  const targetUserId = userId || user.id;

  if (await isSuperAdmin(targetUserId)) {
    return user;
  }

  const roles = await getUserRoles(targetUserId);
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
 * SUPER_ADMIN bypasses all permission requirements.
 */
export async function requirePermission(
  permission: string,
  userId?: string
): Promise<User> {
  const user = await requireAuth();
  const targetUserId = userId || user.id;
  const allowed = await hasPermission(permission, targetUserId);
  if (!allowed) {
    throw new Error(`Akses ditolak: Izin '${permission}' diperlukan.`);
  }
  return user;
}

