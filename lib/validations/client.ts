import { z } from "zod";

export const clientEventTypeSchema = z.enum([
  "Wedding",
  "Birthday",
  "Corporate",
  "Social Event",
  "Lainnya",
]);

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Nama klien wajib diisi"),
  company: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  phone: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  email: z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? null : v),
    z.string().trim().email("Format email tidak valid").nullable().optional()
  ),
  address: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  notes: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  event_type: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  partner_name: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  partner_email: z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? null : v),
    z.string().trim().email("Format email mempelai 2 tidak valid").nullable().optional()
  ),
  partner_phone: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
  partner_address: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().nullable().optional()),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
