"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Reusable Confirmation Modal for destructive actions.
 * ponytail: backdrop-blur and keyboard trap simplified to standard accessible modal; upgrade to Radix dialog if focus trap required.
 */
export function ConfirmModal({
  isOpen,
  title = "Konfirmasi Hapus",
  message,
  itemName,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayMessage =
    message ||
    (itemName
      ? `Apakah Anda yakin ingin menghapus "${itemName}"? Tindakan ini tidak dapat dibatalkan.`
      : "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.");

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memproses penghapusan.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 text-foreground transform transition-all animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 id="confirm-modal-title" className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
            <p className="text-xs sm:text-sm leading-relaxed">{displayMessage}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary px-4 py-2 text-xs font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff453a] hover:bg-[#ff3b30] text-white text-xs font-semibold shadow-md shadow-[#ff453a]/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DeleteConfirmButtonProps {
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemName?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  triggerClassName?: string;
  triggerTitle?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function DeleteConfirmButton({
  onConfirm,
  title = "Konfirmasi Hapus",
  itemName,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  triggerClassName,
  triggerTitle = "Hapus",
  disabled = false,
  children,
}: DeleteConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={triggerClassName}
        title={triggerTitle}
      >
        {children}
      </button>

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        itemName={itemName}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
