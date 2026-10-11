"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { eventDocumentSchema } from "@/lib/validations/event";
import { getStoragePathFromUrl } from "@/lib/utils";
import type { EventDocument } from "@/types/database";

const STORAGE_BUCKET = "bucket-files";

/**
 * Persists document metadata into database after successful storage upload.
 */
export async function createEventDocumentMetadata(payload: {
  event_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
}): Promise<{ success: boolean; data?: EventDocument; error?: string }> {
  try {
    const validated = eventDocumentSchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Data metadata berkas tidak valid",
      };
    }

    await requireAuth();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertData = {
      event_id: validated.data.event_id,
      file_name: validated.data.file_name,
      file_url: validated.data.file_url,
      file_type: validated.data.file_type,
      file_size: validated.data.file_size ?? 0,
      uploaded_by: user?.id ?? null,
    };

    const { data, error } = await supabase
      .from("event_documents")
      .insert(insertData)
      .select("*, uploader:profiles(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${validated.data.event_id}`);
    return { success: true, data: data as EventDocument };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
    return { success: false, error: message };
  }
}

/**
 * Deletes document record from database and removes object from Supabase Storage.
 */
export async function deleteEventDocument(
  documentId: string,
  eventId: string,
  fileUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const storagePath = getStoragePathFromUrl(fileUrl);

    // Remove file object from storage if path exists
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (storageError) {
        console.warn("Storage deletion warning:", storageError.message);
      }
    }

    // Remove document metadata record
    const { error: dbError } = await supabase
      .from("event_documents")
      .delete()
      .eq("id", documentId)
      .eq("event_id", eventId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus berkas";
    return { success: false, error: message };
  }
}

/**
 * Generates secure temporary signed URL for downloading / viewing protected documents.
 */
export async function getDocumentSignedUrl(
  fileUrl: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (fileUrl.startsWith("http://") || (fileUrl.startsWith("https://") && !fileUrl.includes("/storage/v1/object/"))) {
      return { success: true, url: fileUrl };
    }

    await requireAuth();
    const supabase = await createClient();
    const storagePath = getStoragePathFromUrl(fileUrl);

    if (!storagePath) {
      return { success: false, error: "Jalur berkas tidak valid" };
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      const { data: publicData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      if (publicData?.publicUrl) {
        return { success: true, url: publicData.publicUrl };
      }

      return {
        success: false,
        error: error?.message || "Gagal membuat tautan unduh berkas",
      };
    }

    return { success: true, url: data.signedUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunduh berkas";
    return { success: false, error: message };
  }
}

/**
 * Server Action for multipart FormData file upload directly through server action.
 */
export async function uploadEventDocument(
  formData: FormData
): Promise<{ success: boolean; data?: EventDocument; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: "Silakan pilih berkas yang valid" };
    }

    if (!eventId) {
      return { success: false, error: "ID acara wajib diisi" };
    }

    await requireAuth();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${eventId}/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Gagal upload ke storage: ${uploadError.message}` };
    }

    const { data: docData, error: dbError } = await supabase
      .from("event_documents")
      .insert({
        event_id: eventId,
        file_name: file.name,
        file_url: storagePath,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        uploaded_by: user?.id ?? null,
      })
      .select("*, uploader:profiles(*)")
      .single();

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true, data: docData as EventDocument };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan upload berkas";
    return { success: false, error: message };
  }
}

