"use client";

import { useState } from "react";
import { ModalShell } from "@/components/users/modal-shell";
import { Search, Plus, Briefcase, Check, Loader2, Sparkles } from "lucide-react";
import type { Vendor, VendorStatus } from "@/types/database";

export function AssignVendorModal({
  isOpen,
  onClose,
  eventId,
  availableVendors,
  assignedVendorIds,
  onAssignExisting,
  onCreateAndAssign,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  availableVendors: Vendor[];
  assignedVendorIds: Set<string>;
  onAssignExisting: (formData: FormData) => void;
  onCreateAndAssign: (formData: FormData) => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const [serviceName, setServiceName] = useState("");
  const [status, setStatus] = useState<VendorStatus>("proposed");
  const [notes, setNotes] = useState("");

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Lighting");
  const [newPic, setNewPic] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  if (!isOpen) return null;

  const filteredVendors = availableVendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      v.pic_name.toLowerCase().includes(q)
    );
  });

  const selectedVendor = availableVendors.find((v) => v.id === selectedVendorId);

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendorId(vendor.id);
    if (!serviceName) setServiceName(`Layanan ${vendor.category}`);
  };

  const handleSwitchToCreate = (prefilledName?: string) => {
    setMode("create");
    if (prefilledName) setNewName(prefilledName);
  };

  const handleExistingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !serviceName.trim()) return;

    const fd = new FormData();
    fd.append("event_id", eventId);
    fd.append("vendor_id", selectedVendorId);
    fd.append("service_name", serviceName.trim());
    fd.append("status", status);
    if (notes.trim()) fd.append("notes", notes.trim());
    onAssignExisting(fd);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCategory.trim() || !newPic.trim() || !newPhone.trim()) return;

    const fd = new FormData();
    fd.append("event_id", eventId);
    fd.append("name", newName.trim());
    fd.append("category", newCategory.trim());
    fd.append("pic_name", newPic.trim());
    fd.append("phone", newPhone.trim());
    if (newEmail.trim()) fd.append("email", newEmail.trim());
    if (newAddress.trim()) fd.append("address", newAddress.trim());

    const effectiveService = serviceName.trim() || `Layanan ${newCategory.trim()}`;
    fd.append("service_name", effectiveService);
    fd.append("status", status);
    if (notes.trim()) fd.append("notes", notes.trim());

    onCreateAndAssign(fd);
  };

  return (
    <ModalShell
      title="Hubungkan Vendor ke Acara"
      subtitle="Pilih vendor mitra terdaftar atau daftarkan mitra baru di tempat"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "select" ? "bg-[#007aff] text-white shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pilih Vendor Terdaftar
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "create" ? "bg-[#007aff] text-white shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buat Vendor Baru</span>
          </button>
        </div>

        {mode === "select" ? (
          <form onSubmit={handleExistingSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Cari Vendor Mitra</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama vendor, kategori, atau PIC..."
                  className="apple-input w-full pl-9 pr-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-muted/60 border border-border p-1.5">
              {filteredVendors.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                  <p>Tidak ada vendor yang cocok.</p>
                  <button
                    type="button"
                    onClick={() => handleSwitchToCreate(searchQuery)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#007aff]/15 text-[#007aff] text-xs font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Buat Vendor &quot;{searchQuery}&quot;
                  </button>
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const isAlready = assignedVendorIds.has(vendor.id);
                  const isSel = selectedVendorId === vendor.id;
                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      disabled={isAlready}
                      onClick={() => handleSelectVendor(vendor)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSel
                          ? "bg-[#007aff]/15 border border-[#007aff]/40 text-foreground"
                          : isAlready
                          ? "opacity-40 cursor-not-allowed text-muted-foreground/40"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-2 text-foreground">
                          {vendor.name}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30">
                            {vendor.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          PIC: {vendor.pic_name} • {vendor.phone}
                        </div>
                      </div>
                      {isAlready ? <span className="text-[10px] text-muted-foreground/60">Ditugaskan</span> : isSel ? <Check className="w-4 h-4 text-[#007aff]" /> : null}
                    </button>
                  );
                })
              )}
            </div>

            {selectedVendor && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Terpilih: {selectedVendor.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  PIC {selectedVendor.pic_name} ({selectedVendor.phone})
                </div>
              </div>
            )}


            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Rincian Layanan / Paket *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="mis. Rigging 20kW, Moving Beam 350W..."
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Status Layanan Operasional</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorStatus)}
                  className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
                >
                  <option value="proposed" className="bg-card text-foreground">Proposed (Penawaran)</option>
                  <option value="contracted" className="bg-card text-foreground">Contracted (Terkonfirmasi)</option>
                  <option value="paid" className="bg-card text-foreground">Completed (Selesai / Aktif)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Catatan Teknis Operasional</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Termasuk teknisi standby..."
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!selectedVendorId || !serviceName.trim() || isPending}
                className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-40"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
                <span>Tugaskan Vendor</span>
              </button>
            </div>
          </form>
        ) : (


          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Vendor baru akan disimpan ke Master Data dan langsung dihubungkan ke acara ini.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Nama Vendor *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Prima Sound Stage"
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Kategori *</label>
                <input
                  type="text"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Sound, Lighting, Rigging"
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Nama PIC *</label>
                <input
                  type="text"
                  required
                  value={newPic}
                  onChange={(e) => setNewPic(e.target.value)}
                  placeholder="Budi Santoso"
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">No. Telepon / WA *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+62 812-..."
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="kontak@vendor.com"
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Alamat</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Jakarta Barat"
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <div className="text-[11px] font-semibold text-[#007aff] uppercase tracking-wider">Penugasan Layanan Acara</div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Rincian Layanan</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder={`Layanan ${newCategory || "Vendor"}`}
                  className="apple-input w-full px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Status Layanan Operasional</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorStatus)}
                  className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
                >
                  <option value="proposed" className="bg-card text-foreground">Proposed (Penawaran)</option>
                  <option value="contracted" className="bg-card text-foreground">Contracted (Terkonfirmasi)</option>
                  <option value="paid" className="bg-card text-foreground">Completed (Selesai / Aktif)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setMode("select")}
                disabled={isPending}
                className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-40"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Buat & Hubungkan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}

