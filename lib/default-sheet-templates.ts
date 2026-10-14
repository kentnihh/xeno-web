/**
 * Default Master Sheet Templates.
 * Note: Master templates are now persisted dynamically in the Supabase table `public.master_templates`.
 * This file serves as the static fallback when the database table has not yet been populated.
 */
export {
  INITIAL_EVENT_SHEETS as DEFAULT_SHEET_TEMPLATES,
  INITIAL_EVENT_SHEETS,
  buildDefaultEventSheets,
  type DefaultSheetTemplate,
} from "./constants/event-sheets";
