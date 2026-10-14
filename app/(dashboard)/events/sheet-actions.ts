"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildDefaultEventSheets } from "@/lib/constants/event-sheets";
import type { EventSheet, SheetData } from "@/types/database";

/**
 * Fetch all spreadsheet tabs for an event.
 * Falls back to default initial sheets if none exist or table not yet migrated.
 */
export async function getEventSheets(eventId: string): Promise<EventSheet[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_sheets")
      .select("*")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    if (error) {
      console.warn(`[getEventSheets] Failed or table not ready for event ${eventId}:`, error.message);
      return buildDefaultEventSheets(eventId);
    }

    if (!data || data.length === 0) {
      return buildDefaultEventSheets(eventId);
    }

    return data as EventSheet[];
  } catch (err) {
    console.warn(`[getEventSheets] Exception fetching sheets for event ${eventId}:`, err);
    return buildDefaultEventSheets(eventId);
  }
}

/**
 * Save / Upsert a single spreadsheet tab's dynamic JSONB data.
 */
export async function saveEventSheet(
  eventId: string,
  sheetName: string,
  sheetData: SheetData,
  orderIndex: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!eventId || !sheetName) {
      return { success: false, error: "eventId dan sheetName wajib diisi." };
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("event_sheets")
      .upsert(
        {
          event_id: eventId,
          sheet_name: sheetName,
          order_index: orderIndex,
          data: sheetData,
          updated_at: now,
        },
        { onConflict: "event_id,sheet_name" }
      );

    if (error) {
      console.warn(`[saveEventSheet] Error upserting sheet "${sheetName}":`, error.message);
      return { success: false, error: error.message };
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

/**
 * Delete a spreadsheet tab from the event.
 */
export async function deleteEventSheet(
  eventId: string,
  sheetName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("event_sheets")
      .delete()
      .eq("event_id", eventId)
      .eq("sheet_name", sheetName);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus lembar kerja.",
    };
  }
}
