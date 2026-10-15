"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import type { MasterTemplate, SheetData } from "@/types/database";

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

    const sanitizedData: SheetData = {
      columns: Array.isArray(jsonbStructure?.columns) ? jsonbStructure.columns : [],
      rows: Array.isArray(jsonbStructure?.rows) ? jsonbStructure.rows : [],
    };

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("master_templates")
      .upsert(
        {
          id: id.startsWith("new-") ? undefined : id,
          sheet_name: sheetName.trim(),
          order_index: orderIndex,
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
