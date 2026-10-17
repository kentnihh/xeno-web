/**
 * Xeno Entertainment - Database Type Definitions
 * Represents entities and enums corresponding to public Supabase schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Lifecycle status for an event */
export const EVENT_STATUS_LIST = [
  'draft',
  'planning',
  'confirmed',
  'ongoing',
  'completed',
  'cancelled',
] as const;

export type EventStatus = (typeof EVENT_STATUS_LIST)[number];

/** Progress status for crew tasks */
export type TaskStatus = 'todo' | 'in_progress' | 'done';

/** Urgency priority for crew tasks */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Access level for internal team members */
export type UserRole = 'admin' | 'manager' | 'staff';

/** Engagement/contract status with vendors */
export type VendorStatus = 'proposed' | 'contracted' | 'paid';

/** Expense category classification */
export type ExpenseCategory = 'Vendor' | 'Logistics' | 'F&B' | 'Others';

/** Payment status for event expenses */
export type ExpenseStatus = 'Paid' | 'Unpaid';

/** User profile linked 1:1 with auth.users */
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientEventType = "Wedding" | "Birthday" | "Corporate" | "Social Event" | "Lainnya" | string;

/** Client or customer commissioning the event */
export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string;
  address: string | null;
  notes: string | null;
  event_type?: ClientEventType | null;
  partner_name?: string | null;
  partner_email?: string | null;
  partner_phone?: string | null;
  partner_address?: string | null;
  created_at: string;
}

/** External vendor supplier (audio, lighting, catering, stage rig) */
export interface Vendor {
  id: string;
  name: string;
  category: string;
  pic_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

/** Main Event record managed by Xeno Entertainment */
export interface Event {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  pic?: string | null;
  venue: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  gcal_event_id?: string | null;
  client?: Client | null;
}

/** Operational task assigned to a team member for an event */
export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
}

/** Junction mapping vendors hired for an event with contracted cost */
export interface EventVendor {
  id: string;
  event_id: string;
  vendor_id: string;
  service_name: string;
  cost: number;
  status: VendorStatus;
  notes: string | null;
  created_at: string;
  vendor?: Vendor | null;
}
/** Junction mapping internal staff/crew assigned to an event */
export interface EventCrew {
  id: string;
  event_id: string;
  profile_id: string;
  role_in_event: string;
  notes?: string | null;
  created_at: string;
  profile?: Profile | null;
}

/** Financial expense entry for an event */
export interface EventExpense {
  id: string;
  event_id: string;
  amount: number;
  category: ExpenseCategory | string;
  expense_date: string;
  status: ExpenseStatus;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

/** Document / file asset attached to an event stored in Supabase Storage */
export interface EventDocument {
  id: string;
  event_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile | null;
}




/** RBAC: System Role definition */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

/** RBAC: Granular Permission definition */
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

/** RBAC: Role to Permission junction */
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

/** RBAC: User to Role junction */
export interface UserRoleRelation {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  role?: Role;
}

/** Staff profile enriched with assigned roles and active permissions */
export interface UserWithRBAC extends Profile {
  roles: Role[];
  permissions: Permission[];
}




/** Spreadsheet grid column definition */
export interface SheetColumn {
  id: string;
  name: string;
  width?: number;
}

/** Spreadsheet grid row: dynamic key-value dictionary with unique id */
export interface SheetRow {
  id: string;
  [columnId: string]: string | number | boolean | null | undefined;
}

/** Spreadsheet grid payload stored inside event_sheets.data JSONB (supports rich Excel-like FortuneSheet state or legacy grid format) */
export interface SheetData {
  columns?: SheetColumn[];
  rows?: SheetRow[];
  name?: string;
  id?: string;
  celldata?: any[];
  data?: any[][];
  config?: any;
  row?: number;
  column?: number;
  [key: string]: any;
}

/** Flexible event spreadsheet tab record */
export interface EventSheet<T = SheetData> {
  id: string;
  event_id: string;
  sheet_name: string;
  order_index: number;
  sort_order?: number;
  data: T;
  created_at: string;
  updated_at: string;
}

/** Master template record stored in public.master_templates */
export interface MasterTemplate {
  id: string;
  sheet_name: string;
  order_index: number;
  sort_order?: number;
  jsonb_structure: SheetData;
  created_at: string;
  updated_at: string;
}

/** Configurable field definition within a family form category */
export interface FormFieldSchema {
  id: string;
  label: string;
  type?: "text" | "tel" | "textarea";
  required?: boolean;
  placeholder?: string;
}

/** Form schema category definition for client-facing event public forms */
export interface FormCategorySchema {
  id: string;
  title?: string;
  name: string;
  description?: string;
  fields?: FormFieldSchema[];
}

/** Master Family Template record stored in public.master_family_templates */
export interface MasterFamilyTemplate {
  id: string;
  name: string;
  categories: FormCategorySchema[];
  form_schema?: FormCategorySchema[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Individual member entry in public form data */
export interface FormMember {
  id?: string;
  name: string;
  role: string;
  phone?: string;
  notes?: string;
  [key: string]: any;
}

/** Submitted structured data dictionary keyed by category ID */
export type EventFormData = Record<string, FormMember[]>;

/** Public form record for client family & photo reps submission */
export interface EventPublicForm {
  id: string;
  event_id: string;
  token: string;
  expires_at: string;
  form_schema: FormCategorySchema[];
  form_data: EventFormData;
  created_at: string;
  updated_at: string;
  event?: Event | null;
}



