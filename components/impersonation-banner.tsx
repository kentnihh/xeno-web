"use client";

import { useTransition } from "react";
import { AlertTriangle, LogOut, Loader2 } from "lucide-react";
import { stopImpersonating } from "@/app/actions/impersonate";

interface ImpersonationBannerProps {
  targetName: string;
  targetRole: string;
}

export function ImpersonationBanner({
  targetName,
  targetRole,
}: ImpersonationBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleStop = () => {
    startTransition(async () => {
      await stopImpersonating();
    });
  };

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 dark:from-amber-600 dark:via-amber-500 dark:to-amber-600 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-600/30 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-1 rounded-md bg-slate-950/15 text-slate-950 shrink-0 shadow-xs">
          <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
        </span>
        <div className="truncate">
          <span>Mode Impersonasi: Anda sedang melihat sistem sebagai </span>
          <strong className="font-bold underline underline-offset-2 text-slate-950">
            {targetName}
          </strong>{" "}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-950 text-white shadow-xs">
            {targetRole}
          </span>
          .
        </div>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={isPending}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
        title="Akhiri mode impersonasi dan kembali ke akun Super Admin"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Kembali ke Akun Super Admin</span>
        <span className="sm:hidden">Keluar Impersonasi</span>
      </button>
    </aside>
  );
}
