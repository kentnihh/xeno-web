"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireAdmin } from "@/lib/auth";

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

export async function createVendorAction(formData: FormData): Promise<void> {
  await requireAuth();

  const validated = createVendorSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    pic_name: formData.get("pic_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").insert(validated);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
}

export async function deleteVendorAction(vendorId: string): Promise<void> {
  await requireAdmin();

  const validId = z.string().min(1, "ID vendor wajib diisi").parse(vendorId);
  const supabase = await createClient();
  const { error } = await supabase.from("vendors").delete().eq("id", validId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
}
