"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createClientAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const company = (formData.get("company") as string) || null;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const address = (formData.get("address") as string) || null;

  const { error } = await supabase.from("clients").insert({
    name,
    company,
    phone,
    email,
    address,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clients");
}

export async function deleteClientAction(clientId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clients");
}
