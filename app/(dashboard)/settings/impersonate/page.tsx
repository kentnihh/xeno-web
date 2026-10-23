import { redirect } from "next/navigation";
import { isRealSuperAdmin, getRealUser, getImpersonationContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ImpersonateView } from "@/components/impersonate/impersonate-view";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Impersonation | XENO Operations",
  description: "Masuk sebagai akun pengguna lain untuk pengawasan dan penanganan operasional tim.",
};

export default async function ImpersonatePage() {
  const supabase = await createClient();

  // Concurrent fetching: Super admin validation, real user, impersonation context, and profiles in parallel
  const [superAdmin, realUser, impersonation, { data: profiles }] = await Promise.all([
    isRealSuperAdmin(),
    getRealUser(),
    getImpersonationContext(),
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
  ]);

  if (!superAdmin) {
    redirect("/dashboard");
  }

  return (
    <ImpersonateView
      users={(profiles as Profile[]) || []}
      realUserId={realUser?.id || ""}
      currentImpersonatedId={impersonation.impersonatedUser?.id || null}
    />
  );
}
