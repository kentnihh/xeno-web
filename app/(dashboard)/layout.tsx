import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let userRole = "Staff";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") {
      userRole = "Admin";
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-150">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <Navbar userEmail={user?.email || "staf@xenoent.com"} userRole={userRole} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

