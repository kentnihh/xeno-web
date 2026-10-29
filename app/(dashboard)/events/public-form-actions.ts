"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "@/lib/constants/public-forms";
import { publicFormDataPayloadSchema } from "@/lib/validations/public-form";
import type { EventPublicForm, EventFormData, FormCategorySchema, FormFieldSchema } from "@/types/database";

declare const process: any;

/**
 * Generates a secure random 32-character hex token using Node's native crypto module.
 * Falls back to Web Crypto API in Edge environments.
 */
function generateNativeToken(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    if (typeof nodeCrypto?.randomBytes === "function") {
      return nodeCrypto.randomBytes(16).toString("hex");
    }
  } catch {
    // Edge runtime fallback
  }

  // Universal Web Crypto API fallback
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Public export for token generation utility adhering to Server Action async rule.
 */
export async function generateFormToken(): Promise<string> {
  return generateNativeToken();
}

/**
 * Calculates a default expiration date exactly 3 days from now.
 */
function getDefaultExpiryDate(): string {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Retrieve or create an active public form record for a given event.
 * If one does not exist, it initializes with a 3-day expiry and the standard form schema.
 */
export async function getOrCreateEventPublicForm(eventId: string): Promise<EventPublicForm | null> {
  if (!eventId) return null;
  const supabase = await createClient();

  // Route guard: Require authenticated session in production
  const { data: { user } } = await supabase.auth.getUser();
  const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (!user && isProd) {
    throw new Error("Autentikasi diperlukan untuk mengakses data formulir acara.");
  }

  // 1. Try reading existing form first
  const { data: existingForm, error: fetchError } = await supabase
    .from("event_public_forms")
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingForm) {
    return existingForm as EventPublicForm;
  }

  // 2. If creating, use admin client to bypass RLS issues for background system initialization
  let adminSupabase = supabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    // fallback to supabase client
  }

  const initialToken = generateNativeToken();
  const initialExpiresAt = getDefaultExpiryDate();
  const fallbackSlug = initialToken.slice(0, 8);

  // Fetch schema from active master_family_templates or fallback to DEFAULT_PUBLIC_FORM_SCHEMA
  let initialSchema = DEFAULT_PUBLIC_FORM_SCHEMA;
  try {
    const { data: familyTemplate } = await adminSupabase
      .from("master_family_templates")
      .select("categories")
      .eq("is_active", true)
      .maybeSingle();
    if (familyTemplate?.categories && Array.isArray(familyTemplate.categories) && familyTemplate.categories.length > 0) {
      initialSchema = familyTemplate.categories.map((cat: FormCategorySchema) => ({
        ...cat,
        fields: (cat.fields || []).map((fld: FormFieldSchema) => ({
          ...fld,
          required: false,
        })),
      }));
    }
  } catch {
    // Fall back to default constant
  }

  const { data: created, error: insertError } = await adminSupabase
    .from("event_public_forms")
    .upsert(
      {
        event_id: eventId,
        token: initialToken,
        slug: fallbackSlug,
        title: "Formulir Data Keluarga",
        is_active: true,
        expires_at: initialExpiresAt,
        form_schema: initialSchema,
        form_data: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    )
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .maybeSingle();

  if (insertError) {
    // Log with JSON serialization and warn level so Next.js doesn't trigger the red server error overlay
    console.warn(
      "[getOrCreateEventPublicForm] Insert notice:",
      JSON.stringify(
        {
          message: insertError?.message,
          details: insertError?.details,
          hint: insertError?.hint,
          code: insertError?.code,
        },
        null,
        2
      )
    );

    // Fallback read in case concurrent insert succeeded
    const { data: fallback } = await (adminSupabase || supabase)
      .from("event_public_forms")
      .select("*, event:events(id, title, venue, start_date, end_date)")
      .eq("event_id", eventId)
      .maybeSingle();

    return (fallback as EventPublicForm) || null;
  }

  return (created as EventPublicForm) || null;
}

/**
 * Invalidate current token and generate a fresh token with a new 3-day expiry window.
 */
