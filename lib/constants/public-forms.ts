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
      { id: "name", label: "Nama Lengkap", required: true },
      { id: "role", label: "Hubungan / Peran", required: true },
      { id: "phone", label: "No. WhatsApp / HP", required: false },
      { id: "address", label: "Alamat Lengkap", required: false },
      { id: "notes", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "bride_family",
    name: "Keluarga Bride (Mempelai Wanita)",
    description: "Keluarga inti & perwakilan keluarga besar dari pihak mempelai wanita",
    fields: [
      { id: "name", label: "Nama Lengkap", required: true },
      { id: "role", label: "Hubungan / Peran", required: true },
      { id: "phone", label: "No. WhatsApp / HP", required: false },
      { id: "address", label: "Alamat Lengkap", required: false },
      { id: "notes", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "photo_reps",
    name: "Wakil Foto & Sesi Foto",
    description: "Daftar perwakilan atau kelompok tamu untuk sesi foto panggung & VIP",
    fields: [
      { id: "name", label: "Nama Lengkap / Grup", required: true },
      { id: "role", label: "Hubungan / Peran", required: true },
      { id: "phone", label: "No. WhatsApp / HP", required: false },
      { id: "notes", label: "Catatan Khusus", required: false },
    ],
  },
  {
    id: "vip_family",
    name: "Tamu Kehormatan & VIP Keluarga",
    description: "Kakek, nenek, sesepuh, dan tamu keluarga penting lainnya",
    fields: [
      { id: "name", label: "Nama Lengkap", required: true },
      { id: "role", label: "Hubungan / Gelar", required: true },
      { id: "phone", label: "No. WhatsApp / HP", required: false },
      { id: "notes", label: "Catatan Khusus", required: false },
    ],
  },
];
