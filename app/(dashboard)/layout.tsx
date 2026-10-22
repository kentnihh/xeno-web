import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getCurrentProfile,
  isAdmin,
  hasPermission,
  isRealSuperAdmin,
  getImpersonationContext,
} from "@/lib/auth";

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

  const [
    profile,
    isAdminUser,
    hasRbacManage,
    hasTemplatesManage,
    hasUsersManage,
    canCreateEvent,
    realIsSuperAdmin,
    impersonation,
  ] = await Promise.all([
    getCurrentProfile(user.id),
    isAdmin(user.id),
    hasPermission("rbac.manage", user.id),
    hasPermission("templates.manage", user.id),
    hasPermission("users.manage", user.id),
    hasPermission("events.create", user.id),
    isRealSuperAdmin(),
    getImpersonationContext(),
  ]);

  let userRole = "staff";
  const normalizedRole = profile?.role?.toLowerCase();
  if (normalizedRole === "super_admin") {
    userRole = "SUPER_ADMIN";
  } else if (normalizedRole === "admin") {
    userRole = "ADMIN";
  } else if (normalizedRole === "manager") {
    userRole = "MANAGER";
  }
  const avatarColor = profile?.avatar_color || null;

  const canAccessSettings =
    isAdminUser || hasRbacManage || hasTemplatesManage || hasUsersManage || realIsSuperAdmin;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-150">
      <Sidebar
        canAccessSettings={canAccessSettings}
        isSuperAdmin={realIsSuperAdmin}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {impersonation.isImpersonating && impersonation.impersonatedUser && (
          <ImpersonationBanner
            targetName={impersonation.impersonatedUser.full_name}
            targetRole={impersonation.impersonatedUser.role.toUpperCase()}
          />
        )}
        <Navbar
          userEmail={user?.email || "staf@xenoent.com"}
          userRole={userRole}
          avatarColor={avatarColor}
          canCreateEvent={canCreateEvent}
          canAccessSettings={canAccessSettings}
          isSuperAdmin={realIsSuperAdmin}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

