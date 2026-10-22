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
  const superAdmin = await isRealSuperAdmin();
  if (!superAdmin) {
    redirect("/dashboard");
  }

  const realUser = await getRealUser();
  const impersonation = await getImpersonationContext();

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <ImpersonateView
      users={(profiles as Profile[]) || []}
      realUserId={realUser?.id || ""}
      currentImpersonatedId={impersonation.impersonatedUser?.id || null}
    />
  );
}
