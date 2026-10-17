"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "@/lib/constants/public-forms";
import type {
  MasterTemplate,
  MasterFamilyTemplate,
  FormCategorySchema,
  SheetData,
} from "@/types/database";

type ActionResult<T = unknown> = { success?: boolean; data?: T; error?: string };

/**
 * Fetch all master templates ordered by index.
 */
export async function getMasterTemplates(): Promise<MasterTemplate[]> {
  try {
    const supabase = await createClient();
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
    console.error("[getMasterTemplates] Exception:", err);
    return [];
  }
}

/**
 * Save / Update master template structure.
 */
export async function saveMasterTemplate(
  id: string,
  sheetName: string,
  jsonbStructure: SheetData,
  orderIndex: number = 0
): Promise<ActionResult> {
  try {
    await requirePermission("templates.manage");

    if (!sheetName || !sheetName.trim()) {
      return { error: "Nama template wajib diisi." };
    }

    // Ensure valid JSON payload structure (preserves rich FortuneSheet state with cell metadata, styles, and merges)
    const sanitizedData: SheetData =
      jsonbStructure && typeof jsonbStructure === "object"
        ? jsonbStructure
        : { columns: [], rows: [] };

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("master_templates")
      .upsert(
        {
          id: id.startsWith("new-") ? undefined : id,
          sheet_name: sheetName.trim(),
          order_index: orderIndex,
          sort_order: orderIndex,
          jsonb_structure: sanitizedData,
          updated_at: now,
        },
        { onConflict: "sheet_name" }
      );

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/settings/templates");
    revalidatePath("/events/new");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan master template." };
  }
}

/**
 * Create a brand new master template.
 */
