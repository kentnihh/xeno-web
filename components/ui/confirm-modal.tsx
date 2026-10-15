"use client";

import { useState, useEffect, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
 * Portaled directly to document.body to prevent containing-block clipping by transformed ancestors.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isPending, onClose]);

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

  const modalContent = (
    <div className="confirm-modal-root">
      {/* 1. Backdrop Overlay spanning entire viewport */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={isPending ? undefined : onClose}
        aria-hidden="true"
      />

      {/* 2. Perfectly Centered Modal Container */}
      <div
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 text-foreground transform animate-in zoom-in-95 duration-150 focus:outline-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title row with red warning triangle and tiny close X */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#ff453a]" />
            <h2 id="confirm-modal-title" className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-7 h-7 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body text warning card */}
        <div className="py-2 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
            <p className="text-xs sm:text-sm leading-relaxed">{displayMessage}</p>
          </div>
        </div>

        {/* Footer buttons aligned to the right */}
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2 rounded-full bg-muted/80 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#ff453a] hover:bg-[#ff3b30] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // In SSR or node test environments where document does not exist, render directly
  if (typeof document === "undefined" || !mounted) {
    return modalContent;
  }

  // On client browser, portal to document.body outside of any transformed card/container
  return createPortal(modalContent, document.body);
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
