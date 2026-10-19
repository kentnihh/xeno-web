"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
  avatarColor?: string | null;
  canCreateEvent?: boolean;
}

export function Navbar({
  userEmail = "staf@xenoent.com",
  userRole = "Staff",
  avatarColor,
  canCreateEvent = false,
}: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-150">
      {/* Left: Brand Logo + Live status */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center">
          <div className="bg-white px-2 py-0.5 rounded-lg border border-black/10 dark:border-white/20 shadow-xs flex items-center justify-center">
            <Image
              src="/logo-xeno.png"
              alt="XENO Logo"
              width={150}
              height={50}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#30d158]" />
          </span>
          <span className="text-xs font-semibold text-foreground tracking-tight hidden sm:inline">
            Sistem Operasional Aktif
          </span>
        </div>
      </div>

      {/* Right: Actions + Theme + Profile + Logout */}
      <div className="flex items-center gap-3">
        {/* Prominent Apple CTA: + Buat Acara */}
        {canCreateEvent && (
          <Link
            href="/events/new"
            className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Acara</span>
          </Link>
        )}

        {/* Apple Style Dark / Light Mode Switcher */}
        <ThemeToggle />

        {/* User Pill */}
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-foreground uppercase tracking-wider">
              {userRole}
            </span>
          </div>
        </div>

        {/* Sign Out Button in Navbar */}
        <button
          type="button"
          onClick={handleLogout}
          title="Keluar Sistem"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.98] transition-all cursor-pointer border border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}

