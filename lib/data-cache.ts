import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MasterTemplate,
  MasterFamilyTemplate,
  Role,
  Permission,
  RolePermission,
} from "@/types/database";

/**
 * Cached retrieval of all master spreadsheet templates.
 * Revalidated on-demand via revalidateTag('master-templates').
 */
export const getMasterTemplatesCached = unstable_cache(
  async (): Promise<MasterTemplate[]> => {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await createClient();
      const { data, error } = await supabase
        .from("master_templates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("order_index", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as MasterTemplate[];
      }
      return [];
    } catch (err) {
      console.warn("[getMasterTemplatesCached] Error:", err);
      return [];
    }
  },
  ["master-templates-list"],
  { tags: ["master-templates"], revalidate: 3600 }
);

/**
 * Cached retrieval of the default master family form template.
 * Revalidated on-demand via revalidateTag('master-templates').
 */
export const getMasterFamilyTemplateCached = unstable_cache(
  async (): Promise<MasterFamilyTemplate | null> => {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await createClient();
      const { data, error } = await supabase
        .from("master_family_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (!error && data) {
        return data as MasterFamilyTemplate;
      }
      return null;
    } catch (err) {
      console.warn("[getMasterFamilyTemplateCached] Error:", err);
      return null;
    }
  },
  ["master-family-template"],
  { tags: ["master-templates"], revalidate: 3600 }
);

/**
 * Cached retrieval of all RBAC role definitions.
 * Revalidated on-demand via revalidateTag('rbac').
 */
export const getRolesCached = unstable_cache(
  async (): Promise<Role[]> => {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await createClient();
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name", { ascending: true });

      if (!error && data) return data as Role[];
      return [];
    } catch (err) {
      console.warn("[getRolesCached] Error:", err);
      return [];
    }
  },
  ["roles-list"],
  { tags: ["rbac"], revalidate: 3600 }
);

/**
 * Cached retrieval of all granular permission definitions.
 * Revalidated on-demand via revalidateTag('rbac').
 */
export const getPermissionsCached = unstable_cache(
  async (): Promise<Permission[]> => {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await createClient();
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("module", { ascending: true });

      if (!error && data) return data as Permission[];
      return [];
    } catch (err) {
      console.warn("[getPermissionsCached] Error:", err);
      return [];
    }
  },
  ["permissions-list"],
  { tags: ["rbac"], revalidate: 3600 }
);

/**
 * Cached retrieval of all role-to-permission mappings.
 * Revalidated on-demand via revalidateTag('rbac').
 */
export const getRolePermissionsCached = unstable_cache(
  async (): Promise<RolePermission[]> => {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await createClient();
      const { data, error } = await supabase.from("role_permissions").select("*");

      if (!error && data) return data as RolePermission[];
      return [];
    } catch (err) {
      console.warn("[getRolePermissionsCached] Error:", err);
      return [];
    }
  },
  ["role-permissions-list"],
  { tags: ["rbac"], revalidate: 3600 }
);
