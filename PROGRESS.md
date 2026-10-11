# PROGRESS.md — Feature Tracker & Project State

> Track completed milestones, current progress, and pending backlog items for Xeno Entertainment.

---

## 1. Feature Status Summary

| Area | Status | Notes |
| :--- | :--- | :--- |
| **Authentication & Auth Guard** | Completed | Login, Signup, Logout, session cookies, Next.js Middleware route guard |
| **Operations Dashboard** | Completed | Stats metrics (active events, budget, pending tasks), upcoming event list |
| **Event Listing & Detail** | Completed | Catalog view, single event rundown, venue and schedule metadata |
| **Event Creation** | Completed | Server Action `createEvent` with validation and cache invalidation |
| **Crew Task Management** | Completed | Add task via Server Action, toggle status ('todo' <-> 'done') |
| **Client Directory** | Completed | Read-only directory view with fallback seed data |
| **Vendor Directory** | Completed | Read-only directory view categorized by technical trade |
| **Crew & Team Directory** | Completed | Profiles directory displaying role and internal email |
| **Role-Based Access Control (RBAC)** | Completed | 'admin' vs 'staff' permissions, `is_admin()` SQL helper, secure RLS policies |
| **Full Admin CRUD** | Completed | Create, Read, Update, Delete for Events, Tasks, Vendors, Clients, and Staff users |
| **Event Crew Assignment** | Completed | Many-to-many `event_crew` junction, preset roles, optimistic assignment/removal Server Actions |
| **Financial Tracking (Expense Tracker)** | Completed | `event_expenses` table, CRUD Server Actions, Finance tab, Apple summary widget |


| **Interactive Date & Time Picker** | Completed | Popover mini-calendar & time picker (`components/ui/date-time-picker.tsx`) |
| **Dashboard Monthly Calendar** | Completed | Full month calendar view with event badges, navigation, and day preview drawer |
| **Database & Security** | Completed | Live Supabase project connected, DDL schema, foreign keys, RLS policies, triggers |
| **Python Tooling Isolation** | Completed | Local `.venv` setup, requirements.txt, shared `.env` loader (`scripts/db_client.py`) |
| **Automated Verification** | Completed | Assert-based helper self-test (`scripts/test-helpers.ts`) |

---

## 2. Completed Milestones

### Authentication & Sessions
- [x] `@supabase/ssr` cookie-based auth integration.
- [x] Protected routes inside `app/(dashboard)/*` guarded by Next.js `middleware.ts`.
- [x] Unauthenticated users redirected to `/login`.
- [x] Authenticated users accessing `/login` redirected to `/`.
- [x] Auth callback route handler (`app/auth/callback/route.ts`) for token exchange.
- [x] Auto-provisioning of `public.profiles` on user signup via PostgreSQL trigger `on_auth_user_created`.

### Operations Dashboard
- [x] High-level metrics: Active events count, managed budget sum in IDR, pending tasks count.
- [x] Recent upcoming events with status tags and venue info.
- [x] Assigned crew tasks preview with priority badges.

### Event Management
- [x] List all events sorted by start date (`/events`).
- [x] Dynamic route `/events/[id]` with `Promise<{ id: string }>` params handling.
- [x] New event form (`/events/new`) wired to Server Action `createEvent`.
- [x] Direct crew task addition via Server Action `addEventTask`.
- [x] Direct task status toggle via Server Action `toggleTaskStatus`.
- [x] Crew assignment module (`components/events/event-crew-section.tsx`, `components/events/assign-crew-modal.tsx`).
- [x] Server actions `assignEventCrew` & `removeEventCrew` in `app/(dashboard)/events/actions.ts`.
- [x] Database migration script `supabase/event_crew_migration.sql` with RLS policies and unique constraint (applied to live database).
- [x] Event budget optionality & validation (`lib/validations/event.ts`, `supabase/event_budget_migration.sql`): nullable/optional, strictly `> 0` if provided (applied to live database).
- [x] Consolidated database migrations `supabase/apply_all_migrations.sql` executed on Supabase project `yblhtchviuslhfwiwyuo` via Supabase CLI. Verified schema cache and constraint behavior.



### Master Data Directories
- [x] Client directory view (`/clients`) with contact phone, email, and address.
- [x] Vendor directory view (`/vendors`) with category labels, PIC name, and equipment notes.
- [x] Team directory view (`/team`) with user roles (`admin`, `manager`, `staff`).


