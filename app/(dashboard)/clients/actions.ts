"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireAdmin } from "@/lib/auth";

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

export async function createClientAction(formData: FormData): Promise<void> {
  await requireAuth();

  const validated = createClientSchema.parse({
    name: formData.get("name"),
    company: formData.get("company"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert(validated);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clients");
}

export async function deleteClientAction(clientId: string): Promise<void> {
  await requireAdmin();

  const validId = z.string().min(1, "ID klien wajib diisi").parse(clientId);
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", validId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clients");
}
