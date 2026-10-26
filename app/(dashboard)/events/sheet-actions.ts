"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requirePermission } from "@/lib/auth";
import { getMasterTemplatesCached } from "@/lib/data-cache";
import { buildDefaultEventSheets, INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import { sanitizeSheetData } from "@/lib/spreadsheet-adapter";
import type { EventSheet, SheetData, MasterTemplate } from "@/types/database";

/**
 * Fetch all spreadsheet tabs for an event.
 * Returns empty array if no sheets exist (e.g. event created with use_template=false).
 */
export async function getEventSheets(eventId: string): Promise<EventSheet[]> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_sheets")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) {
      console.warn(`[getEventSheets] Error fetching sheets for event ${eventId}:`, error.message);
      return [];
    }

    return (data as EventSheet[]) || [];
  } catch (err) {
    console.warn(`[getEventSheets] Exception fetching sheets for event ${eventId}:`, err);
    return [];
  }
}

/**
 * Save / Update a single spreadsheet tab's dynamic JSONB data.
 * Content update strictly preserves existing sort_order and order_index to lock tab position.
 */
export async function saveEventSheet(
  eventId: string,
  sheetName: string,
  sheetData: SheetData,
  orderIndex?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("events:sheets:manage");

    if (!eventId || !sheetName) {
      return { success: false, error: "eventId dan sheetName wajib diisi." };
    }

    // Ensure valid JSON payload structure (preserves rich FortuneSheet state, cell metadata, styles, merges, and multiline text)
    const sanitizedData: SheetData = sanitizeSheetData(sheetData);

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Check if the sheet already exists to preserve existing sort_order & order_index
    const { data: existing } = await supabase
      .from("event_sheets")
      .select("id, sort_order, order_index")
      .eq("event_id", eventId)
      .eq("sheet_name", sheetName)
      .maybeSingle();

    if (existing?.id) {
      // Content update: Only update data, sheet_name, and updated_at.
      // Strictly DO NOT modify sort_order or order_index so tab position remains fixed!
      const { error } = await supabase
        .from("event_sheets")
        .update({
          sheet_name: sheetName,
          data: sanitizedData,
          updated_at: now,
        })
        .eq("id", existing.id);

      if (error) {
        console.warn(`[saveEventSheet] Error updating sheet "${sheetName}":`, error.message);
        return { success: false, error: error.message };
      }
    } else {
      // New sheet insertion: compute next sort_order if not provided
      let finalOrder = orderIndex ?? 0;
      if (orderIndex === undefined) {
        const { count } = await supabase
          .from("event_sheets")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId);
        finalOrder = count ?? 0;
      }

      const { error } = await supabase
        .from("event_sheets")
        .insert({
          event_id: eventId,
          sheet_name: sheetName,
          order_index: finalOrder,
          sort_order: finalOrder,
          data: sanitizedData,
          created_at: now,
          updated_at: now,
        });

      if (error) {
        console.warn(`[saveEventSheet] Error inserting sheet "${sheetName}":`, error.message);
        return { success: false, error: error.message };
      }
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error(`[saveEventSheet] Unexpected error for sheet "${sheetName}":`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan lembar kerja.",
    };
  }
}

/** Semantic alias for saveEventSheet */
export const updateEventSheet = saveEventSheet;

/**
 * Delete a spreadsheet tab from the event.
 * Supports calling with (eventId, sheetNameOrId) or (sheetId).
 */
export async function deleteEventSheet(
  eventIdOrSheetId: string,
  sheetNameOrId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("events:sheets:manage");

    const supabase = await createClient();

    if (!sheetNameOrId) {
      // Called with single argument: sheetId
      const { data: sheet } = await supabase
        .from("event_sheets")
        .select("event_id")
        .eq("id", eventIdOrSheetId)
        .maybeSingle();

      const { error } = await supabase
        .from("event_sheets")
        .delete()
        .eq("id", eventIdOrSheetId);

      if (error) {
        return { success: false, error: error.message };
      }

      if (sheet?.event_id) {
        revalidatePath(`/events/${sheet.event_id}`);
      }
      return { success: true };
    }

    // Called with (eventId, sheetNameOrId)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sheetNameOrId);
    const query = supabase.from("event_sheets").delete().eq("event_id", eventIdOrSheetId);

    if (isUuid) {
      const { error } = await query.or(`id.eq.${sheetNameOrId},sheet_name.eq.${sheetNameOrId}`);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await query.eq("sheet_name", sheetNameOrId);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventIdOrSheetId}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus lembar kerja.",
    };
  }
}

/**
 * Reset a spreadsheet tab back to its master template definition.
 */
export async function resetSheetToMaster(
  eventId: string,
  sheetName: string
): Promise<{ success: boolean; data?: SheetData; error?: string }> {
  try {
    await requirePermission("events:sheets:manage");

    const supabase = await createClient();
    const allTemplates = await getMasterTemplatesCached();
    const tpl = allTemplates.find(
      (t) => t.sheet_name.toLowerCase() === sheetName.toLowerCase()
    );

    const fallback = INITIAL_EVENT_SHEETS.find(
      (s) => s.name.toLowerCase() === sheetName.toLowerCase()
    );
    const dataToUse = (tpl?.jsonb_structure as SheetData) || fallback?.data;

    if (!dataToUse) {
      return { success: false, error: "Master template tidak ditemukan." };
    }

    const { error: upsertErr } = await supabase
      .from("event_sheets")
      .upsert(
        {
          event_id: eventId,
          sheet_name: sheetName,
          data: dataToUse,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,sheet_name" }
      );

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true, data: dataToUse };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mereset sheet.",
    };
  }
}

/**
 * Bulk reorder event spreadsheet tabs.
 * Updates sort_order and order_index for each sheet tab.
 */
export async function reorderEventSheets(
  eventId: string,
  orderedSheetNames: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("events:sheets:manage");
    const supabase = await createClient();

    const now = new Date().toISOString();
    for (let i = 0; i < orderedSheetNames.length; i++) {
      await supabase
        .from("event_sheets")
        .update({
          sort_order: i,
          order_index: i,
          updated_at: now,
        })
        .eq("event_id", eventId)
        .eq("sheet_name", orderedSheetNames[i]);
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[reorderEventSheets] Error reordering sheets:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan urutan lembar kerja.",
    };
  }
}

