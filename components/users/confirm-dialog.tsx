"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Hapus",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      isOpen={true}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

