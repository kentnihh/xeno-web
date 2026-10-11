"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/types/database";

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1, "ID pengguna wajib diisi"),
  newRole: z.enum(["admin", "manager", "staff"]),
});

export async function updateMemberRoleAction(userId: string, newRole: UserRole): Promise<void> {
  await requireAdmin();

  const validated = updateMemberRoleSchema.parse({ userId, newRole });
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: validated.newRole, updated_at: new Date().toISOString() })
    .eq("id", validated.userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}

export async function deleteMemberAction(userId: string): Promise<void> {
  await requireAdmin();

  const validId = z.string().min(1, "ID pengguna wajib diisi").parse(userId);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", validId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}
