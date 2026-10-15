"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { eventExpenseSchema } from "@/lib/validations/event";
import type { EventExpense, ExpenseStatus } from "@/types/database";

/**
 * Creates a new financial expense record for an event.
 */
export async function createEventExpense(formData: FormData): Promise<{ success: boolean; error?: string; expense?: EventExpense }> {
  try {
    await requirePermission("finances.manage");
    const supabase = await createClient();
    const eventId = (formData.get("event_id") as string)?.trim();
    const amount = formData.get("amount");
    const category = formData.get("category");
    let expenseDate = (formData.get("expense_date") as string)?.trim() || new Date().toISOString().slice(0, 10);
    // Normalize ISO string or date string to YYYY-MM-DD
    if (expenseDate.includes("T")) expenseDate = expenseDate.slice(0, 10);

    const status = (formData.get("status") as string)?.trim() || "Unpaid";
    const notes = (formData.get("notes") as string)?.trim() || null;

    const validated = eventExpenseSchema.parse({
      event_id: eventId,
      amount,
      category,
      expense_date: expenseDate,
      status,
      notes,
    });

    const { data, error } = await supabase
      .from("event_expenses")
      .insert({
        event_id: validated.event_id,
        amount: validated.amount,
        category: validated.category,
        expense_date: validated.expense_date,
        status: validated.status,
        notes: validated.notes || null,
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, expense: data as EventExpense };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan pengeluaran.";
    return { success: false, error: message };
  }
}

/**
 * Updates an existing financial expense record.
 */
export async function updateEventExpense(formData: FormData): Promise<{ success: boolean; error?: string; expense?: EventExpense }> {
  try {
    await requirePermission("finances.manage");
    const supabase = await createClient();
    const id = (formData.get("id") as string)?.trim();
    const eventId = (formData.get("event_id") as string)?.trim();
    if (!id || !eventId) return { success: false, error: "ID pengeluaran tidak valid" };

    const amount = formData.get("amount");
    const category = formData.get("category");
    let expenseDate = (formData.get("expense_date") as string)?.trim() || new Date().toISOString().slice(0, 10);
    if (expenseDate.includes("T")) expenseDate = expenseDate.slice(0, 10);

    const status = (formData.get("status") as string)?.trim() || "Unpaid";
    const notes = (formData.get("notes") as string)?.trim() || null;

    const validated = eventExpenseSchema.parse({
      event_id: eventId,
      amount,
      category,
      expense_date: expenseDate,
      status,
      notes,
    });

    const { data, error } = await supabase
      .from("event_expenses")
      .update({
        amount: validated.amount,
        category: validated.category,
        expense_date: validated.expense_date,
        status: validated.status,
        notes: validated.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, expense: data as EventExpense };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui pengeluaran.";
    return { success: false, error: message };
  }
}

/**
 * Deletes an event expense record.
 */
export async function deleteEventExpense(expenseId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("finances.manage");
    const supabase = await createClient();
    const { error } = await supabase
      .from("event_expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus pengeluaran.";
    return { success: false, error: message };
  }
}

/**
 * Toggles status of an event expense between Paid and Unpaid.
 */
export async function toggleExpenseStatus(
  expenseId: string,
  eventId: string,
  currentStatus: ExpenseStatus
): Promise<{ success: boolean; error?: string; nextStatus?: ExpenseStatus }> {
  try {
    await requirePermission("finances.manage");
    const supabase = await createClient();
    const nextStatus: ExpenseStatus = currentStatus === "Paid" ? "Unpaid" : "Paid";

    const { error } = await supabase
      .from("event_expenses")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", expenseId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, nextStatus };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status pengeluaran.";
    return { success: false, error: message };
  }
}
