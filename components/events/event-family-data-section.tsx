"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Users,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Phone,
  MessageCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Heart,
  Crown,
  Camera,
  ChevronDown,
  ChevronUp,
  X,
  Share2,
  Settings,
} from "lucide-react";
import {
  getOrCreateEventPublicForm,
  regeneratePublicFormToken,
  updatePublicFormExpiry,
  updatePublicFormDataAdmin,
  applyMasterFamilyTemplateToEvent,
} from "@/app/(dashboard)/events/public-form-actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toSnakeCase } from "@/lib/utils";
import type { EventPublicForm, EventFormData, FormMember, FormCategorySchema } from "@/types/database";

interface EventFamilyDataSectionProps {
  eventId: string;
  initialForm?: EventPublicForm | null;
  canManage?: boolean;
  variant?: "full" | "embedded";
}

export function EventFamilyDataSection({
  eventId,
  initialForm,
  canManage = true,
  variant = "full",
}: EventFamilyDataSectionProps) {
  const [form, setForm] = useState<EventPublicForm | null>(initialForm || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Link & Copy State
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);

  // Expiration State
  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [customExpiry, setCustomExpiry] = useState<string>("");
  const [showExpiryEdit, setShowExpiryEdit] = useState(false);

  // Category Modal State (Add / Rename)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FormCategorySchema | null>(null);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Deleting Category State
  const [deletingCategoryInfo, setDeletingCategoryInfo] = useState<{
    catId: string;
    title: string;
  } | null>(null);

  // Apply Master Template State
  const [confirmApplyTemplateOpen, setConfirmApplyTemplateOpen] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Member Modal State
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<FormMember | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberNotes, setMemberNotes] = useState("");
  const [memberModalError, setMemberModalError] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Deleting Member State
  const [deletingMemberInfo, setDeletingMemberInfo] = useState<{
    catId: string;
    memberId: string;
    memberName: string;
  } | null>(null);

  const [, startTransition] = useTransition();

  // Load or sync form data if not passed or when eventId changes
  useEffect(() => {
    let active = true;
    if (!form || form.event_id !== eventId) {
      setIsLoading(true);
      getOrCreateEventPublicForm(eventId)
        .then((data) => {
          if (active) {
            setForm(data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setErrorMessage(err?.message || "Gagal memuat formulir publik.");
            setIsLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [eventId]);

  // Set custom expiry initial input when form is available
  useEffect(() => {
    if (form?.expires_at) {
      try {
        const d = new Date(form.expires_at);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setCustomExpiry(localIso);
      } catch {
        // ignore format error
      }
    }
  }, [form?.expires_at]);

  const showFeedback = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // 100% data-driven categories mapped directly from the database schema
  const categories: FormCategorySchema[] = (
    Array.isArray(form?.form_schema) ? form.form_schema : []
  ).map((cat, idx) => ({
    ...cat,
    id: cat.id || String(idx + 1),
    title: (cat.title || cat.name || `Kategori ${idx + 1}`).trim(),
    name: (cat.name || cat.title || `Kategori ${idx + 1}`).trim(),
  }));

  const formData: EventFormData = form?.form_data || {};

  const publicUrl =
    typeof window !== "undefined" && form?.token
      ? `${window.location.origin}/p/${form.token}`
      : form?.token
      ? `/p/${form.token}`
      : "";

  const isExpired = form ? new Date() > new Date(form.expires_at) : false;

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    showFeedback("Tautan formulir berhasil disalin ke papan klip!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!canManage) return;
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const updated = await regeneratePublicFormToken(eventId);
      setForm(updated);
      setConfirmRegenOpen(false);
      showFeedback("Tautan formulir baru berhasil dibuat dengan masa berlaku 3 hari!");
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal membuat tautan baru.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExtendDays = async (days: number) => {
    if (!canManage || !form) return;
    setIsUpdatingExpiry(true);
    try {
      const baseDate = isExpired ? new Date() : new Date(form.expires_at);
      const newDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      const updated = await updatePublicFormExpiry(eventId, newDate);
      setForm(updated);
      setShowExpiryEdit(false);
      showFeedback(`Masa berlaku tautan berhasil diperpanjang +${days} hari!`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal memperpanjang masa berlaku.");
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const handleSaveCustomExpiry = async () => {
    if (!canManage || !customExpiry) return;
    setIsUpdatingExpiry(true);
    try {
      const newIso = new Date(customExpiry).toISOString();
      const updated = await updatePublicFormExpiry(eventId, newIso);
      setForm(updated);
      setShowExpiryEdit(false);
      showFeedback("Masa berlaku tautan berhasil diperbarui!");
    } catch (err: any) {
      setErrorMessage(err?.message || "Tanggal tidak valid.");
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  // --- CATEGORY ACTIONS ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryTitle("");
    setCategoryDesc("");
    setCategoryModalError(null);
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: FormCategorySchema) => {
    setEditingCategory(cat);
    setCategoryTitle(cat.title || cat.name || "");
    setCategoryDesc(cat.description || "");
    setCategoryModalError(null);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryTitle.trim()) {
      setCategoryModalError("Nama / Judul Kategori wajib diisi.");
      return;
    }
    setIsSavingCategory(true);
    setCategoryModalError(null);

    try {
      let updatedCategories: FormCategorySchema[] = [];
      if (editingCategory) {
        updatedCategories = categories.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                title: categoryTitle.trim(),
                name: categoryTitle.trim(),
                description: categoryDesc.trim(),
              }
            : c
        );
      } else {
        const slug =
          categoryTitle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .slice(0, 24) || "kategori";
        const newId = `${slug}_${Date.now().toString().slice(-4)}`;
        const newCat: FormCategorySchema = {
          id: newId,
          title: categoryTitle.trim(),
          name: categoryTitle.trim(),
          description: categoryDesc.trim(),
          fields: [
            { id: "name", label: "Nama Lengkap", required: false },
            { id: "role", label: "Hubungan / Peran", required: false },
            { id: "phone", label: "No. WhatsApp / HP", required: false },
            { id: "notes", label: "Catatan Khusus", required: false },
          ],
        };
        updatedCategories = [...categories, newCat];
      }

      const updated = await updatePublicFormDataAdmin(eventId, formData, updatedCategories);
      setForm(updated);
      setCategoryModalOpen(false);
      showFeedback(
        editingCategory
          ? `Kategori "${categoryTitle}" berhasil diperbarui!`
          : `Kategori "${categoryTitle}" berhasil ditambahkan!`
      );
    } catch (err: any) {
      setCategoryModalError(err?.message || "Gagal menyimpan kategori.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategoryInfo || !form) return;
    const { catId, title } = deletingCategoryInfo;

    try {
      const updatedCategories = categories.filter((c) => c.id !== catId);
      const updatedFormData = { ...formData };
      delete updatedFormData[catId];

      const updated = await updatePublicFormDataAdmin(eventId, updatedFormData, updatedCategories);
      setForm(updated);
      setDeletingCategoryInfo(null);
      showFeedback(`Kategori "${title}" dan seluruh anggotanya berhasil dihapus.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menghapus kategori.");
    }
  };

  const handleApplyMasterTemplate = async () => {
    setIsApplyingTemplate(true);
    try {
      const updated = await applyMasterFamilyTemplateToEvent(eventId, true);
      setForm(updated);
      setConfirmApplyTemplateOpen(false);
      showFeedback("Master template data keluarga berhasil diterapkan ke acara ini!");
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menerapkan master template.");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // --- MEMBER ACTIONS ---
  const handleOpenAddMember = (catId: string) => {
    setTargetCategory(catId);
    setEditingMember(null);
    setMemberName("");
    setMemberRole("");
    setMemberPhone("");
    setMemberNotes("");
    setMemberModalError(null);
    setMemberModalOpen(true);
  };

  const handleOpenEditMember = (catId: string, member: FormMember) => {
    setTargetCategory(catId);
    setEditingMember(member);
    setMemberName(member.name);
    setMemberRole(member.role || "");
    setMemberPhone(member.phone || "");
    setMemberNotes(member.notes || "");
    setMemberModalError(null);
    setMemberModalOpen(true);
  };

  const handleSaveMember = async () => {
    if (!targetCategory || !form) return;
    if (!memberName.trim()) {
      setMemberModalError("Nama anggota wajib diisi.");
      return;
    }

    setIsSavingMember(true);
    setMemberModalError(null);

    try {
      const currentCategoryList = [...(formData[targetCategory] || [])];
      let updatedCategoryList: FormMember[];

      if (editingMember) {
        updatedCategoryList = currentCategoryList.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                name: memberName.trim(),
                role: memberRole.trim(),
                phone: memberPhone.trim(),
                notes: memberNotes.trim(),
              }
            : m
        );
      } else {
        const newMember: FormMember = {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now() + Math.random()),
          name: memberName.trim(),
          role: memberRole.trim(),
          phone: memberPhone.trim(),
          notes: memberNotes.trim(),
        };
        updatedCategoryList = [...currentCategoryList, newMember];
      }

      const updatedFormData: EventFormData = {
        ...formData,
        [targetCategory]: updatedCategoryList,
      };

      const updated = await updatePublicFormDataAdmin(eventId, updatedFormData);
      setForm(updated);
      setMemberModalOpen(false);
      showFeedback(
        editingMember
          ? `Data ${memberName} berhasil diperbarui!`
          : `Anggota ${memberName} berhasil ditambahkan!`
      );
    } catch (err: any) {
      setMemberModalError(err?.message || "Gagal menyimpan data anggota.");
    } finally {
      setIsSavingMember(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!deletingMemberInfo || !form) return;
    const { catId, memberId, memberName } = deletingMemberInfo;

    try {
      const currentCategoryList = formData[catId] || [];
      const updatedCategoryList = currentCategoryList.filter(
        (m, i) => (m.id || String(i)) !== memberId
      );
      const updatedFormData: EventFormData = {
        ...formData,
        [catId]: updatedCategoryList,
      };

      const updated = await updatePublicFormDataAdmin(eventId, updatedFormData);
      setForm(updated);
      setDeletingMemberInfo(null);
      showFeedback(`Anggota ${memberName} telah dihapus.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menghapus anggota.");
    }
  };

  const getCategoryIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("groom") || lower.includes("pria")) return <Crown className="w-4 h-4 text-blue-500" />;
    if (lower.includes("bride") || lower.includes("wanita")) return <Heart className="w-4 h-4 text-pink-500" />;
    if (lower.includes("foto") || lower.includes("photo")) return <Camera className="w-4 h-4 text-emerald-500" />;
    if (lower.includes("saksi")) return <Sparkles className="w-4 h-4 text-amber-500" />;
    return <Users className="w-4 h-4 text-[#007aff]" />;
  };

  const getCategoryMembers = (cat: FormCategorySchema): FormMember[] => {
    return (
      formData[cat.id] ||
      formData[cat.name] ||
      formData[cat.title || ""] ||
      formData[toSnakeCase(cat.id || "")] ||
      formData[toSnakeCase(cat.title || cat.name || "")] ||
      []
    );
  };

  const calculateTotalMembers = () => {
    let count = 0;
    categories.forEach((cat) => {
      count += getCategoryMembers(cat).length;
    });
    return count;
  };

  const totalMembers = calculateTotalMembers();

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#007aff] mx-auto" />
        <p className="text-xs text-muted-foreground">Memuat data keluarga acara...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 text-rose-600 hover:text-rose-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. MANAGEMENT HEADER */}
      <div className="bg-card rounded-2xl border border-border shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#007aff]" />
                {variant === "embedded" ? "Data Keluarga & Tamu Acara" : "Manajemen Data Keluarga"}
              </span>
              <span className="text-muted-foreground">•</span>
              {isExpired ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Tautan Kadaluarsa
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Tautan Aktif
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                {categories.length} Kategori • {totalMembers} Anggota
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Formulir publik dinamis untuk klien mengisi data keluarga inti, saksi, keluarga besar, dan perwakilan sesi foto.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Tambah kategori baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kategori</span>
              </button>
            )}

            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer"
                title="Buka form di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#007aff]" />
                <span>Buka Form</span>
              </a>
            )}

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmApplyTemplateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer"
                  title="Terapkan kategori dari Master Template"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Master Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmRegenOpen(true)}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer"
                  title="Buat token baru (mengganti link lama)"
                >
                  {isRegenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>Reset Link</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Public Link Box with Copy Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="w-full pl-3 pr-20 py-2 text-xs rounded-xl border border-input bg-muted/40 font-mono text-muted-foreground select-all focus:outline-none"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground uppercase font-mono">
              3-DAY TOKEN
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Tersalin!" : "Salin Tautan"}</span>
          </button>
        </div>

        {/* Expiration Controls Bar */}
        {form && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-[#007aff]" />
              <span>
                Masa berlaku hingga:{" "}
                <strong className="text-foreground">
                  {new Date(form.expires_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
              </span>
            </div>

            {canManage && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground mr-1">Perpanjang:</span>
                <button
                  type="button"
                  onClick={() => handleExtendDays(3)}
                  disabled={isUpdatingExpiry}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  +3 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendDays(7)}
                  disabled={isUpdatingExpiry}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  +7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpiryEdit(!showExpiryEdit)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-[#007aff] border border-border/80 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Kustom</span>
                  {showExpiryEdit ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Expiry Input Drawer */}
        {showExpiryEdit && canManage && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-150">
            <div className="text-xs text-muted-foreground whitespace-nowrap">Pilih Tanggal & Waktu:</div>
            <input
              type="datetime-local"
              value={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-[#007aff]"
            />
            <button
              type="button"
              onClick={handleSaveCustomExpiry}
              disabled={isUpdatingExpiry}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              {isUpdatingExpiry && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Simpan Tanggal</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. DYNAMIC CATEGORY CARDS (100% DATA-DRIVEN FROM SCHEMA) */}
      {categories.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Users className="w-6 h-6 text-[#007aff]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-foreground">Belum Ada Kategori Data Keluarga</h3>
            <p className="text-xs text-muted-foreground">
              Formulir keluarga ini belum memiliki kategori. Buat kategori kustom (seperti "Saksi Pemberkatan", "Keluarga Inti", "Keluarga Groom") atau terapkan dari Master Template bawaan.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Kategori Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmApplyTemplateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Terapkan Master Template</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categories.map((category) => {
            const title = category.title || category.name;
            const members = getCategoryMembers(category);

            return (
              <div
                key={category.id}
                className="bg-card rounded-2xl border border-border shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-border/80 transition-all"
              >
                {/* Category Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-muted shrink-0">
                      {getCategoryIcon(title + " " + category.id)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-foreground truncate" title={title}>
                        {title}
                      </h3>
                      {category.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                      {members.length}
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAddMember(category.id)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer active:scale-95"
                          title="Tambah anggota ke kategori ini"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#007aff]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(category)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="Ubah Nama Kategori"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategoryInfo({ catId: category.id, title })}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all cursor-pointer"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Members List (Rows) */}
                <div className="space-y-2.5 flex-1 min-h-[90px]">
                  {members.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                      <p className="text-xs text-muted-foreground">Belum ada data anggota.</p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddMember(category.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#007aff] hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Anggota</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    members.map((member, idx) => {
                      const cleanPhone = member.phone?.replace(/[^0-9]/g, "");
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone}`
                        : null;

                      return (
                        <div
                          key={member.id || idx}
                          className="p-3 rounded-xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-all flex flex-col gap-1.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">
                                {member.name || member.role || "Tanpa Nama"}
                              </span>
                              {member.role && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 shrink-0">
                                  {member.role}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {canManage && (
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMember(category.id, member)}
                                  className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  title="Edit Anggota"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeletingMemberInfo({
                                      catId: category.id,
                                      memberId: member.id || String(idx),
                                      memberName: member.name,
                                    })
                                  }
                                  className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all cursor-pointer"
                                  title="Hapus Anggota"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Phone & Notes Details */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pl-7">
                            {member.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span>{member.phone}</span>
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 ml-0.5 inline-flex items-center"
                                    title="Chat WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {member.notes && (
                              <span className="italic text-muted-foreground bg-card px-2 py-0.5 rounded border border-border/50 text-[10px]">
                                {member.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Card Footer Button */}
                {canManage && members.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => handleOpenAddMember(category.id)}
                      className="w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-[#007aff]" />
                      <span>Tambah Anggota</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ADD / EDIT CATEGORY MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-[#007aff]" />
                <span>{editingCategory ? "Ubah Nama Kategori" : "Tambah Kategori Baru"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{categoryModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nama / Judul Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryTitle}
                  onChange={(e) => setCategoryTitle(e.target.value)}
                  placeholder="Contoh: Saksi Pemberkatan / Keluarga Inti / Tamu VIP"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Keterangan / Panduan Klien (Opsional)
                </label>
                <input
                  type="text"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Contoh: Daftar perwakilan saksi dari pihak pria & wanita"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD / EDIT MEMBER MODAL */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-[#007aff]" />
                <span>{editingMember ? "Edit Anggota Keluarga" : "Tambah Anggota Keluarga"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {memberModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberModalError}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Kategori
                </label>
                <select
                  value={targetCategory || ""}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Contoh: Bpk. Bambang Wijaya"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Hubungan / Peran
                </label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="Contoh: Ayah Kandung / Saksi / Paman"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  No. WhatsApp / HP (Opsional)
                </label>
                <input
                  type="tel"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catatan / Kebutuhan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  placeholder="Contoh: Kursi roda / Duduk di baris depan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveMember}
                disabled={isSavingMember}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingMember ? "Simpan Perubahan" : "Tambah Anggota"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE CATEGORY MODAL */}
      <ConfirmModal
        isOpen={!!deletingCategoryInfo}
        title="Konfirmasi Hapus Kategori"
        itemName={deletingCategoryInfo?.title}
        message={
          deletingCategoryInfo
            ? `Apakah Anda yakin ingin menghapus kategori "${deletingCategoryInfo.title}"? Seluruh data anggota keluarga di dalamnya juga akan terhapus.`
            : undefined
        }
        confirmLabel="Hapus Kategori"
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeletingCategoryInfo(null)}
      />

      {/* 6. CONFIRM APPLY MASTER TEMPLATE MODAL */}
      <ConfirmModal
        isOpen={confirmApplyTemplateOpen}
        title="Terapkan Master Template Data Keluarga?"
        itemName="Master Template"
        message="Struktur kategori pada acara ini akan diperbarui sesuai master template data keluarga yang telah diatur di Settings. Data anggota keluarga yang sudah ada akan tetap dipertahankan jika kuncinya sesuai."
        confirmLabel={isApplyingTemplate ? "Menerapkan..." : "Terapkan Template"}
        onConfirm={handleApplyMasterTemplate}
        onClose={() => setConfirmApplyTemplateOpen(false)}
      />

      {/* 7. CONFIRM DELETE MEMBER MODAL */}
      <ConfirmModal
        isOpen={!!deletingMemberInfo}
        title="Konfirmasi Hapus Anggota"
        itemName={deletingMemberInfo?.memberName}
        message={
          deletingMemberInfo
            ? `Apakah Anda yakin ingin menghapus data "${deletingMemberInfo.memberName}" dari daftar keluarga?`
            : undefined
        }
        confirmLabel="Hapus Anggota"
        onConfirm={confirmDeleteMember}
        onClose={() => setDeletingMemberInfo(null)}
      />

      {/* 8. CONFIRM REGENERATE TOKEN MODAL */}
      <ConfirmModal
        isOpen={confirmRegenOpen}
        title="Konfirmasi Reset Tautan Publik"
        itemName="Tautan Formulir Publik"
        message="Mereset tautan akan membuat token baru dengan masa berlaku 3 hari. Tautan lama yang sudah dibagikan sebelumnya tidak akan dapat diakses lagi. Lanjutkan?"
        confirmLabel="Buat Link Baru"
        onConfirm={handleRegenerateToken}
        onClose={() => setConfirmRegenOpen(false)}
      />
    </div>
  );
}
