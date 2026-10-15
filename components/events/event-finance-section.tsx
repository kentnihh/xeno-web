"use client";

import { useState, useTransition } from "react";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { formatIDR, formatDate } from "@/lib/utils";
import {
  createEventExpense,
  updateEventExpense,
  deleteEventExpense,
  toggleExpenseStatus,
} from "@/app/(dashboard)/events/expense-actions";
import { ExpenseModal } from "./expense-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Event, EventExpense, ExpenseStatus } from "@/types/database";

const CATEGORY_COLORS: Record<string, { label: string; badge: string }> = {
  Vendor: { label: "Vendor", badge: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border-[#007aff]/30" },
  Logistics: { label: "Logistik", badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
  "F&B": { label: "F&B", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  Others: { label: "Lainnya", badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
};

export function EventFinanceSection({
  event,
  initialExpenses,
  canManage = true,
}: {
  event: Event;
  initialExpenses: EventExpense[];
  canManage?: boolean;
}) {
  const [expenses, setExpenses] = useState<EventExpense[]>(initialExpenses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<EventExpense | null>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const budget = (event as { budget?: number | null }).budget != null ? Number((event as { budget?: number | null }).budget) : null;
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const paidSpent = expenses
    .filter((e) => e.status === "Paid")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unpaidSpent = expenses
    .filter((e) => e.status === "Unpaid")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const remaining = budget != null ? budget - totalSpent : null;
  const isOverBudget = remaining != null && remaining < 0;
  const percentSpent = budget != null && budget > 0 ? Math.round((totalSpent / budget) * 100) : null;

  const filteredExpenses = expenses.filter((e) => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const handleToggleStatus = (expense: EventExpense) => {
    setErrorMsg(null);
    const nextStatus: ExpenseStatus = expense.status === "Paid" ? "Unpaid" : "Paid";
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, status: nextStatus } : e)));

    startTransition(async () => {
      const res = await toggleExpenseStatus(expense.id, event.id, expense.status);
      if (!res.success) {
        setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, status: expense.status } : e)));
        setErrorMsg(res.error || "Gagal mengubah status.");
      }
    });
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;
    const target = deletingExpense;
    setExpenses((prev) => prev.filter((e) => e.id !== target.id));

    const res = await deleteEventExpense(target.id, event.id);
    if (!res.success) {
      setExpenses((prev) => [...prev, target]);
      throw new Error(res.error || "Gagal menghapus pengeluaran.");
    }
  };

  const handleModalSubmit = (fd: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      const isEdit = !!editingExpense;
      const res = isEdit ? await updateEventExpense(fd) : await createEventExpense(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal menyimpan pengeluaran.");
        return;
      }
      if (res.expense) {
        if (isEdit) {
          setExpenses((prev) => prev.map((e) => (e.id === res.expense!.id ? res.expense! : e)));
        } else {
          setExpenses((prev) => [res.expense!, ...prev]);
        }
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL SUMMARY WIDGET */}
      <div className="apple-card p-5 md:p-6 border border-border shadow-xs backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#007aff]/10 text-[#007aff] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Ringkasan Finansial Acara</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Monitoring anggaran dan pengeluaran</p>
            </div>
          </div>

          {budget != null && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isOverBudget
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : (percentSpent ?? 0) > 85
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-[#30d158] border-emerald-500/30"
              }`}
            >
              {isOverBudget ? "Over Budget" : (percentSpent ?? 0) > 85 ? "Mendekati Limit" : "Terkendali"}
            </span>
          )}
        </div>

        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Budget</span>
              <div className="w-7 h-7 rounded-xl bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
              {budget != null ? formatIDR(budget) : "Tidak Ditentukan"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">Plafon alokasi biaya</div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Spent</span>
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
              {formatIDR(totalSpent)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              {expenses.length} transaksi ({formatIDR(paidSpent)} lunas)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Remaining Balance</span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isOverBudget ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-emerald-500/15 text-emerald-600 dark:text-[#30d158]"
              }`}>
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-xl md:text-2xl font-bold tracking-tight truncate ${
              isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-[#30d158]"
            }`}>
              {remaining != null ? formatIDR(Math.abs(remaining)) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              {remaining == null ? "Belum diatur" : isOverBudget ? "Defisit anggaran" : "Sisa saldo"}
            </div>
          </div>
        </div>

        {budget != null && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground">Realisasi: <span className="text-foreground font-bold">{percentSpent}%</span></span>
              <span className="text-muted-foreground text-[11px]">{formatIDR(totalSpent)} dari {formatIDR(budget)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? "bg-rose-500" : (percentSpent ?? 0) > 85 ? "bg-amber-500" : "bg-[#007aff]"
                }`}
                style={{ width: `${Math.min(percentSpent ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
              <span>Terbayar: {formatIDR(paidSpent)}</span>
              <span>Tertunda: {formatIDR(unpaidSpent)}</span>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {/* 2. EXPENSES LIST */}
      <div className="apple-card p-5 md:p-6 border border-border shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">
              Catatan Pengeluaran ({filteredExpenses.length})
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Daftar transaksi vendor, logistik, dan operasional
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => {
                setEditingExpense(null);
                setIsModalOpen(true);
              }}
              className="apple-btn-primary px-3.5 py-2 text-xs font-semibold gap-1.5 self-start sm:self-auto shadow-md shadow-[#007aff]/30"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tambah Pengeluaran</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          <span className="text-[11px] font-bold text-muted-foreground mr-1">Kategori:</span>
          {["all", "Vendor", "Logistics", "F&B", "Others"].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                catFilter === c
                  ? "bg-[#007aff] text-white border-[#007aff]"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c === "all" ? "Semua" : c}
            </button>
          ))}

          <span className="text-[11px] font-bold text-muted-foreground ml-2 mr-1">Status:</span>
          {["all", "Paid", "Unpaid"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === s
                  ? "bg-[#007aff] text-white border-[#007aff]"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {s === "all" ? "Semua" : s === "Paid" ? "Lunas" : "Belum Bayar"}
            </button>
          ))}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Receipt className="w-8 h-8 mx-auto opacity-40 text-muted-foreground" />
            <p className="text-xs font-medium">Belum ada catatan pengeluaran.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="pb-2.5 font-bold">Tanggal</th>
                  <th className="pb-2.5 font-bold">Kategori</th>
                  <th className="pb-2.5 font-bold">Keterangan</th>
                  <th className="pb-2.5 font-bold text-center">Status</th>
                  <th className="pb-2.5 font-bold text-right">Nominal</th>
                  {canManage && <th className="pb-2.5 font-bold text-right pr-2">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((exp) => {
                  const catMeta = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Others;
                  return (
                    <tr key={exp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 text-muted-foreground font-medium whitespace-nowrap">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badge}`}>
                          {catMeta.label}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-foreground max-w-xs truncate">
                        {exp.notes || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        {canManage ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(exp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-transform cursor-pointer active:scale-95 ${
                              exp.status === "Paid"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-[#30d158] border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {exp.status === "Paid" ? <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> : <Clock className="w-3 h-3 stroke-[2.5]" />}
                            <span>{exp.status === "Paid" ? "Lunas" : "Belum Bayar"}</span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              exp.status === "Paid"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-[#30d158] border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {exp.status === "Paid" ? <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> : <Clock className="w-3 h-3 stroke-[2.5]" />}
                            <span>{exp.status === "Paid" ? "Lunas" : "Belum Bayar"}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-foreground whitespace-nowrap">
                        {formatIDR(exp.amount)}
                      </td>
                      {canManage && (
                        <td className="py-3 text-right whitespace-nowrap pr-2">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(exp);
                                setIsModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingExpense(exp)}
                              className="p-1 rounded-lg text-rose-500/80 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Hapus Pengeluaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        eventId={event.id}
        expense={editingExpense}
        onSubmit={handleModalSubmit}
        isPending={isPending}
      />

      <ConfirmModal
        isOpen={!!deletingExpense}
        title="Konfirmasi Hapus Pengeluaran"
        itemName={deletingExpense ? `${deletingExpense.category} - ${formatIDR(deletingExpense.amount)}` : undefined}
        onConfirm={confirmDelete}
        onClose={() => setDeletingExpense(null)}
      />
    </div>
  );
}
