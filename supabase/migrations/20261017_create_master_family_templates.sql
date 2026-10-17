-- ==============================================================================
-- Supabase Migration: Create master_family_templates table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_family_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Master Template Data Keluarga',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.master_family_templates ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Staff / Admin Users
DROP POLICY IF EXISTS "Authenticated users can select master_family_templates" ON public.master_family_templates;
CREATE POLICY "Authenticated users can select master_family_templates"
  ON public.master_family_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert master_family_templates" ON public.master_family_templates;
CREATE POLICY "Authenticated users can insert master_family_templates"
  ON public.master_family_templates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update master_family_templates" ON public.master_family_templates;
CREATE POLICY "Authenticated users can update master_family_templates"
  ON public.master_family_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete master_family_templates" ON public.master_family_templates;
CREATE POLICY "Authenticated users can delete master_family_templates"
  ON public.master_family_templates FOR DELETE TO authenticated USING (true);

-- Seed initial master family template blueprint
INSERT INTO public.master_family_templates (name, categories, is_active)
SELECT 'Master Template Data Keluarga', '[
  {
    "id": "groom_family",
    "name": "Keluarga Groom (Mempelai Pria)",
    "description": "Keluarga inti & perwakilan keluarga besar Groom",
    "fields": [
      { "id": "name", "label": "Nama Lengkap", "required": true },
      { "id": "role", "label": "Hubungan / Peran", "required": true },
      { "id": "phone", "label": "No. WhatsApp / HP", "required": false },
      { "id": "address", "label": "Alamat Lengkap", "required": false },
      { "id": "notes", "label": "Catatan Khusus", "required": false }
    ]
  },
  {
    "id": "bride_family",
    "name": "Keluarga Bride (Mempelai Wanita)",
    "description": "Keluarga inti & perwakilan keluarga besar Bride",
    "fields": [
      { "id": "name", "label": "Nama Lengkap", "required": true },
      { "id": "role", "label": "Hubungan / Peran", "required": true },
      { "id": "phone", "label": "No. WhatsApp / HP", "required": false },
      { "id": "address", "label": "Alamat Lengkap", "required": false },
      { "id": "notes", "label": "Catatan Khusus", "required": false }
    ]
  },
  {
    "id": "photo_reps",
    "name": "Wakil Foto & Sesi Foto",
    "description": "Daftar perwakilan atau kelompok untuk foto bersama",
    "fields": [
      { "id": "name", "label": "Nama Lengkap / Grup", "required": true },
      { "id": "role", "label": "Hubungan / Peran", "required": true },
      { "id": "phone", "label": "No. WhatsApp / HP", "required": false },
      { "id": "notes", "label": "Catatan Khusus", "required": false }
    ]
  },
  {
    "id": "vip_family",
    "name": "Tamu Kehormatan & VIP Keluarga",
    "description": "Kakek, nenek, sesepuh, dan tamu keluarga penting lainnya",
    "fields": [
      { "id": "name", "label": "Nama Lengkap", "required": true },
      { "id": "role", "label": "Hubungan / Gelar", "required": true },
      { "id": "phone", "label": "No. WhatsApp / HP", "required": false },
      { "id": "notes", "label": "Catatan Khusus", "required": false }
    ]
  }
]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.master_family_templates);