export async function createMasterTemplate(
  sheetName: string,
  jsonbStructure: SheetData,
  orderIndex: number = 0
): Promise<ActionResult<MasterTemplate>> {
  try {
    await requirePermission("templates.manage");

    if (!sheetName || !sheetName.trim()) {
      return { error: "Nama template wajib diisi." };
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("master_templates")
      .insert({
        sheet_name: sheetName.trim(),
        order_index: orderIndex,
        sort_order: orderIndex,
        jsonb_structure: jsonbStructure,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/settings/templates");
    revalidatePath("/events/new");
    return { success: true, data: data as MasterTemplate };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Gagal membuat template baru." };
  }
}

/**
 * Delete a master template.
 */
export async function deleteMasterTemplate(id: string): Promise<ActionResult> {
  try {
    await requirePermission("templates.manage");

    const supabase = await createClient();
    const { error } = await supabase.from("master_templates").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/settings/templates");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Gagal menghapus template." };
  }
}

/**
 * Reset all master templates back to the 10 standard presets.
 */
export async function resetAllMasterTemplates(): Promise<ActionResult> {
  try {
    await requirePermission("templates.manage");

    const supabase = await createClient();

    for (let i = 0; i < INITIAL_EVENT_SHEETS.length; i++) {
      const tpl = INITIAL_EVENT_SHEETS[i];
      await supabase.from("master_templates").upsert(
        {
          sheet_name: tpl.name,
          order_index: i,
          sort_order: i,
          jsonb_structure: tpl.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sheet_name" }
      );
    }

    revalidatePath("/settings/templates");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Gagal mereset template master." };
  }
}

/**
 * Bulk reorder master templates.
 * Updates sort_order and order_index for each master template.
 */
export async function reorderMasterTemplates(
  orderedSheetNames: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("templates.manage");
    const supabase = await createClient();

    const now = new Date().toISOString();
    for (let i = 0; i < orderedSheetNames.length; i++) {
      await supabase
        .from("master_templates")
        .update({
          sort_order: i,
          order_index: i,
          updated_at: now,
        })
        .eq("sheet_name", orderedSheetNames[i]);
    }

    revalidatePath("/settings/templates");
    revalidatePath("/events/new");
    return { success: true };
  } catch (err: unknown) {
    console.error("[reorderMasterTemplates] Error reordering master templates:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan urutan template master.",
    };
  }
}

/**
 * Fetch the active master family template blueprint.
 * If empty or uninitialized, falls back to seeding DEFAULT_PUBLIC_FORM_SCHEMA.
 */
export async function getMasterFamilyTemplate(): Promise<MasterFamilyTemplate> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_family_templates")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      const rawCategories = Array.isArray(data.categories) ? data.categories : [];
      const mapped = rawCategories.map((c: any, i: number) => ({
        ...c,
        id: c.id || String(i + 1),
        title: (c.title || c.name || `Kategori ${i + 1}`).trim(),
        name: (c.name || c.title || `Kategori ${i + 1}`).trim(),
        description: c.description || "",
        fields: Array.isArray(c.fields) ? c.fields : [],
      }));
      return {
        ...data,
        categories: mapped,
        form_schema: mapped,
      } as MasterFamilyTemplate;
    }

    // If no row exists yet, seed default blueprint
    const defaultSchema = DEFAULT_PUBLIC_FORM_SCHEMA.map((c, i) => ({
      ...c,
      id: c.id || String(i + 1),
      title: (c.title || c.name || `Kategori ${i + 1}`).trim(),
      name: (c.name || c.title || `Kategori ${i + 1}`).trim(),
    }));

    const { data: created, error: insertErr } = await supabase
      .from("master_family_templates")
      .insert({
        name: "Master Template Data Keluarga",
        categories: defaultSchema,
        is_active: true,
      })
      .select("*")
      .single();

    if (!insertErr && created) {
      return {
        ...created,
        categories: defaultSchema,
        form_schema: defaultSchema,
      } as MasterFamilyTemplate;
    }

    // Fallback in-memory
    return {
      id: "fallback-default",
      name: "Master Template Data Keluarga",
      categories: defaultSchema,
      form_schema: defaultSchema,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[getMasterFamilyTemplate] Exception:", err);
    const defaultSchema = DEFAULT_PUBLIC_FORM_SCHEMA.map((c, i) => ({
      ...c,
      id: c.id || String(i + 1),
      title: (c.title || c.name || `Kategori ${i + 1}`).trim(),
      name: (c.name || c.title || `Kategori ${i + 1}`).trim(),
    }));
    return {
      id: "fallback-default",
      name: "Master Template Data Keluarga",
      categories: defaultSchema,
      form_schema: defaultSchema,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Save / Update master family template blueprint categories.
 */
export async function saveMasterFamilyTemplate(
  categories: FormCategorySchema[],
  name: string = "Master Template Data Keluarga"
): Promise<{ success: boolean; error?: string; data?: MasterFamilyTemplate }> {
  try {
    await requirePermission("templates.manage");
    const supabase = await createClient();
    const now = new Date().toISOString();

    const sanitizedCategories: FormCategorySchema[] = (Array.isArray(categories) ? categories : []).map(
      (cat, idx) => {
        const title = (cat.title || cat.name || `Kategori ${idx + 1}`).trim();
        return {
          id: cat.id || String(idx + 1),
          title,
          name: title,
          description: cat.description || "",
          fields: Array.isArray(cat.fields) ? cat.fields : [],
        };
      }
    );

    // Check for existing active template
    const { data: existing } = await supabase
      .from("master_family_templates")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    let resultData: MasterFamilyTemplate | null = null;
    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("master_family_templates")
        .update({
          name: name.trim() || "Master Template Data Keluarga",
          categories: sanitizedCategories,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      resultData = {
        ...updated,
        categories: sanitizedCategories,
        form_schema: sanitizedCategories,
      } as MasterFamilyTemplate;
    } else {
      const { data: inserted, error } = await supabase
        .from("master_family_templates")
        .insert({
          name: name.trim() || "Master Template Data Keluarga",
          categories: sanitizedCategories,
          is_active: true,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      resultData = {
        ...inserted,
        categories: sanitizedCategories,
        form_schema: sanitizedCategories,
      } as MasterFamilyTemplate;
    }

    revalidatePath("/settings/templates");
    revalidatePath("/events/new");
    return { success: true, data: resultData };
  } catch (err: unknown) {
    console.error("[saveMasterFamilyTemplate] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan template master data keluarga.",
    };
  }
}

/**
 * Reset master family template back to standard default schema presets.
 */
export async function resetMasterFamilyTemplate(): Promise<{
  success: boolean;
  error?: string;
  data?: MasterFamilyTemplate;
}> {
  try {
    await requirePermission("templates.manage");
    return await saveMasterFamilyTemplate(
      DEFAULT_PUBLIC_FORM_SCHEMA,
      "Master Template Data Keluarga"
    );
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mereset template master data keluarga.",
    };
  }
}

