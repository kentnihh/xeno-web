"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createVendorAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const pic_name = formData.get("pic_name") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const { error } = await supabase.from("vendors").insert({
    name,
    category,
    pic_name,
    phone,
    email,
    notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
}

export async function deleteVendorAction(vendorId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
}
