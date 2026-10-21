import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, isAdmin, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, isAdminUser, hasRbacManage, hasTemplatesManage, hasUsersManage, canCreateEvent] =
    await Promise.all([
      getCurrentProfile(user.id),
      isAdmin(user.id),
      hasPermission("rbac.manage", user.id),
      hasPermission("templates.manage", user.id),
      hasPermission("users.manage", user.id),
      hasPermission("events.create", user.id),
    ]);

  let userRole = "Staff";
  if (profile?.role === "admin") {
    userRole = "Admin";
  } else if (profile?.role === "manager") {
    userRole = "Manager";
  }
  const avatarColor = profile?.avatar_color || null;

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

