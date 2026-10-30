"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireRole, getCurrentProfile, getCurrentUser, hasPermission, isAdmin } from "@/lib/auth";
import { getMasterTemplatesCached } from "@/lib/data-cache";
import { upsertTaskCalendarEvent, deleteTaskCalendarEvent } from "@/lib/gcal-task";
import { deleteEventFromGoogleCalendar } from "@/app/actions/gcal-sync";
import { getStoragePathFromUrl, parseWIBDate } from "@/lib/utils";
import {
  createEventSchema,
  updateEventSchema,
  assignCrewSchema,
  updateCrewRoleSchema,
  removeCrewSchema,
} from "@/lib/validations/event";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "@/lib/constants/public-forms";
import {
  EVENT_STATUS_LIST,
  type EventStatus,
  type TaskPriority,
  type TaskStatus,
  type VendorStatus,
  type EventTask,
  type EventVendor,
  type MasterTemplate,
  type FormCategorySchema,
  type FormFieldSchema,
} from "@/types/database";


/**
 * Creates a new event in the database from form data and redirects to event detail page.
 * @param formData - FormData with title, venue, start_date, end_date, pic, client_id, use_template, description
 */
export async function createEvent(
  formData: FormData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
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

    const hasTemplatePresentFlag = formData.has("use_template_present");
    const rawTemplate =
      formData.get("use_template") ??
      formData.get("useDefaultTemplates") ??
      formData.get("useTemplateExcel");

    const templateStr = typeof rawTemplate === "string" ? rawTemplate.toLowerCase().trim() : "";

    let parsedUseTemplate = true;
    if (hasTemplatePresentFlag) {
      parsedUseTemplate =
        formData.has("use_template") &&
        (templateStr === "true" || templateStr === "on" || templateStr === "1");
    } else if (rawTemplate !== null && rawTemplate !== undefined) {
      parsedUseTemplate =
        templateStr === "true" || templateStr === "on" || templateStr === "1";
    }

    const hasFamilyPresentFlag = formData.has("use_family_template_present");
    const rawFamilyTemplate = formData.get("use_family_template");
    const parsedUseFamilyTemplate = hasFamilyPresentFlag
      ? formData.has("use_family_template") && (rawFamilyTemplate === "true" || rawFamilyTemplate === "on" || rawFamilyTemplate === "1")
      : rawFamilyTemplate !== null ? Boolean(rawFamilyTemplate) : true;

    const validated = createEventSchema.parse({
      title: formData.get("title"),
      venue: formData.get("venue"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      pic: formData.get("pic"),
      client_id: formData.get("client_id") || null,
      pax: formData.get("pax"),
      use_template: parsedUseTemplate,
      use_family_template: parsedUseFamilyTemplate,
      description: formData.get("description") || null,
      expenses: parsedExpenses,
      documents: parsedDocuments,
    });

    const { data, error } = await supabase
      .from("events")
      .insert({
        title: validated.title,
        venue: validated.venue,
        start_date: parseWIBDate(validated.start_date).toISOString(),
        end_date: parseWIBDate(validated.end_date).toISOString(),
        pic: validated.pic || null,
        pax: validated.pax ?? null,
        description: validated.description,
        client_id: validated.client_id,
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

    const useTemplates = Boolean(validated.use_template === true);

    if (useTemplates) {
      // Fetch master templates from cached database table instead of hardcoded file
      const dbTemplates = await getMasterTemplatesCached();

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
    } else {
      // DO NOT create any blank sheets or default sheets.
      // Skip event_sheets insertion completely so count remains 0!
    }

    // Initialize event_public_forms record for this event based on use_family_template setting
    try {
      let familySchema: FormCategorySchema[] = [];
      if (validated.use_family_template) {
        // Fetch schema from Master Family Template
        const { data: familyTemplate } = await supabase
          .from("master_family_templates")
          .select("categories")
          .eq("is_active", true)
          .maybeSingle();

        if (
          familyTemplate &&
          Array.isArray(familyTemplate.categories) &&
          familyTemplate.categories.length > 0
        ) {
          familySchema = familyTemplate.categories.map((cat: FormCategorySchema) => ({
            ...cat,
            fields: (cat.fields || []).map((fld: FormFieldSchema) => ({
              ...fld,
              required: false,
            })),
          }));
        } else {
          familySchema = DEFAULT_PUBLIC_FORM_SCHEMA.map((cat: FormCategorySchema) => ({
            ...cat,
            fields: (cat.fields || []).map((fld: FormFieldSchema) => ({
              ...fld,
              required: false,
            })),
          }));
        }
      } else {
        // If FALSE, initialize with empty schema so admin builds categories manually
        familySchema = [];
      }

      // Generate 32-character hex token and 3-day default expiry
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      const initialToken = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const initialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const { error: formInsertErr } = await supabase
        .from("event_public_forms")
        .insert({
          event_id: data.id,
          token: initialToken,
          expires_at: initialExpiresAt,
          form_schema: familySchema,
          form_data: {},
        });

      if (formInsertErr) {
        console.warn(
          `[createEvent] Warning creating event_public_forms for ${data.id}:`,
          formInsertErr.message
        );
      }
    } catch (pubFormErr) {
      console.warn(
        `[createEvent] Non-fatal error initializing public form for ${data.id}:`,
        pubFormErr
      );
    }

    // Invalidate event listings and return new event ID
    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true, eventId: data.id };
  } catch (err: unknown) {
    console.error("[createEvent] Error creating event:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membuat acara baru.",
    };
  }
}

export async function updateEventStatus(
  eventId: string,
  _status?: EventStatus | string | null
): Promise<{ success: boolean; error?: string }> {
  // Event status is permanently deprecated and dropped from events table
  console.log(`[updateEventStatus] Deprecated: status dropped from events table. Event ID: ${eventId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Updates an existing event record with validated fields.
 * Invalidator triggers instant refresh across detail and index routes.
 * ponytail: nested relations update handled separately via respective sub-actions.
 * @param formData - FormData containing id, title, venue, start_date, end_date, pic, client_id, status, description
 */
export async function updateEvent(formData: FormData): Promise<{ success: boolean; eventId?: string; error?: string }> {
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
      pic: formData.get("pic"),
      pax: formData.get("pax"),
      description: formData.get("description") || null,
      client_id: formData.get("client_id") || null,
    });

    const updatePayload: Record<string, unknown> = {
      title: validated.title,
      venue: validated.venue,
      start_date: parseWIBDate(validated.start_date).toISOString(),
      end_date: parseWIBDate(validated.end_date).toISOString(),
      pic: validated.pic ?? null,
      pax: validated.pax ?? null,
      description: validated.description,
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

    return { success: true, eventId: validated.id };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err && Array.isArray((err as { issues: unknown[] }).issues)) {
      return { success: false, error: (err as { issues: { message?: string }[] }).issues[0]?.message || "Validasi data gagal" };
    }
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui data acara" };
  }
}

/**
 * Sinkronisasi tugas ke Google Calendar. Tidak pernah melempar error:
 * kegagalan dikembalikan sebagai `warning` supaya penyimpanan tugas tidak ikut gagal.
 */
async function applyTaskGcal(opts: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  task: EventTask;
  eventId: string;
  formData: FormData;
  existingGcalId: string | null;
}): Promise<{ task: EventTask; warning?: string }> {
  const { supabase, task, eventId, formData, existingGcalId } = opts;
  const enabled = formData.get("gcal_enabled") === "1";

  try {
    if (!enabled) {
      if (existingGcalId) {
        await deleteTaskCalendarEvent(existingGcalId);
        await supabase
          .from("event_tasks")
          .update({ gcal_event_id: null, gcal_start: null, gcal_end: null })
          .eq("id", task.id);
        return { task: { ...task, gcal_event_id: null, gcal_start: null, gcal_end: null } };
      }
      return { task };
    }

    const start = new Date(String(formData.get("gcal_start") || ""));
    let end = new Date(String(formData.get("gcal_end") || ""));
    if (isNaN(start.getTime())) {
      return { task, warning: "Tugas tersimpan, tapi waktu Google Calendar tidak valid." };
    }
    if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    const { data: ev } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .maybeSingle();

    const res = await upsertTaskCalendarEvent({
      title: task.title,
      description: task.description,
      assigneeName: task.assignee?.full_name ?? null,
      priority: task.priority,
      eventTitle: ev?.title ?? null,
      start,
      end,
      existingId: existingGcalId,
    });

    if (!res.ok) {
      return { task, warning: `Tugas tersimpan, tapi gagal sync ke Google Calendar. ${res.error}` };
    }

    const patch = {
      gcal_event_id: res.id,
      gcal_start: start.toISOString(),
      gcal_end: end.toISOString(),
    };
    const { error: patchErr } = await supabase.from("event_tasks").update(patch).eq("id", task.id);
    if (patchErr) {
      return {
        task,
        warning: "Tugas tersimpan dan masuk ke Google Calendar, tapi ID event gagal disimpan. Jalankan migration kolom gcal di database.",
      };
    }
    return { task: { ...task, ...patch } };
  } catch (err) {
    console.error("[applyTaskGcal]", err);
    return { task, warning: "Tugas tersimpan, tapi gagal sync ke Google Calendar." };
  }
}

/**
 * Inserts a new operational task associated with an event.
 */
export async function createEventTask(formData: FormData): Promise<{ success: boolean; error?: string; task?: EventTask; gcalWarning?: string }> {
  await requirePermission("events:operations:manage");
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

  const currentProfile = await getCurrentProfile();
  const createdBy = currentProfile?.id ?? (await getCurrentUser())?.id ?? null;

  const { data, error } = await supabase
    .from("event_tasks")
    .insert({
      event_id: eventId,
      title,
      description,
      assigned_to: assignedTo,
      created_by: createdBy,
      priority,
      status,
      due_date: dueDate,
    })
    .select("*, assignee:profiles!assigned_to(*), creator:profiles!created_by(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const synced = await applyTaskGcal({
    supabase,
    task: data as EventTask,
    eventId,
    formData,
    existingGcalId: null,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true, task: synced.task, gcalWarning: synced.warning };
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
export async function updateEventTask(formData: FormData): Promise<{ success: boolean; error?: string; task?: EventTask; gcalWarning?: string }> {
  await requirePermission("events:operations:manage");
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

  const { data: existingTask } = await supabase
    .from("event_tasks")
    .select("gcal_event_id")
    .eq("id", taskId)
    .maybeSingle();

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
    .select("*, assignee:profiles!assigned_to(*), creator:profiles!created_by(*)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const synced = await applyTaskGcal({
    supabase,
    task: data as EventTask,
    eventId,
    formData,
    existingGcalId: existingTask?.gcal_event_id ?? null,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true, task: synced.task, gcalWarning: synced.warning };
}

/**
 * Toggles a crew task between 'done' and 'todo'.
 * Accessible by operations managers, users with tasks:manage, admins, or the assigned crew member.
 */
export async function toggleTaskStatus(
  taskId: string,
  currentStatus: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Autentikasi diperlukan." };
    }

    const supabase = await createClient();

    const [hasOps, hasTasks, isAdm] = await Promise.all([
      hasPermission("events:operations:manage"),
      hasPermission("tasks:manage"),
      isAdmin(),
    ]);

    if (!hasOps && !hasTasks && !isAdm) {
      const { data: taskData } = await supabase
        .from("event_tasks")
        .select("assigned_to")
        .eq("id", taskId)
        .maybeSingle();

      if (!taskData || taskData.assigned_to !== user.id) {
        return {
          success: false,
          error: "Akses ditolak: Anda tidak memiliki wewenang untuk tugas ini.",
        };
      }
    }

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
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui status tugas.",
    };
  }
}

/**
 * Deletes an event and all associated resources:
 * 1. Supabase Storage cleanup (removes files in bucket-files / documents / event-documents).
 * 2. Google Calendar cleanup (removes event and task calendar entries).
 * 3. Database event deletion (foreign key ON DELETE CASCADE cleans all child tables).
 * 4. Revalidates paths and redirects to /events.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await requireRole(["admin", "manager"]);
  await requirePermission("events.delete");
  const supabase = await createClient();

  // 1. Fetch event record (for gcal_event_id), tasks (for task gcal_event_ids), and documents (for storage paths)
  const [{ data: eventData }, { data: gcalTasks }, { data: eventDocs }] = await Promise.all([
    supabase.from("events").select("id, gcal_event_id").eq("id", eventId).maybeSingle(),
    supabase.from("event_tasks").select("gcal_event_id").eq("event_id", eventId).not("gcal_event_id", "is", null),
    supabase.from("event_documents").select("file_url").eq("event_id", eventId),
  ]);

  // 2. Storage Cleanup: Check if the event has uploaded files in Supabase Storage and remove them
  try {
    const filePaths: string[] = [];
    if (eventDocs && eventDocs.length > 0) {
      for (const doc of eventDocs) {
        const p = getStoragePathFromUrl(doc.file_url);
        if (p && !filePaths.includes(p)) {
          filePaths.push(p);
        }
      }
    }

    // Also inspect folder under eventId/ in case orphaned objects exist in storage
    const storageBuckets = ["bucket-files", "documents", "event-documents"];
    for (const bucket of storageBuckets) {
      try {
        const { data: folderFiles } = await supabase.storage.from(bucket).list(eventId);
        if (folderFiles && folderFiles.length > 0) {
          for (const f of folderFiles) {
            const p = `${eventId}/${f.name}`;
            if (!filePaths.includes(p)) {
              filePaths.push(p);
            }
          }
        }
      } catch {
        // Ignore listing failure for non-existent buckets
      }
    }

    if (filePaths.length > 0) {
      for (const bucket of storageBuckets) {
        try {
          await supabase.storage.from(bucket).remove(filePaths);
        } catch (storageErr) {
          console.warn(`[deleteEvent] Storage remove warning in ${bucket}:`, storageErr);
        }
      }
    }
  } catch (storageErr) {
    console.warn("[deleteEvent] Failed to cleanup storage files for event:", storageErr);
  }

  // 3. Google Calendar Cleanup: if synced to Google Calendar, attempt DELETE to the GCal API endpoint
  if (eventData?.gcal_event_id) {
    try {
      await deleteEventFromGoogleCalendar(eventData.gcal_event_id);
    } catch (gcalErr) {
      console.warn("[deleteEvent] Failed to delete event from Google Calendar:", gcalErr);
    }
  }

  if (gcalTasks && gcalTasks.length > 0) {
    for (const t of gcalTasks) {
      if (t.gcal_event_id) {
        try {
          await deleteTaskCalendarEvent(t.gcal_event_id);
        } catch (gcalErr) {
          console.warn(`[deleteEvent] Failed to delete task ${t.gcal_event_id} from GCal:`, gcalErr);
        }
      }
    }
  }

  // 4. Execute the event deletion: database foreign keys will cascade delete all child rows
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/events");
}

/**
 * Deletes a task from an event.
 */
export async function deleteEventTask(taskId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events:operations:manage");
  const supabase = await createClient();
  const { data: existingTask } = await supabase
    .from("event_tasks")
    .select("gcal_event_id")
    .eq("id", taskId)
    .maybeSingle();
  const { error } = await supabase.from("event_tasks").delete().eq("id", taskId).eq("event_id", eventId);
  if (!error && existingTask?.gcal_event_id) {
    await deleteTaskCalendarEvent(existingTask.gcal_event_id);
  }
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true };
}
/**
 * Assigns or updates a staff member's assignment to an event (INSERT / UPSERT).
 */
export async function assignCrewToEvent(
  input: FormData | { eventId: string; profileId: string; roleInEvent?: string; notes?: string | null }
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events:operations:manage");

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
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Removes an assigned crew member from an event (DELETE).
 */
export async function removeCrewFromEvent(
  crewId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events:operations:manage");

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
  revalidatePath("/dashboard");
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
  await requirePermission("events:operations:manage");

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
  revalidatePath("/dashboard");
  return { success: true };
}

/** Backward compatibility aliases */
export const assignEventCrew = assignCrewToEvent;
export const removeEventCrew = removeCrewFromEvent;

/**
 * Assigns an existing vendor to an event.
 */
export async function assignEventVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events:operations:manage");
  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;
  const vendorId = formData.get("vendor_id") as string;
  const serviceName = (formData.get("service_name") as string)?.trim();
  const status = ((formData.get("status") as string) || "proposed") as VendorStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!eventId || !vendorId || !serviceName) {
    return { success: false, error: "Event, vendor, dan rincian layanan wajib diisi." };
  }

  const { data, error } = await supabase
    .from("event_vendors")
    .upsert(
      {
        event_id: eventId,
        vendor_id: vendorId,
        service_name: serviceName,
        cost: null,
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
  revalidatePath("/events");
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
  return { success: true, eventVendor: data as EventVendor };
}

/**
 * Creates a new vendor in the vendors database and immediately links it to the event.
 */
export async function createAndAssignVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events:operations:manage");
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

  // 2. Link to event_vendors without price/cost
  const { data: eventVendor, error: linkError } = await supabase
    .from("event_vendors")
    .insert({
      event_id: eventId,
      vendor_id: newVendor.id,
      service_name: serviceName || "Layanan Vendor",
      cost: null,
      status,
      notes: assignmentNotes,
    })
    .select("*, vendor:vendors(*)")
    .single();

  if (linkError) {
    return { success: false, error: linkError.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
  return { success: true, eventVendor: eventVendor as EventVendor };
}

/**
 * Updates an event vendor's service details, status, or notes.
 */
export async function updateEventVendor(formData: FormData): Promise<{ success: boolean; error?: string; eventVendor?: EventVendor }> {
  await requirePermission("events:operations:manage");
  const supabase = await createClient();
  const eventVendorId = formData.get("id") as string;
  const eventId = formData.get("event_id") as string;
  const serviceName = (formData.get("service_name") as string)?.trim();
  const status = ((formData.get("status") as string) || "proposed") as VendorStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!eventVendorId || !eventId || !serviceName) {
    return { success: false, error: "ID, Event ID, dan nama layanan wajib diisi." };
  }

  const { data, error } = await supabase
    .from("event_vendors")
    .update({
      service_name: serviceName,
      cost: null,
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
  revalidatePath("/events");
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
  return { success: true, eventVendor: data as EventVendor };
}

/**
 * Removes a vendor assignment from an event.
 */
export async function removeEventVendor(eventVendorId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("events:operations:manage");
  const supabase = await createClient();
  const { error } = await supabase.from("event_vendors").delete().eq("id", eventVendorId).eq("event_id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Semantic aliases */
export const assignVendorToEvent = assignEventVendor;
export const linkVendor = assignEventVendor;






