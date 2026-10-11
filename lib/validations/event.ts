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
 * Complete Event Creation Validation Schema
 * Expenses and documents are purely optional with no minimum length required.
 */
export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Nama acara wajib diisi"),
  venue: z.string().trim().min(1, "Lokasi venue wajib diisi"),
  start_date: z.string().min(1, "Tanggal & waktu mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal & waktu selesai wajib diisi"),
  budget: eventBudgetInputSchema,
  description: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  expenses: z.array(z.any()).nullable().optional().default([]),
  documents: z.array(z.any()).nullable().optional().default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Event Update Validation Schema
 * Matches event fields with optional/nullable budget and lifecycle status.
 */
export const updateEventSchema = z.object({
  id: z.string().min(1, "ID acara wajib diisi"),
  title: z.string().trim().min(1, "Nama acara wajib diisi"),
  venue: z.string().trim().min(1, "Lokasi venue wajib diisi"),
  start_date: z.string().min(1, "Tanggal & waktu mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal & waktu selesai wajib diisi"),
  status: z.enum(["draft", "planning", "confirmed", "ongoing", "completed", "cancelled"]).default("planning"),
  budget: eventBudgetInputSchema,
  description: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
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


