import type { FormCategorySchema } from "@/types/database";

/**
 * Default categories for wedding / event family data collection
 */
export const DEFAULT_PUBLIC_FORM_SCHEMA: FormCategorySchema[] = [
  {
    id: "groom_family",
    name: "Keluarga Groom (Mempelai Pria)",
    description: "Keluarga inti & perwakilan keluarga besar dari pihak mempelai pria",
  },
  {
    id: "bride_family",
    name: "Keluarga Bride (Mempelai Wanita)",
    description: "Keluarga inti & perwakilan keluarga besar dari pihak mempelai wanita",
  },
  {
    id: "photo_reps",
    name: "Wakil Foto & Sesi Foto",
    description: "Daftar perwakilan atau kelompok tamu untuk sesi foto panggung & VIP",
  },
  {
    id: "vip_family",
    name: "Tamu Kehormatan & VIP Keluarga",
    description: "Kakek, nenek, sesepuh, dan tamu keluarga penting lainnya",
  },
];
