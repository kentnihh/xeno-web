"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Nama klien wajib diisi"),
  company: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  phone: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  email: z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? null : v),
    z.string().trim().email("Format email tidak valid").nullable().optional()
  ),
  address: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export async function createClientAction(
  input: FormData | Record<string, unknown>
): Promise<{ success: boolean; error?: string; client?: unknown }> {
  try {
    await requirePermission("clients.create");

    let raw: Record<string, unknown>;
    if (input instanceof FormData) {
      raw = {
        name: input.get("name"),
        company: input.get("company"),
        phone: input.get("phone"),
        email: input.get("email"),
        address: input.get("address"),
      };
    } else {
      raw = input;
    }

    const parsed = createClientSchema.safeParse(raw);
    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Data klien tidak valid.";
      console.warn("[createClientAction] Validation error:", errMsg);
      return { success: false, error: errMsg };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("clients").insert(parsed.data).select().single();

    if (error) {
      console.error("[createClientAction] Supabase error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/clients");
    revalidatePath("/events");
    revalidatePath("/events/new");
    return { success: true, client: data };
  } catch (err: unknown) {
    console.error("[createClientAction] Execution exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan klien baru.",
    };
  }
}

export async function deleteClientAction(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("clients.delete");

    const parsedId = z.string().min(1, "ID klien wajib diisi").safeParse(clientId);
    if (!parsedId.success) {
      return { success: false, error: parsedId.error.issues[0]?.message || "ID klien tidak valid." };
    }

    const validId = parsedId.data;
    const supabase = await createClient();

    // Safely unlink events associated with this client to prevent foreign key errors
    await supabase.from("events").update({ client_id: null }).eq("client_id", validId);

    const { error } = await supabase.from("clients").delete().eq("id", validId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/clients");
    revalidatePath("/events");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus klien.",
    };
  }
}
