import { z } from "zod";

/**
 * Zod validation schema for an individual member in the dynamic public family form.
 * CRITICAL REQUIREMENT: Every single field is strictly optional.
 * NO mandatory validation rules (required, min(1)) so respondents can submit partial
 * data, save incrementally, and complete the rest later without being blocked.
 */
export const publicFormMemberSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional().default(""),
    role: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    notes: z.string().optional().default(""),
  })
  .passthrough(); // allows arbitrary dynamic column keys

export type PublicFormMember = z.infer<typeof publicFormMemberSchema>;

/**
 * Category group validation schema for dynamic public forms.
 */
export const publicFormCategoryGroupSchema = z.object({
  categoryId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  members: z.array(publicFormMemberSchema).optional().default([]),
});

export type PublicFormCategoryGroup = z.infer<typeof publicFormCategoryGroupSchema>;

/**
 * Root form values schema for React Hook Form in /p/[token].
 */
export const publicFamilyFormValuesSchema = z.object({
  categories: z.array(publicFormCategoryGroupSchema),
});

export type PublicFamilyFormValues = z.infer<typeof publicFamilyFormValuesSchema>;

/**
 * Server action submission payload validation schema.
 * Map of categoryId -> array of member objects with strictly optional fields.
 */
export const publicFormDataPayloadSchema = z.record(
  z.string(),
  z.array(publicFormMemberSchema)
);

export type PublicFormDataPayload = z.infer<typeof publicFormDataPayloadSchema>;
