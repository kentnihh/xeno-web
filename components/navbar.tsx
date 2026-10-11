import Link from "next/link";
import { User, Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
}

export function Navbar({ userEmail = "staf@xenoent.com", userRole = "Staff" }: NavbarProps) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-150">
      {/* Left: Live status */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#30d158]" />
        </span>
        <span className="text-xs font-semibold text-foreground tracking-tight">
          Sistem Operasional Aktif
        </span>
      </div>

      {/* Right: Actions + Theme + Profile */}
      <div className="flex items-center gap-3">
        {/* Prominent Apple CTA: + Buat Acara */}
        <Link
          href="/events/new"
          className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30 hover:shadow-[#007aff]/50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Buat Acara</span>
        </Link>

        {/* Apple Style Dark / Light Mode Switcher */}
        <ThemeToggle />

        {/* User Pill */}
        <div className="hidden sm:flex items-center gap-2.5 bg-muted/70 hover:bg-muted px-3 py-1.5 rounded-full border border-border shadow-xs transition-colors">
          <div className="w-5 h-5 rounded-full bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
            <User className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground max-w-[140px] truncate">
              {userEmail}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] uppercase border border-[#007aff]/30">
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
