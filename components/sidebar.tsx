"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Settings,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Acara & Event", href: "/events", icon: CalendarDays },
  { name: "Database Klien", href: "/clients", icon: Users },
  { name: "Database Vendor", href: "/vendors", icon: Briefcase },
  { name: "Tim Kru", href: "/team", icon: Layers },
];

const settingsSubNavigation = [
  { name: "Master Template", href: "/settings/templates", icon: FileSpreadsheet },
  { name: "Manajemen RBAC", href: "/settings/rbac", icon: ShieldCheck },
];


export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isSettingsActive = pathname.startsWith("/settings");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  useEffect(() => {
    if (isSettingsActive) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsActive]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground backdrop-blur-2xl border-r border-sidebar-border flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40 transition-colors duration-150">
      <div className="overflow-y-auto">
        {/* macOS Traffic Lights + Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border sticky top-0 bg-sidebar/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-b from-[#007aff] to-[#0051d5] flex items-center justify-center text-white shadow-md shadow-[#007aff]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-foreground text-sm">
                XENO
              </div>
              <div className="text-[10px] text-[#007aff] dark:text-[#3894ff] tracking-wider uppercase font-bold">
                OPERATIONS
              </div>
            </div>
          </div>

          {/* macOS Window Controls */}
          <div className="flex items-center gap-1.5 opacity-75 hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-3">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  className={cn(
                    "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-[#007aff] text-white shadow-[0_2px_12px_rgba(0,122,255,0.4)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:translate-x-0.5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-transform duration-150 group-hover:scale-110 shrink-0",
                        isActive
                          ? "text-white"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-transform duration-150",
                      isActive
                        ? "text-white/90"
                        : "text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          {/* Settings Section (Pengaturan) */}
          <div className="space-y-1 pt-2 border-t border-sidebar-border">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pengaturan
            </div>

            {/* Main Settings Menu Item */}
            <div>
              <div
                className={cn(
                  "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                  isSettingsActive && pathname === "/settings"
                    ? "bg-[#007aff] text-white shadow-[0_2px_12px_rgba(0,122,255,0.4)]"
                    : isSettingsActive
                    ? "text-[#007aff] bg-[#007aff]/10 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
                onClick={() => setIsSettingsOpen((prev) => !prev)}
              >
                <Link
                  href="/settings"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <Settings
                    className={cn(
                      "w-4 h-4 transition-transform duration-150 group-hover:scale-110 shrink-0",
                      isSettingsActive && pathname === "/settings"
                        ? "text-white"
                        : isSettingsActive
                        ? "text-[#007aff]"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className="p-1 -mr-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isSettingsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Nested Sub-navigation */}
              {isSettingsOpen && (
                <div className="mt-1 ml-4 pl-2 border-l border-sidebar-border/70 space-y-1">
                  {settingsSubNavigation.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname.startsWith(sub.href);

                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className={cn(
                          "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                          isSubActive
                            ? "bg-[#007aff] text-white font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SubIcon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              isSubActive
                                ? "text-white"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="truncate">{sub.name}</span>
                        </div>
                        {isSubActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </nav>
      </div>

      {/* Footer / Sign Out (Explicit & High Contrast) */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white dark:bg-rose-500/15 dark:hover:bg-rose-600 dark:hover:text-white border border-rose-500/20 dark:border-rose-500/30 transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            <span>Keluar Sistem</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </aside>
  );
}

