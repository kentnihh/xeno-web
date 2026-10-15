"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, CheckCircle2, AlertCircle, X } from "lucide-react";
import { AddClientModal } from "./add-client-modal";

export function AddClientSection({ canCreate }: { canCreate: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (!canCreate) return null;

  return (
    <>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="apple-btn-primary px-4 py-2 text-xs font-semibold shadow-md shadow-[#007aff]/30 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tambah Klien Baru</span>
        </button>
      </div>

      <AddClientModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(msg) => showToast(msg, "success")}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card border shadow-xl shadow-black/20 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "border-emerald-500/30 text-emerald-600 dark:text-[#30d158]"
              : "border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
