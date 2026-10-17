"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { syncEventToGoogleCalendar, syncUpcomingEventsToCalendar } from "@/app/actions/gcal-sync";

export interface PostSubmitSyncModalProps {
  isOpen: boolean;
  eventId?: string;
  defaultRedirectUrl?: string;
  onClose?: () => void;
}

export function PostSubmitSyncModal({
  isOpen,
  eventId,
  defaultRedirectUrl = "/events",
  onClose,
}: PostSubmitSyncModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSyncing) {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSyncing]);

  if (!isOpen) return null;

  const handleSkip = () => {
    if (isSyncing) return;
    onClose?.();
    router.refresh();
    if (defaultRedirectUrl) {
      router.push(defaultRedirectUrl);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setToast(null);

    try {
      const res = await syncUpcomingEventsToCalendar(eventId);

      if (res.success) {
        setToast({
          type: "success",
          message: res.message || "Acara berhasil disinkronkan ke Google Calendar!",
        });
        // Brief delay so user sees success confirmation before navigating
        setTimeout(() => {
          onClose?.();
          router.refresh();
          if (defaultRedirectUrl) {
            router.push(defaultRedirectUrl);
          }
        }, 1200);
      } else {
        setToast({
          type: "error",
          message: res.error || res.message || "Gagal menyinkronkan ke Google Calendar.",
        });
        setIsSyncing(false);
      }
    } catch (err: unknown) {
      console.error("[PostSubmitSyncModal] Error syncing event:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan ke Google Calendar. Periksa koneksi Anda.";
      setToast({
        type: "error",
        message: errMsg,
      });
      setIsSyncing(false);
    }
  };

  const modalContent = (
    <div className="post-submit-sync-modal-root">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={isSyncing ? undefined : handleSkip}
        aria-hidden="true"
      />

      {/* Centered Modal Container */}
      <div
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[calc(100%-2rem)] max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 text-foreground transform animate-in zoom-in-95 duration-200 focus:outline-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/15 border border-[#007aff]/30 flex items-center justify-center text-[#007aff] shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2
                id="sync-modal-title"
                className="text-base font-bold text-foreground tracking-tight"
              >
                Acara Berhasil Disimpan!
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan di Database
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSyncing}
            className="w-7 h-7 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Tutup modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Description */}
        <div className="py-4 space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Apakah Anda ingin langsung menyinkronkan jadwal acara ini ke Google Calendar tim operasional?
          </p>

          {/* Toast Notification inside modal */}
          {toast && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 duration-150 ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-snug">{toast.message}</div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            id="sync-modal-later-btn"
            onClick={handleSkip}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-muted/80 hover:bg-muted active:bg-muted/60 text-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
          >
            Nanti Saja
          </button>

          <button
            type="button"
            id="sync-modal-confirm-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#007aff] hover:bg-[#0066d6] active:bg-[#0051ab] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyinkronkan...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Ya, Sinkronkan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !mounted) {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
