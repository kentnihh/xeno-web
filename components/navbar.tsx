"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Plus,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  Briefcase,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
  avatarColor?: string | null;
  canCreateEvent?: boolean;
  canAccessSettings?: boolean;
  isSuperAdmin?: boolean;
}

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Acara & Event", href: "/events", icon: CalendarDays },
  { name: "Database Klien", href: "/clients", icon: Users },
  { name: "Database Vendor", href: "/vendors", icon: Briefcase },
  { name: "Tim Kru", href: "/team", icon: Layers },
];

const baseSettingsSubNav = [
  { name: "Master Template", href: "/settings/templates", icon: FileSpreadsheet },
  { name: "Manajemen RBAC", href: "/settings/rbac", icon: ShieldCheck },
];

export function Navbar({
  userEmail = "staf@xenoent.com",
  userRole = "Staff",
  avatarColor,
  canCreateEvent = false,
  canAccessSettings = false,
  isSuperAdmin = false,
}: NavbarProps) {
  const settingsSubNavigation = isSuperAdmin
    ? [
        ...baseSettingsSubNav,
        { name: "Impersonate", href: "/settings/impersonate", icon: UserCheck },
      ]
    : baseSettingsSubNav;
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!isMobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-150">
        {/* Left: Mobile Hamburger + Brand Logo + Live status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            id="mobile-hamburger-btn"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Buka Menu Navigasi"
            className="md:hidden p-2 rounded-xl text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/dashboard" className="flex items-center shrink-0">
            <div className="bg-white px-2 py-0.5 rounded-lg border border-black/10 dark:border-white/20 shadow-xs flex items-center justify-center">
              <Image
                src="/logo-xeno.png"
                alt="XENO Logo"
                width={150}
                height={50}
                className="h-7 sm:h-9 w-auto object-contain"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#30d158]" />
            </span>
            <span className="text-xs font-semibold text-foreground tracking-tight hidden lg:inline truncate">
              Sistem Operasional Aktif
            </span>
          </div>
        </div>

        {/* Right: Actions + Theme + Profile + Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Prominent CTA: + Buat Acara */}
          {canCreateEvent && (
            <Link
              href="/events/new"
              className="apple-btn-primary px-3 sm:px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Buat Acara</span>
            </Link>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Desktop User Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-muted/70 hover:bg-muted pl-2 pr-3 py-1.5 rounded-full border border-border shadow-xs transition-colors">
            <UserAvatar
              role={userRole}
              avatarColor={avatarColor}
              size="xs"
              name={userEmail}
              showTooltip={false}
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground max-w-[140px] truncate">
                {userEmail}
              </span>
              <RoleBadge role={userRole} size="xs" />
            </div>
          </div>

          {/* Desktop Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar Sistem"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.98] transition-all cursor-pointer border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer / Side Sheet */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out drawer container */}
          <aside
            id="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Navigasi Mobile"
            className="fixed top-0 bottom-0 left-0 w-[285px] max-w-[85vw] bg-card text-card-foreground border-r border-border shadow-2xl flex flex-col justify-between p-4 z-50 animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            <div className="space-y-4">
              {/* Drawer Header with Logo and Close button */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2"
                >
                  <div className="bg-white px-2 py-1 rounded-xl border border-black/10 dark:border-white/20 shadow-xs flex items-center justify-center shrink-0">
                    <Image
                      src="/logo-xeno.png"
                      alt="XENO Logo"
                      width={120}
                      height={40}
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Tutup Menu"
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile User Card */}
              <div className="p-3 rounded-2xl bg-muted/50 border border-border flex items-center gap-3">
                <UserAvatar
                  role={userRole}
                  avatarColor={avatarColor}
                  size="md"
                  name={userEmail}
                  showTooltip={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">
                    {userEmail}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RoleBadge role={userRole} size="xs" />
                  </div>
                </div>
              </div>

              {/* CTA Buat Acara (Mobile) */}
              {canCreateEvent && (
                <Link
                  href="/events/new"
                  onClick={() => setIsMobileOpen(false)}
                  className="apple-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#007aff]/30"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Buat Acara Baru</span>
                </Link>
              )}

              {/* Main Navigation Links */}
              <nav className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Menu Utama
                </div>
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard" || pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-[#007aff] text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                    </Link>
                  );
                })}
              </nav>

              {/* Settings Subnavigation (if privileged) */}
              {canAccessSettings && (
                <nav className="space-y-1 pt-2 border-t border-border">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pengaturan
                  </div>
                  {settingsSubNavigation.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname.startsWith(sub.href);

                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                          isSubActive
                            ? "bg-[#007aff] text-white font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SubIcon className={cn("w-4 h-4 shrink-0", isSubActive ? "text-white" : "text-muted-foreground")} />
                          <span className="truncate">{sub.name}</span>
                        </div>
                        {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Mobile Drawer Footer with Sign Out */}
            <div className="pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  <span>Keluar Sistem</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
