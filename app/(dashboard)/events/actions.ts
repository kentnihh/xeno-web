"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import {
  createEventSchema,
  updateEventSchema,
  assignCrewSchema,
  updateCrewRoleSchema,
  removeCrewSchema,
} from "@/lib/validations/event";
import { EVENT_STATUS_LIST, type EventStatus, type TaskPriority, type TaskStatus, type VendorStatus, type EventTask, type EventVendor } from "@/types/database";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import type { MasterTemplate } from "@/types/database";


/**
 * Creates a new event in the database from form data and redirects to event detail page.
 * @param formData - FormData with title, venue, start_date, end_date, budget, description, client_id
 */
export async function createEvent(formData: FormData): Promise<void> {
  await requirePermission("events.create");
  const supabase = await createClient();

  const rawExpenses = formData.get("expenses");
  const rawDocuments = formData.get("documents");
  let parsedExpenses: unknown[] = [];
  let parsedDocuments: unknown[] = [];

  if (typeof rawExpenses === "string" && rawExpenses.trim()) {
    try {
      parsedExpenses = JSON.parse(rawExpenses);
    } catch {
      parsedExpenses = [];
    }
  }

  if (typeof rawDocuments === "string" && rawDocuments.trim()) {
    try {
      parsedDocuments = JSON.parse(rawDocuments);
    } catch {
      parsedDocuments = [];
    }
  }

  const validated = createEventSchema.parse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    budget: formData.get("budget"),
    description: formData.get("description") || null,
    client_id: formData.get("client_id") || null,
    expenses: parsedExpenses,
    documents: parsedDocuments,
  });

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: validated.title,
      venue: validated.venue,
      start_date: new Date(validated.start_date).toISOString(),
      end_date: new Date(validated.end_date).toISOString(),
      budget: validated.budget,
      description: validated.description,
      client_id: validated.client_id,
      status: "planning" as EventStatus,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (Array.isArray(validated.expenses) && validated.expenses.length > 0) {
    const expenseRows = validated.expenses.map((exp: { amount: number; category?: string; expense_date?: string; status?: string; notes?: string }) => ({
      event_id: data.id,
      amount: exp.amount,
      category: exp.category || "Others",
      expense_date: exp.expense_date || new Date().toISOString().split("T")[0],
      status: exp.status || "Unpaid",
      notes: exp.notes || null,
    }));
    await supabase.from("event_expenses").insert(expenseRows);
  }

  if (Array.isArray(validated.documents) && validated.documents.length > 0) {
    const docRows = validated.documents.map((doc: { file_name: string; file_url: string; file_type?: string; file_size?: number }) => ({
      event_id: data.id,
      file_name: doc.file_name,
      file_url: doc.file_url,
      file_type: doc.file_type || "application/octet-stream",
      file_size: doc.file_size || 0,
    }));
    await supabase.from("event_documents").insert(docRows);
  }
  // Fetch master templates from database table instead of hardcoded file
  const { data: dbTemplates } = await supabase
    .from("master_templates")
    .select("sheet_name, order_index, jsonb_structure")
    .order("order_index", { ascending: true });

  const sheetRows =
    dbTemplates && dbTemplates.length > 0
      ? (dbTemplates as MasterTemplate[]).map((tpl, idx) => ({
          event_id: data.id,
          sheet_name: tpl.sheet_name,
          order_index: tpl.order_index ?? idx,
          data: tpl.jsonb_structure,
        }))
      : INITIAL_EVENT_SHEETS.map((tpl, idx) => ({
          event_id: data.id,
          sheet_name: tpl.name,
          order_index: idx,
          data: tpl.data,
        }));

  if (sheetRows.length > 0) {
    const { error: sheetsError } = await supabase.from("event_sheets").insert(sheetRows);
    if (sheetsError) {
      console.warn(`[createEvent] Warning seeding event_sheets for ${data.id}:`, sheetsError.message);
    }
  }


  // Invalidate event listings and redirect to new event view
  revalidatePath("/events");
  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

