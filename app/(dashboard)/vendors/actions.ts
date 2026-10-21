"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

const createVendorSchema = z.object({
  name: z.string().trim().min(1, "Nama vendor wajib diisi"),
  category: z.string().trim().min(1, "Kategori vendor wajib diisi"),
  pic_name: z.string().trim().min(1, "Nama PIC wajib diisi"),
  phone: z.string().trim().min(1, "Nomor telepon PIC wajib diisi"),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  notes: z.string().trim().optional().transform((v) => v || null),
});

export async function createVendorAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("vendors.create");

    const raw = {
      name: formData.get("name"),
      category: formData.get("category"),
      pic_name: formData.get("pic_name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      notes: formData.get("notes"),
    };

    const parsed = createVendorSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Data vendor tidak valid." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("vendors").insert(parsed.data);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/vendors");
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan vendor baru.",
    };
  }
}

export async function deleteVendorAction(vendorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("vendors.delete");

    const parsedId = z.string().min(1, "ID vendor wajib diisi").safeParse(vendorId);
    if (!parsedId.success) {
      return { success: false, error: parsedId.error.issues[0]?.message || "ID vendor tidak valid." };
    }

    const validId = parsedId.data;
    const supabase = await createClient();

    // Clean up event_vendors assignments first to prevent foreign key errors
    await supabase.from("event_vendors").delete().eq("vendor_id", validId);

    const { error } = await supabase.from("vendors").delete().eq("id", validId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/vendors");
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus vendor.",
    };
  }
}