### User & RBAC Administration Module
- [x] Complete Administrative module at `/users` (and redirect from `/dashboard/users`).
- [x] Schema DDL tables: `roles`, `permissions`, `role_permissions`, `user_roles` with RLS policies and indexes.
- [x] TypeScript interfaces: `Role`, `Permission`, `RolePermission`, `UserRoleRelation`, `UserWithRBAC`.
- [x] Supabase Auth Admin integration (`lib/supabase/admin.ts`) via service role or fallback signup.
- [x] Next.js Server Actions: `createUser`, `updateUser`, `deleteUser`, `createRole`, `updateRole`, `deleteRole`, `createPermission`, `deletePermission`.
- [x] Strict authorization: `assertAdmin()` in server actions, server page authorization check in `app/(dashboard)/users/page.tsx`.
- [x] Interactive UI: Modern Data Table, tabs for Staff Users, Roles & Permissions, and Permissions Catalog.
- [x] Dialogs and Modals: Create/Edit Staff Modal, Create/Edit Role Modal with permissions selector, Create Permission Modal, and Confirmation Dialogs before deletes.

### Financial Tracking (Expense Tracker) Module
- [x] Schema DDL migration: `public.event_expenses` table with `id`, `event_id`, `amount`, `category` (Vendor, Logistics, F&B, Others), `expense_date`, `status` (Paid, Unpaid), `notes`, RLS policies, and lookup indexes (`supabase/event_expenses_migration.sql`, consolidated in `supabase/schema.sql` and `supabase/apply_all_migrations.sql`).
- [x] TypeScript interfaces: `EventExpense`, `ExpenseCategory`, `ExpenseStatus` in `types/database.ts`.
- [x] Zod validation schema: `eventExpenseSchema` in `lib/validations/event.ts`.
- [x] Server Actions: `createEventExpense`, `updateEventExpense`, `deleteEventExpense`, and `toggleExpenseStatus` in `app/(dashboard)/events/expense-actions.ts`.
- [x] Interactive UI: Segmented tabs ("Operasional Acara" vs "Keuangan & Biaya") in `app/(dashboard)/events/[id]/page.tsx` via `EventDetailTabs`.
- [x] Apple-like Financial Summary Widget: Real-time calculation and display of "Total Budget", "Total Spent" (with paid/unpaid breakdown), "Remaining Balance" (with healthy surplus/deficit badges), and animated budget utilization progress bar.
- [x] Expenses Table & Actions: Category and status filter pills, inline Paid/Unpaid quick toggles, edit modal, delete confirmations, and Add Expense modal (`components/events/expense-modal.tsx`).
- [x] Runnable Verification Check: Native test suite in `scripts/test_expense_tracker.ts` asserting calculations, negative scenarios, and Zod schemas.

### Document & File Management (Supabase Storage)
- [x] Storage Bucket & SQL Migration: `event-documents` private bucket with authenticated RLS policies, metadata table `event_documents` with cascade relations and indexes in `supabase/event_documents_migration.sql` (also integrated in `supabase/schema.sql` and `supabase/apply_all_migrations.sql`).
- [x] TypeScript interfaces & Zod validation: `EventDocument` in `types/database.ts` and `eventDocumentSchema` in `lib/validations/event.ts`.
- [x] Server Actions: `createEventDocumentMetadata`, `deleteEventDocument`, `getDocumentSignedUrl`, and `uploadEventDocument` in `app/(dashboard)/events/document-actions.ts`.
- [x] Apple HIG UI Component: `EventDocumentsSection` (`components/events/event-documents-section.tsx`) with drag-and-drop zone, file type badge recognition (PDF, images, spreadsheets, documents, archives), grid/table toggle views, filter pills, search bar, download via signed URLs, and delete confirmation modal.
- [x] Event Detail Integration: Segmented tab "Dokumen & Berkas" in `EventDetailTabs` (`components/events/event-detail-tabs.tsx`) and SSR data loading with graceful fallback in `app/(dashboard)/events/[id]/page.tsx`.
- [x] Runnable Verification Check: Native test suite in `scripts/test_documents.ts` asserting file size formatting, storage path resolution, and Zod schemas.

### Event Task Reminders Background Automation (Python)
- [x] Background Worker: `scripts/task_reminder.py` connected to Supabase via `supabase-py` using isolated `.venv`.
- [x] Filtering & Classification: Identifies incomplete tasks (`status != 'done'`) that are overdue, due today, due tomorrow, or marked with `urgent` priority.
- [x] Minimalist Terminal Report: Unicode structured report with task details, priority, assignee contacts, due dates, and categorized summary statistics. Supports `--demo` flag for layout preview.
- [x] Unit Self-Check: `scripts/test_task_reminder.py` asserting urgency classification boundaries, overdue calculations, and report rendering.
- [x] Cron Scheduling Docs: Crontab configuration guide documented in `README.md`.