export async function updateEventStatus(
  eventId: string,
  status: EventStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("events.edit");

    if (!eventId || typeof eventId !== "string") {
      return { success: false, error: "ID acara tidak valid." };
    }

    if (!EVENT_STATUS_LIST.includes(status)) {
      return { success: false, error: `Status "${status}" tidak valid.` };
    }

    const supabase = await createClient();
    console.log(`[updateEventStatus] Updating event ${eventId} status to:`, status);

    const { data, error } = await supabase
      .from("events")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, status");

    if (error) {
      console.error(`[updateEventStatus] Supabase error for event ${eventId}:`, error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn(`[updateEventStatus] 0 rows updated for event ${eventId}. Checking existence or RLS policy.`);
      const { data: existing, error: fetchErr } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();

      if (fetchErr) {
        console.error(`[updateEventStatus] Error checking event existence:`, fetchErr);
        return { success: false, error: fetchErr.message };
      }

      if (!existing) {
        return { success: false, error: "Acara tidak ditemukan di database." };
      }

      return {
        success: false,
        error: "Gagal memperbarui status: Terhalang kebijakan izin (RLS). Pastikan Anda memiliki hak akses.",
      };
    }

    console.log(`[updateEventStatus] Successfully updated event ${eventId} to:`, status);

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error(`[updateEventStatus] Unexpected error updating status for event ${eventId}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui status acara.",
    };
  }
}

/**
 * Updates an existing event record with validated fields.
 * Invalidator triggers instant refresh across detail and index routes.
 * ponytail: nested relations update handled separately via respective sub-actions.
 * @param formData - FormData containing id, title, venue, start_date, end_date, budget, status, description, client_id
 */
export async function updateEvent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("events.edit");
    const supabase = await createClient();

    const rawId = formData.get("id");
    const rawStatus = formData.get("status");

    const validated = updateEventSchema.parse({
      id: rawId,
      title: formData.get("title"),
      venue: formData.get("venue"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      status: rawStatus ? rawStatus : undefined,
      budget: formData.get("budget"),
      description: formData.get("description") || null,
      client_id: formData.get("client_id") || null,
    });

    const updatePayload: Record<string, unknown> = {
      title: validated.title,
      venue: validated.venue,
      start_date: new Date(validated.start_date).toISOString(),
      end_date: new Date(validated.end_date).toISOString(),
      budget: validated.budget,
      description: validated.description,
      status: validated.status,
      updated_at: new Date().toISOString(),
    };

    if (validated.client_id !== undefined) {
      updatePayload.client_id = validated.client_id;
    }

    const { data, error } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", validated.id)
      .select("id");

    if (error) {
      console.error("[updateEvent] Supabase error:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn(`[updateEvent] 0 rows updated for event ${validated.id}.`);
      return { success: false, error: "Gagal memperbarui acara: Izin tidak mencukupi atau data tidak ditemukan." };
    }

    revalidatePath(`/events/${validated.id}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err && Array.isArray((err as { issues: unknown[] }).issues)) {
      return { success: false, error: (err as { issues: { message?: string }[] }).issues[0]?.message || "Validasi data gagal" };
    }
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui data acara" };
  }
}

/**
 * Inserts a new operational task associated with an event.
 */
export async function createEventTask(formData: FormData): Promise<{ success: boolean; error?: string; task?: EventTask }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const assignedTo = (formData.get("assigned_to") as string)?.trim() || null;
  const priority = ((formData.get("priority") as string) || "medium") as TaskPriority;
  const status = ((formData.get("status") as string) || "todo") as TaskStatus;
  const dueDateRaw = formData.get("due_date") as string;

  if (!eventId || !title) {
    return { success: false, error: "Judul tugas dan Event ID wajib diisi." };
  }

  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

  const { data, error } = await supabase
    .from("event_tasks")
    .insert({
      event_id: eventId,
      title,
      description,
      assigned_to: assignedTo,
      priority,
      status,
      due_date: dueDate,
    })
    .select("*, assignee:profiles(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, task: data as EventTask };
}

