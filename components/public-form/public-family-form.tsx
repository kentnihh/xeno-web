"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Phone,
  User,
  Heart,
  Camera,
  Crown,
  ChevronRight,
  AlertCircle,
  Loader2,
  Share2,
  Check,
} from "lucide-react";
import { submitPublicFormData } from "@/app/(dashboard)/events/public-form-actions";
import { formatDate } from "@/lib/utils";
import type { EventPublicForm, FormCategorySchema, EventFormData, FormMember } from "@/types/database";

interface PublicFamilyFormProps {
  form: EventPublicForm;
  token: string;
  event: {
    id: string;
    title: string;
    venue: string;
    start_date: string;
    end_date: string;
  };
}

interface MemberItem {
  id?: string;
  name: string;
  role: string;
  phone: string;
  notes: string;
}

interface CategoryGroupItem {
  categoryId: string;
  title: string;
  description?: string;
  members: MemberItem[];
}

interface FormValues {
  categories: CategoryGroupItem[];
}

export function PublicFamilyForm({ form, token, event }: PublicFamilyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 100% data-driven categories from database schema
  const categories: FormCategorySchema[] = (
    Array.isArray(form.form_schema) ? form.form_schema : []
  ).map((cat, idx) => ({
    ...cat,
    id: cat.id || String(idx + 1),
    title: (cat.title || cat.name || `Kategori ${idx + 1}`).trim(),
    name: (cat.name || cat.title || `Kategori ${idx + 1}`).trim(),
  }));

  // Initialize default form values matching the dynamic category array
  const defaultValues: FormValues = {
    categories: categories.map((cat, idx) => {
      let existingList: FormMember[] = [];
      if (form.form_data) {
        if (Array.isArray(form.form_data[cat.id])) {
          existingList = form.form_data[cat.id];
        } else if (cat.title && Array.isArray(form.form_data[cat.title])) {
          existingList = form.form_data[cat.title];
        } else if (cat.name && Array.isArray(form.form_data[cat.name])) {
          existingList = form.form_data[cat.name];
        } else if (Array.isArray((form.form_data as any).categories)) {
          const found = (form.form_data as any).categories.find(
            (c: any) =>
              c.categoryId === cat.id ||
              c.id === cat.id ||
              c.title === cat.title ||
              c.name === cat.name
          );
          if (found && Array.isArray(found.members)) {
            existingList = found.members;
          }
        }
      }

      const members: MemberItem[] =
        existingList.length > 0
          ? existingList.map((m) => ({
              id:
                m.id ||
                (typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : String(Math.random())),
              name: m.name || (m as any).nama || "",
              role: m.role || (m as any).hubungan || "",
              phone: m.phone || (m as any).no_hp || "",
              notes: m.notes || (m as any).catatan || "",
            }))
          : [{ name: "", role: "", phone: "", notes: "" }];

      return {
        categoryId: cat.id,
        title: cat.title || cat.name || `Kategori ${idx + 1}`,
        description: cat.description || "",
        members,
      };
    }),
  };

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Clean up values: map into dynamic dictionary keyed by category ID
      const cleanedData: EventFormData = {};
      let totalFilled = 0;

      (values.categories || []).forEach((catGroup) => {
        const catId = catGroup.categoryId;
        const validMembers: FormMember[] = (catGroup.members || [])
          .filter((item) => item.name.trim() !== "" || item.role.trim() !== "")
          .map((item) => ({
            id:
              item.id ||
              (typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now() + Math.random())),
            name: item.name.trim(),
            role: item.role.trim(),
            phone: item.phone?.trim() || "",
            notes: item.notes?.trim() || "",
          }));

        cleanedData[catId] = validMembers;
        totalFilled += validMembers.length;
      });

      if (totalFilled === 0) {
        setErrorMessage("Mohon isi setidaknya satu nama anggota keluarga sebelum menyimpan formulir.");
        setIsSubmitting(false);
        return;
      }

      const res = await submitPublicFormData(token, cleanedData);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menyimpan data keluarga.");
      } else {
        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(err?.message || "Terjadi kendala saat menyimpan. Mohon periksa koneksi internet Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formattedExpiry = new Date(form.expires_at).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Success Confirmation Screen
  if (submitSuccess) {
    const currentValues = watch();
    let totalMembersCount = 0;
    (currentValues.categories || []).forEach((c) => {
      totalMembersCount += (c.members || []).filter(
        (m) => m && m.name && m.name.trim() !== ""
      ).length;
    });

    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-xl p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Terkirim & Tersimpan
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Terima Kasih atas Kelengkapan Datanya!
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Data keluarga untuk acara <strong>{event.title}</strong> telah berhasil disimpan secara aman ke dalam sistem Xeno Entertainment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-left">
              <div className="text-[11px] text-muted-foreground">Total Anggota</div>
              <div className="text-base font-bold text-foreground mt-0.5">{totalMembersCount} Orang</div>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-left">
              <div className="text-[11px] text-muted-foreground">Total Kategori</div>
              <div className="text-base font-bold text-foreground mt-0.5">
                {categories.length} Kelompok
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Data ini telah tersinkronisasi langsung dengan Master Sheet dan tim Wedding Organizer Xeno Entertainment.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setSubmitSuccess(false)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            >
              Ubah atau Tambah Data
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Tautan Disalin" : "Bagikan Tautan"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty Schema State (Organizer hasn't created any categories yet)
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-foreground py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Users className="w-6 h-6 text-[#007aff]" />
          </div>
          <h2 className="text-base font-bold text-foreground">Belum Ada Kategori Formulir</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Penyelenggara acara belum menambahkan kategori keluarga untuk formulir ini. Silakan hubungi tim Wedding Organizer Xeno Entertainment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Branding Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#007aff] via-[#5e5ce6] to-[#bf5af2]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#007aff]/10 text-[#007aff]">
                  Xeno Entertainment
                </span>
                <span className="text-xs text-muted-foreground">• Formulir Pendataan Tamu</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {event.title}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer active:scale-95"
              title="Salin tautan formulir"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Tersalin!" : "Salin Link"}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground border-t border-border">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#007aff]" />
              <span>{event.venue || "Venue belum ditentukan"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#007aff]" />
              <span>{formatDate(event.start_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Batas pengisian: {formattedExpiry}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            Silakan lengkapi daftar keluarga dan perwakilan pada kategori di bawah ini. Anda dapat menambahkan anggota sebanyak yang dibutuhkan dengan menekan tombol <strong>+ Tambah Anggota</strong>.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Form with React Hook Form & useFieldArray mapped over database schema */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {categories.map((category, catIdx) => (
            <CategoryFieldArrayGroup
              key={category.id || catIdx}
              category={category}
              catIndex={catIdx}
              control={control}
              register={register}
              errors={errors}
            />
          ))}

          {/* Sticky / Pinned Submit Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-4 z-20">
            <div className="text-xs text-muted-foreground">
              Pastikan nama dan nomor kontak sudah sesuai sebelum mengirimkan data.
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#007aff] hover:bg-[#0066d6] text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Sistem...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Kirim Data Keluarga</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Category Group rendering with useFieldArray on categories.${catIndex}.members
 */
function CategoryFieldArrayGroup({
  category,
  catIndex,
  control,
  register,
  errors,
}: {
  category: FormCategorySchema;
  catIndex: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: any;
}) {
  // Configured with dynamic categories.${catIndex}.members
  const { fields, append, remove } = useFieldArray({
    control,
    name: `categories.${catIndex}.members`,
  });

  const getCategoryIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("groom") || lower.includes("pria")) return <Crown className="w-4 h-4 text-blue-500" />;
    if (lower.includes("bride") || lower.includes("wanita")) return <Heart className="w-4 h-4 text-pink-500" />;
    if (lower.includes("foto") || lower.includes("photo")) return <Camera className="w-4 h-4 text-emerald-500" />;
    if (lower.includes("saksi")) return <Sparkles className="w-4 h-4 text-amber-500" />;
    return <Users className="w-4 h-4 text-[#007aff]" />;
  };

  const title = category.title || category.name || `Kategori ${catIndex + 1}`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
      {/* Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-muted">{getCategoryIcon(title + " " + category.id)}</div>
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {category.description && (
              <p className="text-xs text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {fields.length} Anggota
        </span>
      </div>

      {/* Dynamic Member Inputs List */}
      <div className="space-y-3">
        {fields.map((field, memberIdx) => {
          return (
            <div
              key={field.id}
              className="p-4 rounded-xl bg-muted/30 border border-border/70 hover:border-border transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-foreground font-bold">
                    {memberIdx + 1}
                  </span>
                  <span>Data Anggota</span>
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(memberIdx)}
                    className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                    title="Hapus baris ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Grid of inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Contoh: Bpk. Bambang Wijaya"
                      {...register(`categories.${catIndex}.members.${memberIdx}.name` as const)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                    />
                  </div>
                </div>

                {/* Peran / Hubungan */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Hubungan / Peran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ayah Kandung / Saksi / Paman"
                    {...register(`categories.${catIndex}.members.${memberIdx}.role` as const)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                  />
                </div>

                {/* Nomor WhatsApp / HP */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    No. WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      {...register(`categories.${catIndex}.members.${memberIdx}.phone` as const)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan / Kebutuhan Khusus */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Catatan Khusus / Permintaan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Memerlukan kursi roda / Duduk di baris depan"
                  {...register(`categories.${catIndex}.members.${memberIdx}.notes` as const)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic "+ Tambah Anggota" Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => append({ name: "", role: "", phone: "", notes: "" })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#007aff]" />
          <span>+ Tambah Anggota</span>
        </button>
      </div>
    </div>
  );
}
