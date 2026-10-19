import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin, hasPermission } from "@/lib/auth";

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
  let avatarColor: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, avatar_color")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") {
      userRole = "Admin";
    } else if (profile?.role === "manager") {
      userRole = "Manager";
    }
    avatarColor = profile?.avatar_color || null;
  }

  const [isAdminUser, hasRbacManage, hasTemplatesManage, hasUsersManage, canCreateEvent] =
    await Promise.all([
      isAdmin(),
      hasPermission("rbac.manage"),
      hasPermission("templates.manage"),
      hasPermission("users.manage"),
      hasPermission("events.create"),
    ]);

  const canAccessSettings =
    isAdminUser || hasRbacManage || hasTemplatesManage || hasUsersManage;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-150">
      <Sidebar canAccessSettings={canAccessSettings} />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <Navbar
          userEmail={user?.email || "staf@xenoent.com"}
          userRole={userRole}
          avatarColor={avatarColor}
          canCreateEvent={canCreateEvent}
          canAccessSettings={canAccessSettings}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