### Event Operational Summary PDF Export
- [x] Lightweight Vector PDF Engine: `jspdf` v4.2.1 installed cleanly with zero React 19 / Next.js Turbopack peer issues.
- [x] Apple-Inspired PDF Generator: `lib/pdf/event-summary-pdf.ts` (`buildEventSummaryPdf`, `downloadEventSummaryPdf`) with Xeno Entertainment monogram badge, dynamic status pills, clean 2-column event overview, assigned crew directory, task rundown table with text auto-wrapping, financial summary card, running headers, and multi-page footers.
- [x] UI Integration: `ExportPdfButton` (`components/events/export-pdf-button.tsx`) added to Event Detail page (`app/(dashboard)/events/[id]/page.tsx`) with loading spinner and active spring compression.
- [x] Verification: Runnable assert test suite in `scripts/test_pdf_export.ts` and integrated in `scripts/test-helpers.ts` (`pnpm test`).





### Apple HIG UI/UX Redesign
- [x] Switched typography to Inter and native San Francisco font stack with refined tracking and contrast.
- [x] Modernized global border radius to pronounced squircles (`rounded-2xl`, `rounded-3xl`, capsule pills).
- [x] Frosted glassmorphism across sidebar, navbar, dialogs, and modals (`apple-glass`, `backdrop-blur-2xl`, subtle hairline white borders).
- [x] Soft diffused shadows and inner highlight bevels replacing harsh drop shadows.
- [x] Apple dark palette with pure black/zinc deep surfaces and iOS Blue (`#007aff`) primary accent.
- [x] Smooth micro-interaction animations: active scale spring compression, subtle card hover lift, and silky tab switches.

- [x] Apple HIG UI Accessibility & Contrast Revamp:
  - Functional Light/Dark Mode toggle in Topbar Navbar with system/local storage synchronization (`components/theme-toggle.tsx`, `components/theme-provider.tsx`).
  - Strict semantic CSS tokens (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--sidebar`) for Apple Light (clean `#f5f5f7` gray & `#ffffff` card surfaces) and Apple Dark (pure `#000000` & `#161618` elevated surfaces).
  - Selector-based `@variant dark (&:where(.dark, .dark *))` and `style.colorScheme` injection ensuring browser engine canvas renders in true light mode without media-query bleeding.
  - Eliminated hardcoded `bg-black`, `bg-[#161822]`, `bg-[#1c1c1e]`, and `text-white` classes across layout, sidebar, calendar, modals, and dashboard.
  - Monthly calendar unified backgrounds: grid, headers, and date cells match container surfaces in both themes.
  - High-contrast text tokens across both Light and Dark modes; elimination of unreadable dimmed low-contrast text.
  - Sidebar clickable affordance with chevron right indicators (`ChevronRight`), enhanced hover slide/scale micro-interactions, and prominent high-contrast "Keluar Sistem" (Sign Out) button with explicit `LogOut` icon.
  - Highly visible "+ Buat Acara" primary call-to-action button placed prominently in both Topbar Navbar and Dashboard headers with Apple blue `#007AFF` glow.
  - Monthly calendar high-contrast grid borders, distinctive highlights for dates with active events, interactive click affordance, and high-contrast event badge tags.
  - "Daftar Acara Mendatang" and "Tugas Kru Prioritas" cards revamped with elevated card surfaces, hover glow, chevron (`>`) click affordance, and high-contrast pill status badges.

### Infrastructure & Engineering
- [x] Tailwind CSS 4 dark mode theme with slate/indigo branding.
- [x] Zero-framework assert test suite (`scripts/test-helpers.ts`) runnable via `pnpm test`.
- [x] Type definitions in `types/database.ts` matching Supabase tables and enums.
- [x] Strict Python virtual environment `.venv/` with `requirements.txt`.

---

## 3. Pending Backlog & Future Enhancements

### Phase 2: CRUD Completion
- [x] **Event Crew Tasks CRUD**: Scoped in-page task management (create, update, toggle status, delete, assign to crew members, set priority & due dates).
- [x] **Vendor Event Assignment & Inline Creation**: Dynamic search/combobox with on-the-spot master vendor registration + immediate event linking.
- [ ] **Add/Edit Client Form**: Server Action & modal to create or update client records.
- [ ] **Add/Edit Vendor Form**: Server Action & modal to register new suppliers.
- [ ] **Edit & Cancel Event**: Server Action to edit event metadata or mark status as `cancelled`.

### Phase 3: Assets & Realtime
- [x] **Supabase Storage**: Bucket configuration for event floorplans, stage rundowns, and signed contracts (`event-documents`).
- [ ] **Realtime Subscriptions**: Live task status updates on the event detail page using `supabase.channel`.
- [ ] **Role-Based UI Policies**: Conditional render to restrict budget edits and crew deletions to `admin` / `manager` roles.
