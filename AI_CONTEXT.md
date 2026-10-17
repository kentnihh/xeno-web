# Xeno Entertainment Operations — AI Context & Architecture Blueprint

> **Purpose of this Document**:  
> This file is a high-density architectural context guide for AI coding assistants and developers onboarding to the **Xeno** codebase. It provides an immediate overview of the system design, tech stack, database schema, design rules, and core quirks so you never have to guess or scan the entire repository to implement features safely.

---

## 1. Tech Stack & Infrastructure

- **Framework**: [Next.js](https://nextjs.org/) 16.4 (App Router) + [React](https://react.dev/) 19 (Server Components + Client Components).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn/ui](https://ui.shadcn.com/) primitives + Apple-inspired minimalist design tokens (`apple-card`, `apple-btn`, HSL colors, dark mode support).
- **Icons**: `lucide-react`.
- **Backend & Database**: [Supabase](https://supabase.com/)
  - **Database**: PostgreSQL with Row Level Security (RLS) policies.
  - **Auth**: Supabase GoTrue Auth (Session management via cookies via `@supabase/ssr`).
  - **Storage**: Supabase Storage buckets for event documents and media assets.
- **Spreadsheet Engine**: `@fortune-sheet/react` + `@fortune-sheet/core` (Excel clone with bold, cell colors, font sizing, cell merging, and formula bar).
- **Export Engines**:
  - `xlsx` for native Excel spreadsheet export.
  - `jspdf` + `jspdf-autotable` for vector PDF document export.
- **Deployment & Hosting**:
  - **Target**: Oracle Cloud Ubuntu VPS (Self-Hosted via Docker & Caddy reverse-proxy).
  - **Production Domain**: `xenoent.my.id` (Automatic SSL/TLS managed by Caddy).
  - **Production Build**: Multi-stage Docker build with Next.js `output: 'standalone'` (`docker compose up -d --build`).
  - **Local Development**: Native Node.js execution without Docker (`pnpm run dev`).

---

## 2. Database Schema Overview

All database schema types are strictly defined in [`types/database.ts`](file:///Users/jonathankent/Documents/Code/xeno/types/database.ts).

### Core Entities

| Table | Description | Key Columns / Relationships |
|---|---|---|
| `profiles` | User profiles linked 1:1 with `auth.users` | `id` (FK to auth.users), `full_name`, `email`, `role`, `phone`, `avatar_url` |
| `events` | Core event records (weddings, corporate, concerts) | `id`, `title`, `description`, `venue`, `start_date`, `end_date`, `status`, `pic`, `client_id` (FK to clients) |
| `clients` | Clients/customers commissioning events | `id`, `name`, `company`, `email`, `phone`, `address`, `notes` |
| `vendors` | Master directory of third-party vendors | `id`, `name`, `category`, `pic_name`, `phone`, `email`, `address`, `notes` |
| `event_tasks` | Operational task checklist assigned to crew | `id`, `event_id` (FK to events), `title`, `description`, `assigned_to` (FK to profiles), `status`, `priority` |
| `event_crew` | Crew / staff assigned to specific events | `id`, `event_id` (FK), `profile_id` (FK to profiles), `role_in_event`, `notes` |
| `event_vendors`| Vendors hired for an event with contracted cost | `id`, `event_id` (FK), `vendor_id` (FK to vendors), `service_name`, `cost`, `status` |
| `event_documents`| Uploaded files/attachments for events | `id`, `event_id` (FK), `file_name`, `file_url`, `file_type`, `file_size`, `uploaded_by` |
| `event_expenses`| Event financial expense logs | `id`, `event_id` (FK), `amount`, `category`, `expense_date`, `status`, `notes` |
| `roles` | RBAC role definitions (`admin`, `manager`, `staff`) | `id`, `name`, `description` |
| `permissions` | Granular permission keys (`events.edit`, `users.manage`, etc.) | `id`, `name`, `description`, `module` |
| `role_permissions` | Junction mapping roles to permissions | `id`, `role_id` (FK), `permission_id` (FK) |
| `user_roles` | Junction mapping users to roles | `id`, `user_id` (FK to profiles), `role_id` (FK) |

### Dynamic Spreadsheet System (`event_sheets` & `master_templates`)

The application features a flexible, multi-tab Excel-like spreadsheet engine stored in PostgreSQL:

1. **`master_templates`**:
   - Acts as the blueprint library for new events.
   - Columns: `id`, `sheet_name`, `order_index`, `jsonb_structure` (JSONB), `created_at`, `updated_at`.
   - When an event is created, the system copies all master templates into `event_sheets`.
2. **`event_sheets`**:
   - Individual operational sheets for an event (e.g., `CHECKLIST`, `Meja VIP resepsi`, `Reception Rundown`, `List Teapai`, `LO Resepsi`, `F&B Resepsi`).
   - Columns: `id`, `event_id` (FK to events), `sheet_name`, `order_index`, `data` (JSONB), `created_at`, `updated_at`.
3. **Flexible JSONB Storage**:
   - The database does **not** use fixed schema columns for spreadsheet rows. Instead, `jsonb_structure` and `data` store either:
     - **Rich FortuneSheet Format**: `{ name, row, column, celldata: [{ r, c, v: { v, m, bl, bg, fs, ... } }], config: { merge: {...}, rowlen: {...} } }`
     - **Legacy Grid Format**: `{ columns: [...], rows: [...] }`
   - The adapter [`lib/spreadsheet-adapter.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/spreadsheet-adapter.ts) automatically normalizes either format bidirectionally.

---

## 3. Core Application Flows & Critical Architectural Rules

### A. Role-Based Access Control (RBAC) & User Management

1. **Server-Side Enforcement**:
   - Role and permission checks are strictly validated on the server using [`lib/auth.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/auth.ts) (`isAdmin()`, `hasPermission()`, `requirePermission()`).
   - The admin role (`admin`) bypasses granular checks and holds all permissions automatically.
2. **Admin API Only for Users & Passwords**:
   - Normal users cannot register themselves or change passwords directly via public endpoints.
   - All user creation (`createUser`) and password resets (`resetUserPassword`) are executed via Server Actions in [`app/(dashboard)/settings/rbac/actions.ts`](file:///Users/jonathankent/Documents/Code/xeno/app/(dashboard)/settings/rbac/actions.ts) using the **Supabase Admin Service Role Client** (`createAdminClient()` from `lib/supabase/admin.ts`).
   - **SECURITY RULE**: `SUPABASE_SERVICE_ROLE_KEY` must **never** be imported or exposed to client-side code (`use client`). It is strictly used in server actions.

### B. Rich Spreadsheets & Strict Lazy Loading Rules

1. **Bundle Protection & Lazy Loading**:
   - Libraries like `@fortune-sheet/react`, `jspdf`, `jspdf-autotable`, and `xlsx` are large dependencies.
   - **Rule**: Spreadsheets and PDF generators **MUST** be loaded dynamically:
     - In [`components/events/spreadsheet/dynamic-sheet-grid.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/spreadsheet/dynamic-sheet-grid.tsx), `<Workbook>` is imported via `next/dynamic` with `ssr: false`.
     - In [`components/events/spreadsheet/export-spreadsheet-pdf-modal.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/spreadsheet/export-spreadsheet-pdf-modal.tsx), PDF generator functions are imported dynamically inside the click handler (`await import("@/lib/pdf/spreadsheet-pdf")`).
2. **Uncontrolled Component Architecture & Manual Save**:
   - FortuneSheet fires internal update events on initialization, mouse movements, scrolling, and selection changes.
   - **Rule**: Never bind auto-save or debounced saves to FortuneSheet's internal `onChange`. Doing so triggers infinite re-renders and network request storms.
   - **Pattern**: The spreadsheet is uncontrolled. Edits are held in FortuneSheet's canvas. Data is retrieved on-demand via an imperative ref handle (`gridRef.current.getData()`) when the user explicitly clicks the pinned **"Simpan Perubahan"** or **"Simpan Template"** button.
3. **Canvas Hydration & Remounting via `key` Prop**:
   - FortuneSheet initializes cell state **exclusively from `celldata`** (`[{ r, c, v }]`). Once mounted, it deletes `celldata` and maintains an internal 2D matrix (`data`).
   - To prevent blank canvases when switching tabs, [`lib/spreadsheet-adapter.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/spreadsheet-adapter.ts) provides `matrixToCelldata` to reconstruct `celldata` before saving or passing state.
   - **Rule**: Whenever rendering `<DynamicSheetGrid>`, always supply a unique dynamic `key` that incorporates the tab identifier and revision (e.g., `key={`${activeSheet.sheet_name}_rev${gridRevision}`}`). This forces React to unmount the previous canvas and mount a fresh instance with the new sheet's data.
4. **Tab Placement**:
   - On the Event Detail page ([`/events/[id]`](file:///Users/jonathankent/Documents/Code/xeno/app/(dashboard)/events/[id]/page.tsx)), the spreadsheet is strictly contained inside the **"Lembar Kerja"** tab in [`components/events/event-detail-tabs.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/event-detail-tabs.tsx) and does not clutter the default operational overview.

### C. Standardized Data Mutations & Confirmations

1. **Server Actions Standard**:
   - All server actions return a typed object:
     ```ts
     type ActionResult<T = unknown> = { success?: boolean; error?: string; data?: T };
     ```
   - Actions wrap mutations in `try...catch`, log errors to the console, and return `{ error: err.message }` instead of swallowing errors.
   - Every mutation calls `revalidatePath(...)` to purge and update Next.js Server Component caches.
2. **Global Destructive Confirmation Modal**:
   - All deletion flows (Events, Clients, Vendors, Crew, Tasks, Sheets, Templates, Users) **must** use the centralized [`ConfirmModal`](file:///Users/jonathankent/Documents/Code/xeno/components/ui/confirm-modal.tsx) or [`DeleteConfirmButton`](file:///Users/jonathankent/Documents/Code/xeno/components/ui/confirm-modal.tsx).
   - `ConfirmModal` uses `createPortal` to `document.body` with a full-viewport backdrop (`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`) and centered dialog (`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md`), preventing clipping from transformed parent elements.

---

## 4. Directory Structure & Navigation Map

```
xeno/
├── app/
│   ├── (dashboard)/                     # Protected dashboard routes (Sidebar layout)
│   │   ├── clients/                     # Client database page & actions
│   │   │   ├── actions.ts               # Server actions (createClient, updateClient, deleteClient)
│   │   │   └── page.tsx                 # Client list, stats, and search
│   │   ├── dashboard/                   # High-level operational metrics & active events
│   │   │   └── page.tsx
│   │   ├── events/                      # Event management
│   │   │   ├── [id]/page.tsx            # Event Detail page (Tabs: Operasional, Dokumen, Lembar Kerja)
│   │   │   ├── new/page.tsx             # New event creation wizard
│   │   │   ├── actions.ts               # Event CRUD server actions
│   │   │   ├── expense-actions.ts       # Event expense server actions
│   │   │   ├── document-actions.ts      # Event file upload & storage actions
│   │   │   └── sheet-actions.ts         # Spreadsheet tab CRUD & reset server actions
│   │   ├── settings/
│   │   │   ├── rbac/                    # User accounts, roles, & permission matrices
│   │   │   │   ├── actions.ts           # Admin API user creation, password reset, role assignment
│   │   │   │   └── page.tsx
│   │   │   └── templates/               # Blueprint spreadsheet master templates
│   │   │       ├── actions.ts           # Master template CRUD & reset server actions
│   │   │       └── page.tsx
│   │   ├── team/                        # Internal crew directory
│   │   └── vendors/                     # External vendor directory
│   ├── auth/                            # Auth routes (callback, actions)
│   ├── login/                           # Login page
│   ├── layout.tsx                       # Root HTML & body font layout
│   └── page.tsx                         # Landing / redirect to dashboard
│
├── components/
│   ├── clients/                         # Client modal forms & tables
│   ├── dashboard/                       # Metric cards, quick actions, event feed
│   ├── events/                          # Event sections
│   │   ├── event-detail-tabs.tsx        # Segmented tabs controller (Operasional, Dokumen, Lembar Kerja)
│   │   ├── event-crew-section.tsx       # Crew roster & role assignment
│   │   ├── event-tasks-section.tsx      # Task board with status badges
│   │   ├── event-vendors-section.tsx    # Hired vendor agreements & cost tracking
│   │   ├── event-documents-section.tsx  # File attachment manager (Supabase Storage)
│   │   └── spreadsheet/                 # Rich Spreadsheet subsystem
│   │       ├── dynamic-sheet-grid.tsx   # Lazy-loaded FortuneSheet wrapper (uncontrolled via ref)
│   │       ├── event-spreadsheet-tabs.tsx # Multi-sheet tab bar with pinned manual save button
│   │       ├── export-excel-button.tsx  # Client-side XLSX workbook exporter
│   │       ├── export-spreadsheet-pdf-button.tsx # PDF export button & toast feedback
│   │       └── export-spreadsheet-pdf-modal.tsx  # PDF sheet selection modal with layout options
│   ├── settings/
│   │   └── master-templates-manager.tsx # Master templates spreadsheet editor & tab selector
│   └── ui/                              # Reusable atomic UI components
│       ├── confirm-modal.tsx            # Portaled confirmation dialog for deletions
│       ├── modal-shell.tsx              # Generic modal wrapper
│       └── ...                          # Badges, buttons, input primitives
│
├── lib/
│   ├── auth.ts                          # Server-side RBAC verification (isAdmin, hasPermission, etc.)
│   ├── constants/
│   │   └── event-sheets.ts              # 10 initial preset templates (CHECKLIST, VIP, Rundown, etc.)
│   ├── pdf/
│   │   └── spreadsheet-pdf.ts           # jsPDF + autotable multi-sheet vector PDF generation
│   ├── spreadsheet-adapter.ts           # Formats, parses, and normalizes legacy grid <-> FortuneSheet
│   └── supabase/
│       ├── client.ts                    # Browser Supabase client (createBrowserClient)
│       ├── server.ts                    # Server component / Server Action client (cookies)
│       └── admin.ts                     # Admin service role client (createAdminClient)
│
├── scripts/
│   ├── seed-database.ts                 # Clean production database seeder (TypeScript)
│   ├── seed_database.py                 # Clean production database seeder (Python)
│   ├── test_confirm_modal.ts            # Unit tests for confirm modal portal & accessibility
│   ├── test_fortune_spreadsheet.ts      # Unit tests for spreadsheet conversion, styles, & XLSX
│   └── test_pdf_export.ts               # Unit tests for vector PDF generation & orientation
│
├── types/
│   └── database.ts                      # Complete TypeScript definitions for Supabase tables & payloads
│
├── supabase/
│   ├── migrations/                      # Versioned SQL migration files
│   └── seed.sql                         # SQL seed script
│
└── package.json                         # Scripts & dependency definitions
```

---

## 5. Development & Deployment Cheatsheet

### Running Locally
```bash
pnpm install
pnpm run dev
```
Dev server runs at `http://localhost:3000`.

### Running Automated Test Suites
```bash
pnpm test
```
Executes all TypeScript validation scripts in `scripts/`:
- `test-helpers.ts`: Auth and RBAC permission alias verification.
- `test_confirm_modal.ts`: Portal accessibility and DOM isolation test.
- `test_fortune_spreadsheet.ts`: JSON string parsing, matrix reconstruction, styles, and merges.
- `test_pdf_export.ts`: Multi-sheet vector PDF formatting and table compilation.

### Production Database Seeding
To reset the database to a clean production state (only Initial Roles, Permissions, Master Templates, and two production Admin accounts, with zero mock events/clients/vendors):
```bash
pnpm run seed
# or
pnpm run seed:py
```

### Deploying to Production (Oracle Cloud VPS)
Full step-by-step instructions are available in [DEPLOY.md](file:///Users/jonathankent/Documents/Code/xeno/DEPLOY.md).
```bash
# On the Oracle Ubuntu VPS:
git pull origin main
docker compose up -d --build
```
This builds the Next.js standalone container, restarts the application, and Caddy automatically manages HTTPS certificates for `xenoent.my.id`.
