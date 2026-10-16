"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Loader2, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";
import { syncEventToGoogleCalendar, syncAllEventsToGoogleCalendar } from "@/app/actions/gcal-sync";

interface SyncGCalButtonProps {
  eventId?: string;
  eventTitle?: string;
  className?: string;
}

export function SyncGCalButton({
  eventId,
  eventTitle,
  className = "",
}: SyncGCalButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
    link?: string;
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: "success" | "error", message: string, link?: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message, link });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      if (eventId) {
        const res = await syncEventToGoogleCalendar(eventId);
        if (res.success) {
          showToast("success", res.message, res.htmlLink);
        } else {
          showToast("error", res.message || "Gagal menyinkronkan ke Google Calendar.");
        }
      } else {
        const res = await syncAllEventsToGoogleCalendar();
        if (res.success) {
          showToast("success", res.message);
        } else {
          showToast("error", res.message || "Gagal menyinkronkan seluruh acara.");
        }
      }
    } catch (err: unknown) {
      console.error("[SyncGCalButton] Error during Google Calendar sync:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan ke Google Calendar. Periksa koneksi dan kredensial.";
      showToast("error", errMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        id="sync-google-calendar-btn"
        onClick={handleSync}
        disabled={isSyncing}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        title={
          eventId
            ? `Sinkronkan "${eventTitle || "Acara"}" ke Google Calendar`
            : "Sinkronkan seluruh acara aktif ke Google Calendar"
        }
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Calendar className="w-3.5 h-3.5" />
        )}
        <span>{isSyncing ? "Menyinkronkan..." : "Sync ke Google Calendar"}</span>
      </button>

      {/* Floating Success / Error Toast Notification */}
      {toast && (
        <div
          id="gcal-sync-toast"
          role={toast.type === "error" ? "alert" : "status"}
          className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 p-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-emerald-500/30"
              : "bg-rose-950 text-rose-100 border-rose-500/40"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            {toast.link && (
              <a
                href={toast.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#007aff] hover:underline font-bold mt-1"
              >
                <span>Buka di Google Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <button
            type="button"
            id="dismiss-gcal-toast-btn"
            onClick={() => setToast(null)}
            className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}
    </>
  );
}
