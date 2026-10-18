import type { FormCategorySchema } from "@/types/database";

/**
 * Default categories and field blueprints for wedding / event family data collection
 */
export const DEFAULT_PUBLIC_FORM_SCHEMA: FormCategorySchema[] = [
  {
    id: "groom_family",
    name: "Keluarga Groom (Mempelai Pria)",
    description: "Keluarga inti & perwakilan keluarga besar dari pihak mempelai pria",
    fields: [
      { id: "nama_lengkap", label: "Nama Lengkap", required: false },
      { id: "hubungan_peran", label: "Hubungan / Peran", required: false },
      { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
      { id: "alamat_lengkap", label: "Alamat Lengkap", required: false },
      { id: "catatan_khusus", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "bride_family",
    name: "Keluarga Bride (Mempelai Wanita)",
    description: "Keluarga inti & perwakilan keluarga besar dari pihak mempelai wanita",
    fields: [
      { id: "nama_lengkap", label: "Nama Lengkap", required: false },
      { id: "hubungan_peran", label: "Hubungan / Peran", required: false },
      { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
      { id: "alamat_lengkap", label: "Alamat Lengkap", required: false },
      { id: "catatan_khusus", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "photo_reps",
    name: "Wakil Foto & Sesi Foto",
    description: "Daftar perwakilan atau kelompok tamu untuk sesi foto panggung & VIP",
    fields: [
      { id: "nama_lengkap", label: "Nama Lengkap / Grup", required: false },
      { id: "hubungan_peran", label: "Hubungan / Peran", required: false },
      { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
      { id: "catatan_khusus", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "vip_family",
    name: "Tamu Kehormatan & VIP Keluarga",
    description: "Kakek, nenek, sesepuh, dan tamu keluarga penting lainnya",
    fields: [
      { id: "nama_lengkap", label: "Nama Lengkap", required: false },
      { id: "hubungan_peran", label: "Hubungan / Gelar", required: false },
      { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
      { id: "catatan_khusus", label: "Catatan Khusus", required: false },
    ],
  },
];
