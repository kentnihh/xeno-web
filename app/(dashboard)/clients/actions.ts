"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Nama klien wajib diisi"),
  company: z.string().trim().optional().transform((v) => v || null),
  phone: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  address: z.string().trim().optional().transform((v) => v || null),
});

export async function createClientAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("clients.create");

    const raw = {
      name: formData.get("name"),
      company: formData.get("company"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      address: formData.get("address"),
    };

    const parsed = createClientSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Data klien tidak valid." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("clients").insert(parsed.data);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/clients");
    revalidatePath("/events");
    return { success: true };
  } catch (err: unknown) {
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