/**
 * Inserts a task via raw form submit (backwards compatibility).
 */
export async function addEventTask(formData: FormData): Promise<void> {
  const result = await createEventTask(formData);
  if (!result.success) {
    throw new Error(result.error || "Gagal menambah tugas.");
  }
}

/**
 * Updates an existing operational task.
 */
export async function updateEventTask(formData: FormData): Promise<{ success: boolean; error?: string; task?: EventTask }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const taskId = formData.get("task_id") as string;
  const eventId = formData.get("event_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const assignedTo = (formData.get("assigned_to") as string)?.trim() || null;
  const priority = ((formData.get("priority") as string) || "medium") as TaskPriority;
  const status = ((formData.get("status") as string) || "todo") as TaskStatus;
  const dueDateRaw = formData.get("due_date") as string;

  if (!taskId || !eventId || !title) {
    return { success: false, error: "Task ID, Event ID, dan judul tugas wajib diisi." };
  }

  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

  const { data, error } = await supabase
    .from("event_tasks")
    .update({
      title,
      description,
      assigned_to: assignedTo,
      priority,
      status,
      due_date: dueDate,
    })
    .eq("id", taskId)
    .eq("event_id", eventId)
    .select("*, assignee:profiles(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, task: data as EventTask };
}

/**
 * Toggles a crew task between 'done' and 'todo'.
 */
export async function toggleTaskStatus(taskId: string, currentStatus: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const nextStatus = currentStatus === "done" ? "todo" : "done";
  const { error } = await supabase
    .from("event_tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/**
 * Deletes an event and cascades tasks/vendors. Admin only.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await requirePermission("events.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/events");
}

/**
 * Deletes a task from an event.
 */
export async function deleteEventTask(taskId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const { error } = await supabase.from("event_tasks").delete().eq("id", taskId).eq("event_id", eventId);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
/**
 * Assigns or updates a staff member's assignment to an event (INSERT / UPSERT).
 */
export async function assignCrewToEvent(
  input: FormData | { eventId: string; profileId: string; roleInEvent?: string; notes?: string | null }
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");

  let rawData: { event_id: unknown; profile_id: unknown; role_in_event?: unknown; notes?: unknown };
  if (input instanceof FormData) {
    rawData = {
      event_id: input.get("event_id"),
      profile_id: input.get("profile_id"),
      role_in_event: input.get("role_in_event") || "Kru Lapangan",
      notes: input.get("notes") || null,
    };
  } else {
    rawData = {
      event_id: input.eventId,
      profile_id: input.profileId,
      role_in_event: input.roleInEvent || "Kru Lapangan",
      notes: input.notes || null,
    };
  }

  const parsed = assignCrewSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Data penugasan kru tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("event_crew").upsert(
    {
      event_id: parsed.data.event_id,
      profile_id: parsed.data.profile_id,
      role_in_event: parsed.data.role_in_event,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "event_id,profile_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${parsed.data.event_id}`);
  revalidatePath("/events");
  return { success: true };
}

/**
 * Removes an assigned crew member from an event (DELETE).
 */
export async function removeCrewFromEvent(
  crewId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");

  const parsed = removeCrewSchema.safeParse({ crew_id: crewId, event_id: eventId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ID penugasan tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("event_crew").delete().eq("id", parsed.data.crew_id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${parsed.data.event_id}`);
  revalidatePath("/events");
  return { success: true };
}

/**
 * Updates an assigned crew member's role in an event (UPDATE).
 */
export async function updateCrewRole(
  crewId: string,
  eventId: string,
  roleInEvent: string
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");

  const parsed = updateCrewRoleSchema.safeParse({
    crew_id: crewId,
    event_id: eventId,
    role_in_event: roleInEvent,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Data peran tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_crew")
    .update({ role_in_event: parsed.data.role_in_event })
    .eq("id", parsed.data.crew_id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${parsed.data.event_id}`);
  revalidatePath("/events");
  return { success: true };
}

/** Backward compatibility aliases */
export const assignEventCrew = assignCrewToEvent;
export const removeEventCrew = removeCrewFromEvent;

/**
 * Assigns an existing vendor to an event.
 */
export async function assignEventVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;
  const vendorId = formData.get("vendor_id") as string;
  const serviceName = (formData.get("service_name") as string)?.trim();
  const costRaw = formData.get("cost") as string;
  const status = ((formData.get("status") as string) || "proposed") as VendorStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!eventId || !vendorId || !serviceName) {
    return { success: false, error: "Event, vendor, dan rincian layanan wajib diisi." };
  }

  const cost = costRaw ? Math.max(0, Number(costRaw) || 0) : 0;

  const { data, error } = await supabase
    .from("event_vendors")
    .upsert(
      {
        event_id: eventId,
        vendor_id: vendorId,
        service_name: serviceName,
        cost,
        status,
        notes,
      },
      { onConflict: "event_id,vendor_id" }
    )
    .select("*, vendor:vendors(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, eventVendor: data as EventVendor };
}

/**
 * Creates a new vendor in the vendors database and immediately links it to the event.
 */
export async function createAndAssignVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;

  // Vendor master data
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const picName = (formData.get("pic_name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const vendorNotes = (formData.get("vendor_notes") as string)?.trim() || null;

  // Event assignment data
  const serviceName = (formData.get("service_name") as string)?.trim() || category;
  const costRaw = formData.get("cost") as string;
  const status = ((formData.get("status") as string) || "proposed") as VendorStatus;
  const assignmentNotes = (formData.get("notes") as string)?.trim() || null;

  if (!eventId || !name || !category || !picName || !phone) {
    return { success: false, error: "Nama vendor, kategori, PIC, dan nomor telepon wajib diisi." };
  }

  // 1. Insert into vendors
  const { data: newVendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      name,
      category,
      pic_name: picName,
      phone,
      email,
      address,
      notes: vendorNotes,
    })
    .select("*")
    .single();

  if (vendorError || !newVendor) {
    return { success: false, error: vendorError?.message || "Gagal membuat vendor baru." };
  }

  const cost = costRaw ? Math.max(0, Number(costRaw) || 0) : 0;

  // 2. Link to event_vendors
  const { data: eventVendor, error: linkError } = await supabase
    .from("event_vendors")
    .insert({
      event_id: eventId,
      vendor_id: newVendor.id,
      service_name: serviceName || "Layanan Vendor",
      cost,
      status,
      notes: assignmentNotes,
    })
    .select("*, vendor:vendors(*)")
    .single();

  if (linkError) {
    return { success: false, error: linkError.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/vendors");
  return { success: true, eventVendor: eventVendor as EventVendor };
}

/**
 * Updates an event vendor's service details, cost, status, or notes.
 */
export async function updateEventVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const eventVendorId = formData.get("id") as string;
  const eventId = formData.get("event_id") as string;
  const serviceName = (formData.get("service_name") as string)?.trim();
  const costRaw = formData.get("cost") as string;
  const status = ((formData.get("status") as string) || "proposed") as VendorStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!eventVendorId || !eventId || !serviceName) {
    return { success: false, error: "ID, Event ID, dan nama layanan wajib diisi." };
  }

  const cost = costRaw ? Math.max(0, Number(costRaw) || 0) : 0;

  const { data, error } = await supabase
    .from("event_vendors")
    .update({
      service_name: serviceName,
      cost,
      status,
      notes,
    })
    .eq("id", eventVendorId)
    .eq("event_id", eventId)
    .select("*, vendor:vendors(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, eventVendor: data as EventVendor };
}

/**
 * Removes a vendor assignment from an event.
 */
export async function removeEventVendor(eventVendorId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events.edit");
  const supabase = await createClient();
  const { error } = await supabase.from("event_vendors").delete().eq("id", eventVendorId).eq("event_id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}






