"use client";

import { useState } from "react";
import { ModalShell } from "@/components/users/modal-shell";
import { Combobox } from "@/components/ui/combobox";
import { Loader2, Coins } from "lucide-react";
import type { EventExpense, ExpenseCategory, ExpenseStatus } from "@/types/database";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "Vendor", label: "Vendor & Supplier" },
  { value: "Logistics", label: "Logistik & Transport" },
  { value: "F&B", label: "Konsumsi & F&B" },
  { value: "Others", label: "Lain-lain" },
];

export function ExpenseModal({
  isOpen,
  onClose,
  eventId,
  expense,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  expense?: EventExpense | null;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}) {
  const isEditing = !!expense;
  const initialDate = expense?.expense_date
    ? expense.expense_date.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>((expense?.category as ExpenseCategory) || "Vendor");
  const [expenseDate, setExpenseDate] = useState(initialDate);
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status || "Unpaid");
  const [notes, setNotes] = useState(expense?.notes || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const fd = new FormData();
    fd.append("event_id", eventId);
    if (expense?.id) fd.append("id", expense.id);
    fd.append("amount", String(numAmount));
    fd.append("category", category);
    fd.append("expense_date", expenseDate);
    fd.append("status", status);
    if (notes.trim()) fd.append("notes", notes.trim());

    onSubmit(fd);
  };

  return (
    <ModalShell
      title={isEditing ? "Edit Catatan Pengeluaran" : "Tambah Pengeluaran Acara"}
      subtitle="Pencatatan realisasi biaya & pengeluaran operasional"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Nominal (IDR) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="15000000"
              className="apple-input w-full pl-10 pr-3.5 py-2 text-sm font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Kategori *</label>
            <Combobox
              options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={category}
              onChange={(v) => setCategory(v as ExpenseCategory)}
              placeholder="Pilih kategori..."
              searchPlaceholder="Cari kategori pengeluaran..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
              className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer font-medium"
            >
              <option value="Unpaid" className="bg-card text-foreground">Belum Bayar (Unpaid)</option>
              <option value="Paid" className="bg-card text-foreground">Lunas (Paid)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Tanggal *</label>
          <input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Catatan</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Keterangan pengeluaran, vendor, no invoice..."
            className="apple-input w-full px-3.5 py-2 text-xs resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button type="button" onClick={onClose} disabled={isPending} className="apple-btn-secondary px-4 py-2 text-xs font-semibold">
            Batal
          </button>
          <button type="submit" disabled={isPending} className="apple-btn-primary px-4 py-2 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
            <span>{isEditing ? "Simpan Perubahan" : "Tambah Pengeluaran"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
