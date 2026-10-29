import { z } from "zod";

/**
 * Zod validation schema for Event Budget (Rencana Anggaran).
 * - Optional and nullable (not mandatory).
 * - When provided, value must be strictly greater than 0 (> 0).
 */
export const eventBudgetSchema = z
  .number({
    error: "Rencana anggaran harus berupa angka",
  })
  .gt(0, "Rencana anggaran harus lebih besar dari 0")
  .nullable()
  .optional();

/**
 * Coerces form inputs (empty string, string number, null, or number)
 * into a valid optional/nullable positive budget.
 */
export const eventBudgetInputSchema = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
}, eventBudgetSchema);

/**
 * Zod validation schema for Event Pax (Jumlah Undangan / Tamu).
 * - Optional and nullable (not mandatory).
 * - When provided, value must be non-negative (>= 0) integer.
 */
export const eventPaxSchema = z
  .number({
    error: "Jumlah undangan (pax) harus berupa angka",
  })
  .int("Jumlah undangan (pax) harus berupa bilangan bulat")
  .min(0, "Jumlah undangan (pax) tidak boleh negatif")
  .nullable()
  .optional();

/**
 * Coerces form inputs (empty string, string number, null, or number)
 * into a valid optional/nullable pax number.
 */
export const eventPaxInputSchema = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
}, eventPaxSchema);

/**
 * Complete Event Creation Validation Schema
 * Expenses and documents are purely optional with no minimum length required.
 */
export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Nama acara wajib diisi"),
  venue: z.string().trim().min(1, "Lokasi venue wajib diisi"),
  start_date: z.string().min(1, "Tanggal & waktu mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal & waktu selesai wajib diisi"),
  pic: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().trim().nullable().optional()),
  client_id: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().trim().nullable().optional()),
  pax: eventPaxInputSchema.optional(),
  use_template: z.preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (val === "true" || val === "on" || val === "1") return true;
    if (val === "false" || val === "off" || val === "0") return false;
    if (val === null || val === undefined) return false;
    return Boolean(val);
  }, z.boolean()).default(true),
  use_family_template: z.preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (val === "true" || val === "on" || val === "1") return true;
    if (val === "false" || val === "off" || val === "0") return false;
    if (val === null || val === undefined) return false;
    return Boolean(val);
  }, z.boolean()).default(true),
  budget: eventBudgetInputSchema.optional(),
  description: z.string().nullable().optional(),
  expenses: z.array(z.any()).nullable().optional().default([]),
  documents: z.array(z.any()).nullable().optional().default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Event Update Validation Schema
 * Matches event fields with PIC, client_id, and lifecycle status.
 */
export const updateEventSchema = z.object({
  id: z.string().min(1, "ID acara wajib diisi"),
  title: z.string().trim().min(1, "Nama acara wajib diisi"),
  venue: z.string().trim().min(1, "Lokasi venue wajib diisi"),
  start_date: z.string().min(1, "Tanggal & waktu mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal & waktu selesai wajib diisi"),
  status: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.enum(["draft", "planning", "confirmed", "ongoing", "completed", "cancelled"]).nullable().optional()
  ),
  pic: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().trim().nullable().optional()),
  client_id: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().trim().nullable().optional()),
  pax: eventPaxInputSchema.optional(),
  budget: eventBudgetInputSchema.optional(),
  description: z.string().nullable().optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Zod validation schema for Event Expense.
 */
export const eventExpenseSchema = z.object({
  event_id: z.string().min(1, "ID acara wajib diisi"),
  amount: z.coerce.number().gt(0, "Nominal pengeluaran harus lebih besar dari 0"),
  category: z.enum(["Vendor", "Logistics", "F&B", "Others"]),
  expense_date: z.string().min(1, "Tanggal pengeluaran wajib diisi"),
  status: z.enum(["Paid", "Unpaid"]).default("Unpaid"),
  notes: z.string().trim().nullable().optional(),
});

export type EventExpenseInput = z.infer<typeof eventExpenseSchema>;

/**
 * Zod validation schema for Event Document metadata.
 */
export const eventDocumentSchema = z.object({
  event_id: z.string().min(1, "ID acara wajib diisi"),
  file_name: z.string().trim().min(1, "Nama file wajib diisi"),
  file_url: z.string().min(1, "URL atau path file wajib diisi"),
  file_type: z.string().min(1, "Tipe file wajib diisi"),
  file_size: z.coerce.number().nonnegative().optional().default(0),
});

export type EventDocumentInput = z.infer<typeof eventDocumentSchema>;

export const EVENT_CREW_ROLES = [
  "LO",
  "LO Family",
  "Food and Beverage",
  "Front Desk",
  "Multi Media",
  "Lightning Operator",
  "Sound Operator",
  "Event",
  "Social Media",
  "VIP manager",
  "Guest Manager",
  "Event Manager",
  "Technical Manager",
] as const;

export type EventCrewRole = (typeof EVENT_CREW_ROLES)[number];

/**
 * Zod validation schema for Assigning Crew to Event.
 */
export const assignCrewSchema = z.object({
  event_id: z.string().min(1, "ID acara wajib diisi"),
  profile_id: z.string().min(1, "Anggota staf kru wajib dipilih"),
  role_in_event: z.string().trim().min(1, "Peran di acara wajib diisi").default("LO"),
  notes: z.string().trim().nullable().optional(),
});

export type AssignCrewInput = z.infer<typeof assignCrewSchema>;

/**
 * Zod validation schema for Updating Assigned Crew Role.
 */
export const updateCrewRoleSchema = z.object({
  crew_id: z.string().min(1, "ID penugasan kru wajib diisi"),
  event_id: z.string().min(1, "ID acara wajib diisi"),
  role_in_event: z.string().trim().min(1, "Peran di acara wajib diisi"),
});

export type UpdateCrewRoleInput = z.infer<typeof updateCrewRoleSchema>;

/**
 * Zod validation schema for Removing Crew from Event.
 */
export const removeCrewSchema = z.object({
  crew_id: z.string().min(1, "ID penugasan kru wajib diisi"),
  event_id: z.string().min(1, "ID acara wajib diisi"),
});

export type RemoveCrewInput = z.infer<typeof removeCrewSchema>;