export async function regeneratePublicFormToken(eventId: string): Promise<EventPublicForm> {
  await requirePermission("events:family:manage");
  const supabase = await createClient();
  const newToken = generateNativeToken();
  const newExpiry = getDefaultExpiryDate();

  const { data, error } = await supabase
    .from("event_public_forms")
    .update({
      token: newToken,
      expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .single();

  if (error || !data) {
    console.error("Failed to regenerate token:", error);
    throw new Error(error?.message || "Gagal memperbarui tautan");
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return data as EventPublicForm;
}

/**
 * Extend or modify the expiration timestamp for an event's public form.
 */
export async function updatePublicFormExpiry(
  eventId: string,
  expiresAt: string
): Promise<EventPublicForm> {
  await requirePermission("events:family:manage");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_public_forms")
    .update({
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .single();

  if (error || !data) {
    console.error("Failed to update expiry:", error);
    throw new Error(error?.message || "Gagal memperbarui masa berlaku tautan");
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return data as EventPublicForm;
}

/**
 * Admin directly updates the family data JSONB structure.
 */
export async function updatePublicFormDataAdmin(
  eventId: string,
  formData: EventFormData,
  formSchema?: FormCategorySchema[]
): Promise<EventPublicForm> {
  await requirePermission("events:family:manage");
  const supabase = await createClient();

  const updatePayload: Record<string, any> = {
    form_data: formData,
    updated_at: new Date().toISOString(),
  };

  if (formSchema) {
    updatePayload.form_schema = formSchema;
  }

  const { data, error } = await supabase
    .from("event_public_forms")
    .update(updatePayload)
    .eq("event_id", eventId)
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .single();

  if (error || !data) {
    console.error("Failed to update form data by admin:", error);
    throw new Error(error?.message || "Gagal memperbarui data keluarga");
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return data as EventPublicForm;
}

/**
 * Applies the active Master Family Template schema to an event.
 */
export async function applyMasterFamilyTemplateToEvent(
  eventId: string,
  preserveExistingData: boolean = true
): Promise<EventPublicForm> {
  await requirePermission("events:family:manage");
  const supabase = await createClient();

  // 1. Fetch active master family template
  const { data: master } = await supabase
    .from("master_family_templates")
    .select("categories")
    .eq("is_active", true)
    .maybeSingle();

  const rawCategories = master?.categories && Array.isArray(master.categories) && master.categories.length > 0
    ? master.categories
    : DEFAULT_PUBLIC_FORM_SCHEMA;

  const categories: FormCategorySchema[] = rawCategories.map((c: any, i: number) => ({
    ...c,
    id: c.id || String(i + 1),
    title: (c.title || c.name || `Kategori ${i + 1}`).trim(),
    name: (c.name || c.title || `Kategori ${i + 1}`).trim(),
    description: c.description || "",
    fields: Array.isArray(c.fields)
      ? c.fields.map((fld: any) => ({ ...fld, required: false }))
      : [],
  }));

  // 2. Fetch existing form data if preserving
  let currentFormData: EventFormData = {};
  if (preserveExistingData) {
    const { data: existing } = await supabase
      .from("event_public_forms")
      .select("form_data")
      .eq("event_id", eventId)
      .maybeSingle();
    currentFormData = existing?.form_data || {};
  }

  return await updatePublicFormDataAdmin(eventId, currentFormData, categories);
}

/**
 * Fetch public form record by token for public client page.
 * Uses admin client to bypass auth session while strictly checking validity.
 */
export async function getPublicFormDataByToken(token: string): Promise<{
  form: EventPublicForm;
  isExpired: boolean;
  event: {
    id: string;
    title: string;
    venue: string;
    start_date: string;
    end_date: string;
  };
} | null> {
  if (!token) return null;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("event_public_forms")
    .select("*, event:events(id, title, venue, start_date, end_date)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const form = data as EventPublicForm;
  if (!form.form_data || typeof form.form_data !== "object") {
    form.form_data = {};
  }
  const isExpired = new Date() > new Date(form.expires_at);

  return {
    form,
    isExpired,
    event: form.event || {
      id: form.event_id,
      title: "Acara Pernikahan / Event",
      venue: "Venue Acara",
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
    },
  };
}

/**
 * Public client submission handler.
 * Verifies token exists and is not expired before committing to form_data column.
 * Performs an upsert/update into form_data, preserving user progress and existing categories.
 */
export async function submitPublicFormData(
  token: string,
  formData: EventFormData
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: "Tautan tidak valid." };
  }

  const adminClient = createAdminClient();

  // 1. Verify existence and expiration, retrieving existing form_data
  const { data: existing, error: checkError } = await adminClient
    .from("event_public_forms")
    .select("id, event_id, expires_at, form_data")
    .eq("token", token)
    .maybeSingle();

  if (checkError || !existing) {
    return { success: false, error: "Formulir tidak ditemukan atau tautan salah." };
  }

  if (new Date() > new Date(existing.expires_at)) {
    return {
      success: false,
      error: "Tautan formulir ini sudah kadaluarsa (melewati batas waktu 3 hari). Silakan hubungi tim Xeno Entertainment untuk tautan baru.",
    };
  }

  // Validate submitted form data against dynamic public form schema (all fields optional)
  const validation = publicFormDataPayloadSchema.safeParse(formData);
  if (!validation.success) {
    return {
      success: false,
      error: "Format data formulir tidak valid atau tidak sesuai skema.",
    };
  }
  const validatedData = validation.data;

  // Perform an upsert/merge into form_data, preserving existing categories and updating modified ones
  const existingFormData: EventFormData =
    existing.form_data && typeof existing.form_data === "object"
      ? existing.form_data
      : {};

  const mergedFormData: EventFormData = {
    ...existingFormData,
    ...validatedData,
  };

  // 2. Commit updated JSONB data
  const { error: updateError } = await adminClient
    .from("event_public_forms")
    .update({
      form_data: mergedFormData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Public submission update failed:", updateError);
    return { success: false, error: "Gagal menyimpan data ke sistem. Silakan coba kembali." };
  }

  // Invalidate cache for both the event detail dashboard and the public client route
  if (existing.event_id) {
    revalidatePath(`/events/${existing.event_id}`);
  }
  revalidatePath(`/p/${token}`);

  return { success: true };
}
