"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";
import { formatIDR } from "@/lib/utils";
import {
  assignEventVendor,
  createAndAssignVendor,
  removeEventVendor,
} from "@/app/(dashboard)/events/actions";
import { AssignVendorModal } from "./assign-vendor-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { EventVendor, Vendor, VendorStatus } from "@/types/database";

const STATUS_BADGES: Record<VendorStatus, { label: string; cls: string }> = {
  proposed: { label: "Penawaran", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold" },
  contracted: { label: "Kontrak", cls: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30 font-bold" },
  paid: { label: "Lunas", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold" },
};

export function EventVendorsSection({
  eventId,
  initialEventVendors,
  allVendors,
  canManage = true,
}: {
  eventId: string;
  initialEventVendors: EventVendor[];
  allVendors: Vendor[];
  canManage?: boolean;
}) {
  const [eventVendors, setEventVendors] = useState<EventVendor[]>(initialEventVendors);
  const [vendorsPool, setVendorsPool] = useState<Vendor[]>(allVendors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState<EventVendor | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignedVendorIds = new Set(eventVendors.map((ev) => ev.vendor_id));
  const totalVendorCost = eventVendors.reduce((acc, ev) => acc + (Number(ev.cost) || 0), 0);

  const handleAssignExisting = (fd: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await assignEventVendor(fd);
      if (res.success && res.eventVendor) {
        setEventVendors((prev) => {
          const filtered = prev.filter((item) => item.vendor_id !== res.eventVendor!.vendor_id);
          return [...filtered, res.eventVendor!];
        });
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.error || "Gagal menugaskan vendor.");
      }
    });
  };

  const handleCreateAndAssign = (fd: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createAndAssignVendor(fd);
      if (res.success && res.eventVendor) {
        setEventVendors((prev) => [...prev, res.eventVendor!]);
        if (res.eventVendor.vendor) {
          setVendorsPool((prev) => [...prev, res.eventVendor!.vendor!]);
        }
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.error || "Gagal membuat dan menugaskan vendor baru.");
      }
    });
  };

  const confirmRemove = async () => {
    if (!deletingVendor) return;
    const target = deletingVendor;
    setEventVendors((prev) => prev.filter((ev) => ev.id !== target.id));

    const res = await removeEventVendor(target.id, eventId);
    if (!res.success) {
      setEventVendors((prev) => [...prev, target]);
      throw new Error(res.error || "Gagal menghapus penugasan vendor.");
    }
  };

  return (
    <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#30d158]" />
          <h2 className="text-sm font-bold text-foreground">Vendor Mitra Terlibat</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {eventVendors.length}
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Hubungkan Vendor</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Vendor Cards List */}
      <div className="space-y-2.5">
        {eventVendors.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl space-y-1 font-medium">
            <p>Belum ada vendor eksternal yang dihubungkan ke acara ini.</p>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[#007aff] hover:underline cursor-pointer font-bold"
              >
                Pilih atau daftarkan vendor sekarang
              </button>
            )}
          </div>
        ) : (
          eventVendors.map((ev) => {
            const vendor = ev.vendor;
            const statusBadge = STATUS_BADGES[ev.status] || STATUS_BADGES.proposed;

            return (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-card border border-border hover:border-[#007aff] transition-colors space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{vendor?.name || "Vendor Mitra"}</span>
                      {vendor?.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30 font-bold">
                          {vendor.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">{ev.service_name}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-600 dark:text-[#30d158]">{formatIDR(Number(ev.cost) || 0)}</div>
                    <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {ev.notes && (
                  <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded-lg border border-border font-medium">
                    {ev.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border text-[10px] text-muted-foreground font-medium">
                  <div className="flex items-center gap-3">
                    {vendor?.pic_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#007aff]" />
                        PIC: {vendor.pic_name}
                      </span>
                    )}
                    {vendor?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {vendor.phone}
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setDeletingVendor(ev)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Hapus Vendor dari Acara"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      {eventVendors.length > 0 && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Biaya Vendor Kontrak:</span>
          <span className="font-bold text-emerald-400">{formatIDR(totalVendorCost)}</span>
        </div>
      )}

      {/* Assign / Create Vendor Modal */}
      <AssignVendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={eventId}
        availableVendors={vendorsPool}
        assignedVendorIds={assignedVendorIds}
        onAssignExisting={handleAssignExisting}
        onCreateAndAssign={handleCreateAndAssign}
        isPending={isPending}
      />

      <ConfirmModal
        isOpen={!!deletingVendor}
        title="Konfirmasi Hapus Penugasan Vendor"
        itemName={deletingVendor?.vendor?.name || "Vendor"}
        message={deletingVendor ? `Apakah Anda yakin ingin menghapus penugasan vendor "${deletingVendor.vendor?.name || "Vendor"}" dari acara ini?` : undefined}
        onConfirm={confirmRemove}
        onClose={() => setDeletingVendor(null)}
      />
    </div>
  );
}

