"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function updateMemberRoleAction(userId: string, newRole: UserRole): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}

export async function deleteMemberAction(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}
