"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const content = (
    <div className="modal-shell-root">
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-150 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-card backdrop-blur-2xl border border-border shadow-2xl p-6 text-foreground transform transition-all duration-150 animate-in zoom-in-95 focus:outline-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95"
            aria-label="Tutup modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !mounted) {
    return content;
  }

  return createPortal(content, document.body);
}
