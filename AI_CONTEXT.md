# Xeno Entertainment Operations — AI Context & Architecture Blueprint

> **Purpose of this Document**:  
> This file is a high-density architectural context guide for AI coding assistants and developers working on the **Xeno** codebase. It provides an immediate overview of system design, infrastructure, database schema, design rules, and core subsystem workflows so you never have to guess or scan the entire repository to implement features safely.

---

## 1. Tech Stack & Infrastructure

- **Framework**: [Next.js](https://nextjs.org/) 16.4 (App Router) + [React](https://react.dev/) 19 (Server Components + Client Components).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 + Apple-inspired minimalist design tokens (`apple-card`, `apple-btn`, HSL colors, clean borders).
- **Icons**: `lucide-react`.
- **Backend & Database**: [Supabase](https://supabase.com/)
  - **Database**: PostgreSQL with Row Level Security (RLS) policies.
  - **Auth**: Supabase GoTrue Auth (Session management via cookies using `@supabase/ssr`).
  - **Storage**: Supabase Storage buckets for event documents and media assets.
- **Spreadsheet Engine**: `@fortune-sheet/react` + `@fortune-sheet/core` (Excel clone with bold, cell colors, font sizing, cell merging, and formula bar).
- **Export Engines**:
  - `xlsx` for native Excel spreadsheet export.
  - `jspdf` + `jspdf-autotable` for vector PDF document export.
- **Hosting & Infrastructure**:
  - **Target**: Self-hosted on an **Oracle Cloud Ubuntu VPS**.
  - **Containerization & Reverse Proxy**: Deployed via **Docker & Caddy** (`docker-compose.yml`).
  - **Production Domain**: `xenoent.my.id` (Automatic SSL/TLS provisioning and renewal managed by Caddy).
  - **Production Build**: Multi-stage Docker build utilizing Next.js `output: 'standalone'`.
  - **Local Development**: Native Node.js execution without Docker (`pnpm run dev`).
  - *Note*: Cloudflare Pages and Edge Runtime are **not** used. All routes run in standard Node.js runtime.

---

## 2. Theme Architecture: Locked to Light Mode

To eliminate all contrast issues, illegible cell-editing text in spreadsheets, and theme-switching glitches, **Dark Mode has been temporarily disabled and the entire application is permanently locked to Light Mode**:

1. **Global HTML & Head Injection ([`app/layout.tsx`](file:///Users/jonathankent/Documents/Code/xeno/app/layout.tsx))**:
   - The root `<html>` element is locked to `className="... light"` and `data-theme="light"`.
   - An inline pre-hydration script in `<head>` immediately strips any existing `.dark` class from `document.documentElement`, applies `.light`, sets `colorScheme = 'light'`, and overwrites `localStorage.setItem('xeno-theme', 'light')`.
   - The `<body>` element explicitly applies the light canvas background (`bg-[#f5f5f7]` and `text-[#1d1d1f]`).
2. **State & Provider Locking ([`components/theme-provider.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/theme-provider.tsx))**:
   - `ThemeProvider` context is locked strictly to `"light"`.
   - `getSnapshot()` and `getServerSnapshot()` return `"light"`.
   - Any invocation of `setTheme()` or `toggleTheme()` safely enforces `"light"` and strips `.dark` from the DOM.
3. **Theme Switcher Disabled ([`components/theme-toggle.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/theme-toggle.tsx))**:
   - `<ThemeToggle />` returns `null`, cleanly hiding the *Terang / Gelap* switch from the navbar and login screen.
4. **Spreadsheet Container Isolation**:
   - The FortuneSheet wrapper is isolated with forced light-theme styling (`background: #ffffff`, text `#1d1d1f`), ensuring formula bars and cell overlays maintain crisp readability.

---

## 3. Database Schema Overview

All database schema types and interfaces are strictly defined in [`types/database.ts`](file:///Users/jonathankent/Documents/Code/xeno/types/database.ts).

### Core Entities

| Table | Description | Key Columns / Relationships |
|---|---|---|
| `profiles` | User profiles linked 1:1 with `auth.users` | `id` (FK to auth.users), `full_name`, `email`, `role`, `phone`, `avatar_url` |
| `events` | Core event records (weddings, corporate, concerts) | `id`, `title`, `description`, `venue`, `start_date`, `end_date`, `status`, `pic`, `client_id` (FK to clients) |
| `clients` | Clients/customers commissioning events | `id`, `name`, `company`, `email`, `phone`, `address`, `notes` |
| `vendors` | Master directory of third-party vendors | `id`, `name`, `category`, `pic_name`, `phone`, `email`, `address`, `notes` |
| `event_tasks` | Operational task checklist assigned to crew | `id`, `event_id` (FK to events), `title`, `description`, `assigned_to` (FK to profiles), `status`, `priority`, `due_date` |
| `event_crew` | Crew / staff assigned to specific events | `id`, `event_id` (FK), `profile_id` (FK to profiles), `role_in_event`, `notes` |
| `event_vendors`| Vendors hired for an event with contracted cost | `id`, `event_id` (FK), `vendor_id` (FK to vendors), `service_name`, `cost`, `status` |
| `event_documents`| Uploaded files/attachments for events | `id`, `event_id` (FK), `file_name`, `file_url`, `file_type`, `file_size`, `uploaded_by` |
| `event_expenses`| Event financial expense logs | `id`, `event_id` (FK), `amount`, `category`, `expense_date`, `status`, `notes` |
| `roles` | RBAC role definitions (`admin`, `manager`, `staff`) | `id`, `name`, `description` |
| `permissions` | Granular permission keys (`events.edit`, `users.manage`, etc.) | `id`, `name`, `description`, `module` |
| `role_permissions` | Junction mapping roles to permissions | `id`, `role_id` (FK), `permission_id` (FK) |
| `user_roles` | Junction mapping users to roles | `id`, `user_id` (FK to profiles), `role_id` (FK) |

### Spreadsheet Tables

| Table | Description | Key Columns / Relationships |
|---|---|---|
| `master_templates` | Blueprint operational sheets for new events | `id`, `sheet_name`, `order_index`, `jsonb_structure` (JSONB), `created_at`, `updated_at` |
| `event_sheets` | Per-event operational sheets | `id`, `event_id` (FK to events), `sheet_name`, `order_index`, `data` (JSONB), `created_at`, `updated_at` |

### Family Data & Public Form Tables

| Table | Description | Key Columns / Relationships |
|---|---|---|
| `master_family_templates` | Blueprint family categories and column definitions | `id`, `name`, `categories` (JSONB array of `FormCategorySchema`), `is_active`, `created_at`, `updated_at` |
| `event_public_forms` | Event tokenized public family data forms | `id`, `event_id` (FK to events), `token` (32-char hex), `expires_at` (timestamptz), `form_schema` (JSONB), `form_data` (JSONB), `created_at`, `updated_at` |

---

## 4. Subsystem Architectures

### A. Dynamic Spreadsheets (`@fortune-sheet/react`)

1. **Bundle Protection & Lazy Loading**:
   - `@fortune-sheet/react` and `@fortune-sheet/core` are code-split.
   - Imported dynamically with `ssr: false` in [`dynamic-sheet-grid.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/spreadsheet/dynamic-sheet-grid.tsx).
2. **Uncontrolled Architecture & Manual Save**:
   - FortuneSheet holds mutations internally on its canvas.
   - **Critical Rule**: Never bind auto-save or debounced saves to FortuneSheet's `onChange`.
   - Data is retrieved on-demand via an imperative ref handle (`gridRef.current.getData()`) when the user explicitly clicks the pinned **"Simpan Perubahan"** button.
3. **Matrix vs Celldata Bidirectional Normalization**:
   - FortuneSheet initializes exclusively from `celldata: [{ r, c, v }]` and discards it after mount.
   - [`lib/spreadsheet-adapter.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/spreadsheet-adapter.ts) provides `matrixToCelldata` to reconstruct cell objects before saving or switching tabs.
   - Always supply a dynamic `key` containing the sheet identifier and revision (e.g. `key={`${activeSheet.sheet_name}_rev${gridRevision}`}`) to force proper remounting.
4. **No Family Data in Spreadsheets**:
   - Family Data has been completely migrated out of spreadsheets into the dedicated Public Form subsystem.

---

### B. Family Data & Public Form Subsystem

To give wedding and event clients an effortless mobile-friendly experience, Family Data is managed as a standalone, dynamic public web form rather than a spreadsheet:

1. **Master Blueprint Management ([`master-family-templates-manager.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/settings/master-family-templates-manager.tsx))**:
   - Admins define default category groups (e.g., *Keluarga Groom*, *Keluarga Bride*, *Saksi & VIP*) and custom columns (e.g., *Nama Lengkap*, *Hubungan*, *No. HP*, *Catatan*).
   - **Fully Automated Identifiers**: Both Category Keys (`ID Unik Kategori`) and Member Column Keys (`ID Kolom`) are **completely hidden from the UI**. Safe `snake_case` keys are derived automatically in the background via `toSnakeCase(label)`.
   - **Default to Optional**: New member columns default to `required: false` ("Wajib Diisi" unchecked).
2. **Secure Expiring Token Links (`/p/[token]`)**:
   - Each event can issue a public link backed by `event_public_forms`.
   - Default expiration is **3 days** from generation.
   - Admins can extend (+3 days, +7 days, custom date) or invalidate/regenerate tokens at any time from the Event Detail **"Data Keluarga"** tab.
3. **Dynamic Public Form (`app/p/[token]/page.tsx` & [`public-family-form.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/public-form/public-family-form.tsx))**:
   - Configured with `export const dynamic = "force-dynamic"` and `export const revalidate = 0` to prevent stale caches.
   - **All Fields Strictly Optional**: Validated via [`lib/validations/public-form.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/validations/public-form.ts). Every field is optional (`z.string().optional().default("")`), with `.passthrough()` for dynamic columns. Clients can submit partial data without being blocked.
   - **Pre-filling Existing Data**: When opened, the form loads existing `form_data` JSONB from Supabase. `findExistingMembersForCategory()` maps saved rows into React Hook Form and `useFieldArray`.
   - **Editable & Incremental Upsert**: Submissions perform an upsert merge in [`public-form-actions.ts`](file:///Users/jonathankent/Documents/Code/xeno/app/(dashboard)/events/public-form-actions.ts), preserving untouched categories and updating edited ones. Clients can revisit the link anytime to make corrections.
4. **Admin Dashboard Integration ([`event-family-data-section.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/event-family-data-section.tsx))**:
   - Dedicated tab on `/events/[id]`. Displays category cards, member counts, quick WhatsApp links, and direct edit modals.
   - Admins can apply or reset schemas directly from the active Master Family Template.

---

### C. PDF Generation & Vector Export Subsystem

Vector PDF generation is powered by `jspdf` + `jspdf-autotable` via [`lib/pdf/spreadsheet-pdf.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/pdf/spreadsheet-pdf.ts):

1. **Direct Tab / Blob URL Preview (No Iframe)**:
   - PDF documents open directly in a new browser tab/window as a Blob URL (`window.open(blobUrl, "_blank")`) or trigger an immediate download (`doc.save(filename)`).
   - Modal iframes have been removed to eliminate rendering clipping, cross-origin security blocks, and mobile view glitches.
2. **Multi-Sheet & Family Data Compilation**:
   - Users can select which spreadsheet tabs to compile into a single consolidated PDF document via [`export-spreadsheet-pdf-modal.tsx`](file:///Users/jonathankent/Documents/Code/xeno/components/events/spreadsheet/export-spreadsheet-pdf-modal.tsx).
   - Can optionally append the **Data Keluarga** section at the end of the PDF, styled with elegant Apple-inspired table layouts.
3. **Layout & Orientation**:
   - Supports both **Landscape** (recommended for wide multi-column schedules and rundown sheets) and **Portrait** (standard A4 vertical document).
   - Dynamically imports PDF libraries inside user click handlers to protect client bundle size.

---

### D. Role-Based Access Control (RBAC) & Security

1. **Server-Side Enforcement ([`lib/auth.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/auth.ts))**:
   - `isAdmin()`, `hasPermission(key)`, and `requirePermission(key)` guard all server actions and dashboard views.
   - Users with the `admin` role bypass granular checks and possess all permissions.
2. **Service Role Security**:
   - Privileged mutations (creating user accounts, resetting passwords, managing roles) are performed via [`lib/supabase/admin.ts`](file:///Users/jonathankent/Documents/Code/xeno/lib/supabase/admin.ts) using `createAdminClient()`.
   - **SECURITY RULE**: `SUPABASE_SERVICE_ROLE_KEY` must **never** be imported or exposed to client-side code (`use client`). It is strictly used in server actions.

---

### E. Google Calendar Synchronization Subsystem

1. **Event Sync**:
   - High-level event synchronizations handled via `app/actions/gcal-sync.ts`.
2. **Granular Task Sync (`lib/gcal-task.ts`)**:
   - `event_tasks` table extended with columns: `gcal_event_id` (text), `gcal_start` (timestamptz), and `gcal_end` (timestamptz).
   - Allows crew tasks to optionally publish directly to Google Calendar using service account JWT authentication.
   - Non-blocking: failures emit user warnings without failing task creation/updates.
   - Task deletion or event deletion automatically cascades cleanup deletions to Google Calendar events.

---

## 5. Directory Structure & Navigation Map

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
│   │   │   ├── [id]/                    # Event Detail tabs (Operasional, Dokumen, Lembar Kerja, Data Keluarga)
│   │   │   │   ├── edit/page.tsx        # Event edit wizard
│   │   │   │   └── page.tsx             # Main event workspace
│   │   │   ├── new/page.tsx             # New event creation wizard
│   │   │   ├── actions.ts               # Event CRUD server actions
│   │   │   ├── document-actions.ts      # Event file upload & storage actions
│   │   │   ├── expense-actions.ts       # Event expense server actions
│   │   │   ├── public-form-actions.ts   # Public family form token generation & upsert actions
│   │   │   └── sheet-actions.ts         # Spreadsheet tab CRUD & reset server actions
│   │   ├── settings/
│   │   │   ├── rbac/                    # User accounts, roles, & permission matrices
│   │   │   │   ├── actions.ts           # Admin API user creation, password reset, role assignment
│   │   │   │   └── page.tsx
│   │   │   └── templates/               # Master templates manager (Spreadsheets & Family Data)
│   │   │       ├── actions.ts           # Master template CRUD server actions
│   │   │       └── page.tsx
│   │   ├── team/                        # Internal crew directory
│   │   └── vendors/                     # External vendor directory
│   ├── auth/                            # Auth routes (callback, actions)
│   ├── login/                           # Login page
│   ├── p/[token]/                       # Public Client Family Data Form
│   │   └── page.tsx                     # Server-rendered dynamic public form route
│   ├── globals.css                      # Tailwind CSS v4 design tokens & base rules
│   ├── layout.tsx                       # Root HTML & body font layout (Light Mode locked)
│   └── page.tsx                         # Landing / redirect to dashboard
│
├── components/
│   ├── clients/                         # Client modal forms & tables
│   ├── dashboard/                       # Metric cards, quick actions, event feed
│   ├── events/                          # Event components
│   │   ├── event-detail-tabs.tsx        # Segmented tabs controller
│   │   ├── event-family-data-section.tsx# Admin Family Data view, token manager, & category cards
│   │   ├── event-crew-section.tsx       # Crew roster & role assignment
│   │   ├── event-tasks-section.tsx      # Task board with status badges
│   │   ├── event-vendors-section.tsx    # Hired vendor agreements & cost tracking
│   │   ├── event-documents-section.tsx  # File attachment manager (Supabase Storage)
│   │   ├── event-finance-section.tsx    # Event expense tracking & budget summary
│   │   └── spreadsheet/                 # FortuneSheet subsystem
│   │       ├── dynamic-sheet-grid.tsx   # Lazy-loaded FortuneSheet wrapper (uncontrolled via ref)
│   │       ├── event-spreadsheet-tabs.tsx # Multi-sheet tab bar with pinned manual save button
│   │       ├── export-excel-button.tsx  # Client-side XLSX workbook exporter
│   │       ├── export-spreadsheet-pdf-button.tsx # PDF export button
│   │       └── export-spreadsheet-pdf-modal.tsx  # PDF sheet selection modal
│   ├── public-form/                     # Public Client Form components
│   │   └── public-family-form.tsx       # Responsive public form with pre-filling & dynamic rows
│   ├── settings/
│   │   ├── master-templates-manager.tsx # Master spreadsheet templates editor
│   │   └── master-family-templates-manager.tsx # Master family blueprint categories & columns editor
│   ├── ui/                              # Reusable atomic UI components
│   │   ├── confirm-modal.tsx            # Portaled confirmation dialog for deletions
│   │   ├── custom-combobox.tsx          # Accessible search-and-select combobox
│   │   └── ...                          # Badges, buttons, input primitives
│   ├── navbar.tsx                       # Header navigation bar
│   ├── sidebar.tsx                      # Collapsible side navigation
│   ├── theme-provider.tsx               # Locked light mode context provider
│   └── theme-toggle.tsx                 # Disabled / hidden theme toggle
│
├── lib/
│   ├── auth.ts                          # Server-side RBAC verification (isAdmin, hasPermission, etc.)
│   ├── constants/
│   │   ├── event-sheets.ts              # Preset master spreadsheet templates
│   │   └── public-forms.ts              # Default family form schemas & presets
│   ├── pdf/
│   │   ├── spreadsheet-pdf.ts           # Vector PDF generator for spreadsheets & family data
│   │   └── event-summary-pdf.ts         # Single-page executive summary PDF generator
│   ├── fortune-sheet-fonts.ts           # Custom font registration for FortuneSheet canvas
│   ├── spreadsheet-adapter.ts           # Grid <-> FortuneSheet matrix normalizer
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts                    # Server component / action client (cookies)
│   │   └── admin.ts                     # Admin service role client (createAdminClient)
│   ├── utils.ts                         # Utility functions (cn, formatIDR, toSnakeCase, etc.)
│   └── validations/
│       └── public-form.ts               # Optional Zod schemas for public form submissions
│
├── types/
│   └── database.ts                      # Complete TypeScript definitions for Supabase entities
│
├── docker-compose.yml                   # Production Docker Compose definition (App + Caddy)
├── Dockerfile                           # Multi-stage production Next.js Dockerfile
├── Caddyfile                            # Caddy reverse-proxy & SSL configuration
├── DEPLOY.md                            # Comprehensive Oracle Cloud deployment guide
└── package.json                         # Scripts & dependency definitions
```

---

## 6. Development & Deployment Cheatsheet

### Running Locally
```bash
pnpm install
pnpm run dev
```
Development server runs locally at `http://localhost:3000`.

### Type-Checking & Building
```bash
# Verify TypeScript types and compile Next.js production build:
pnpm build
```

### Running Automated Test Suites
```bash
pnpm test
```
Executes all TypeScript validation scripts in `scripts/`:
- `test-helpers.ts`: Auth and RBAC permission alias verification.
- `test_confirm_modal.ts`: Portal accessibility and DOM isolation test.
- `test_fortune_spreadsheet.ts`: JSON string parsing, matrix reconstruction, styles, and merges.
- `test_pdf_export.ts`: Multi-sheet vector PDF formatting and table compilation.
- `test_dynamic_family_data_schema.ts`: Dynamic public form schema and validation tests.
- `test_master_family_template_and_event_creation.ts`: Blueprint propagation and token link tests.

### Production Database Seeding
To reset the database to a clean production state (roles, permissions, default master templates, and production admin accounts, with zero mock events):
```bash
pnpm run seed
# or
pnpm run seed:py
```

### Deploying to Production (Oracle Cloud VPS)
Full deployment instructions are documented in [`DEPLOY.md`](file:///Users/jonathankent/Documents/Code/xeno/DEPLOY.md).
```bash
# On the Oracle Ubuntu VPS:
git pull origin main
docker compose up -d --build
```
This builds the Next.js standalone container, restarts the app service, and Caddy automatically manages HTTPS certificates for `xenoent.my.id`.


<!-- LAST_ARCH_SYNC -->
> **Last Architecture Sync**: 7457457 feat: add SUPER_ADMIN role, user impersonation system, visual badges, and fix template 409 conflict
e2c54b4 chore: update ai_context.md with latest architecture sync [skip ci]
42fc6cc feat: add loading skeletons, dynamic spreadsheet import, and performance navigation tests