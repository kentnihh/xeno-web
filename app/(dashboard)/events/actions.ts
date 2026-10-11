"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEventSchema } from "@/lib/validations/event";
import type { EventStatus, TaskPriority, TaskStatus, VendorStatus, EventTask, EventVendor } from "@/types/database";

/**
 * Creates a new event in the database from form data and redirects to event detail page.
 * @param formData - FormData with title, venue, start_date, end_date, budget, description, client_id
 */
export async function createEvent(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const validated = createEventSchema.parse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    budget: formData.get("budget"),
    description: formData.get("description") || null,
    client_id: formData.get("client_id") || null,
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

  // Invalidate event listings and redirect to new event view
  revalidatePath("/events");
  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

/**
 * Updates lifecycle status for an existing event.
 * @param eventId - Target event UUID
 * @param status - New event lifecycle status
 */
export async function updateEventStatus(eventId: string, status: EventStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/");
}

/**
 * Inserts a new operational task associated with an event.
 */
export async function createEventTask(formData: FormData): Promise<{ success: boolean; error?: string; task?: EventTask }> {
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
  const supabase = await createClient();
  const { error } = await supabase.from("event_tasks").delete().eq("id", taskId).eq("event_id", eventId);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
/**
 * Assigns or updates a staff member's assignment to an event.
 */
export async function assignEventCrew(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;
  const profileId = formData.get("profile_id") as string;
  const roleInEvent = (formData.get("role_in_event") as string) || "Kru Lapangan";
  const notes = (formData.get("notes") as string) || null;

  if (!eventId || !profileId) {
    return { success: false, error: "Event ID dan anggota staf kru wajib diisi." };
  }

  const { error } = await supabase.from("event_crew").upsert(
    {
      event_id: eventId,
      profile_id: profileId,
      role_in_event: roleInEvent.trim(),
      notes: notes ? notes.trim() : null,
    },
    { onConflict: "event_id,profile_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/**
 * Removes an assigned crew member from an event.
 */
export async function removeEventCrew(crewId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_crew").delete().eq("id", crewId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/**
 * Assigns an existing vendor to an event.
 */
export async function assignEventVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
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
  const supabase = await createClient();
  const { error } = await supabase.from("event_vendors").delete().eq("id", eventVendorId).eq("event_id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}






