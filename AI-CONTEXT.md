# AI-CONTEXT.md — Xeno Entertainment System

> **Source of Truth for AI Assistants & LLMs**  
> Read this file first before inspecting or modifying this codebase. This document outlines the definitive architecture, tech stack, data models, and conventions for the Xeno Entertainment application.

---

## 1. Project Domain & Purpose

**Xeno Entertainment** is an internal event management and production platform designed for event organizers, stage crews, technical directors, and client managers. It manages:
- **Events**: Production timelines, schedules, venue details, budgets, and statuses.
- **Crew Tasks**: Granular production tasks (sound check, rundown, lighting setup) assigned to internal staff with priority flags and status tracking.
- **Vendors**: External audio/lighting/catering vendors contracted for events.
- **Clients**: Corporate and individual clients commissioning events.
- **Team**: Internal staff profiles synchronized with Supabase Auth.

---

## 2. Definitive Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^5.x` | Strict mode across entire application |
| **Language (Scripting)** | Python | `3.12+` | Background tooling & data processing (strictly in `.venv`) |
| **Database Language** | PostgreSQL (SQL) | `15+` | Schema, RLS, functions, and triggers |
| **Frontend Framework** | Next.js (App Router) | `16.4.0` | React Server Components (RSC), SSR, Turbopack |
| **UI Library** | React | `19.3.0` | Core UI engine |
| **Styling** | Tailwind CSS | `^4.x` | Dark mode slate/indigo aesthetic |
| **Icons** | Lucide React | `^1.54.0` | Consistent iconography |
| **Backend Architecture**| Next.js Server Actions | Native | `"use server"` mutations & data caching |
| **BaaS / Database** | Supabase | Cloud / Local | PostgreSQL, Auth (GoTrue), Storage, Row-Level Security (RLS) |
| **Supabase SSR SDK** | `@supabase/ssr` | `^0.12.7` | Cookie-based auth synchronization |
| **Package Manager** | `pnpm` | `11.12.0` | Deterministic dependency management |

---

## 3. Directory & File Structure

```text
xeno/
├── .venv/                         # Isolated Python virtual environment (ignored in git)
├── .env.example                   # Template for environment variables
├── .env.local                     # Local secrets (Supabase credentials)
├── .gitignore                     # Git ignore rules
├── AGENTS.md                      # Workspace instructions & style guide
├── AI-CONTEXT.md                  # This file: definitive architectural source of truth
├── PROGRESS.md                    # Feature status, completed milestones, and backlog
├── README.md                      # Human-facing onboarding and setup guide
├── requirements.txt               # Python dependencies for background scripts
├── package.json                   # Node.js project manifest & scripts
│
├── app/                           # Next.js App Router root
│   ├── layout.tsx                 # Root HTML shell
│   ├── globals.css                # Tailwind CSS directives
│   ├── login/page.tsx             # Login & registration view
│   ├── auth/actions.ts            # Server Actions: login, signup, logout
│   ├── auth/callback/route.ts     # Auth exchange route handler
│   └── (dashboard)/               # Authenticated route group
│       ├── layout.tsx             # Dashboard shell: Sidebar + Navbar
│       ├── page.tsx               # Operations overview: stats, events, tasks
│       ├── clients/page.tsx       # Client database directory
│       ├── vendors/page.tsx       # Vendor directory by trade
│       ├── team/page.tsx          # Staff directory
│       └── events/
│           ├── page.tsx           # Event catalog listing
│           ├── actions.ts         # Server Actions: createEvent, tasks
│           ├── new/page.tsx       # New event creation form
│           └── [id]/page.tsx      # Event detail view
│
├── components/                    # Reusable React UI components
│   ├── navbar.tsx                 # Top navigation with user status & role badge
│   ├── sidebar.tsx                # Brand & navigation menu with logout
│   ├── dashboard/
│   │   └── monthly-calendar.tsx   # Interactive Monthly Calendar with event chips
│   └── ui/
│       └── date-time-picker.tsx   # Interactive Date & Time Picker popover
├── lib/                           # Shared utilities and Supabase SSR clients
│   ├── auth.ts                    # getCurrentProfile(), isAdmin() role helpers
│   ├── utils.ts                   # cn(), formatIDR(), formatDate()
│   └── supabase/                  # client.ts, server.ts, middleware.ts
├── middleware.ts                  # Root Next.js middleware (route interceptor)
├── types/database.ts              # TypeScript interfaces matching Supabase tables
├── supabase/                      # PostgreSQL DDL schema & seed data
├── scripts/
│   ├── test-helpers.ts            # Self-contained zero-framework test suite
│   ├── check-connection.ts        # Next.js/TypeScript live Supabase connectivity test
│   ├── db_client.py               # Python Supabase client factory (loads .env)
│   └── check_connection.py        # Python live Supabase connectivity test
```

---

## 4. Complete Database Schema (PostgreSQL / Supabase)

### 4.1 Custom Enums
```sql
create type event_status as enum ('draft', 'planning', 'confirmed', 'ongoing', 'completed', 'cancelled');
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type user_role as enum ('admin', 'manager', 'staff');
create type vendor_status as enum ('proposed', 'contracted', 'paid');
```

### 4.2 Tables & Relationships

#### `public.profiles`
Linked 1:1 to `auth.users` via trigger `on_auth_user_created`.
- `id` (UUID, PK, references `auth.users.id` ON DELETE CASCADE)
- `full_name` (TEXT NOT NULL)
- `email` (TEXT NOT NULL UNIQUE)
- `role` (user_role, DEFAULT 'staff')
- `phone` (TEXT, NULL)
- `avatar_url` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

#### `public.clients`
Customers commissioning events.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `name` (TEXT NOT NULL)
- `company` (TEXT, NULL)
- `email` (TEXT, NULL)
- `phone` (TEXT NOT NULL)
- `address` (TEXT, NULL)
- `notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())

#### `public.vendors`
Production suppliers (sound, lighting, catering, LED screens).
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `name` (TEXT NOT NULL)
- `category` (TEXT NOT NULL)
- `pic_name` (TEXT NOT NULL)
- `phone` (TEXT NOT NULL)
- `email` (TEXT, NULL)
- `address` (TEXT, NULL)
- `notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())

#### `public.events`
Central event entity.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `title` (TEXT NOT NULL)
- `description` (TEXT, NULL)
- `client_id` (UUID, FK -> `clients.id` ON DELETE SET NULL)
- `venue` (TEXT NOT NULL)
- `start_date` (TIMESTAMPTZ NOT NULL)
- `end_date` (TIMESTAMPTZ NOT NULL)
- `status` (event_status, DEFAULT 'planning')
- `budget` (NUMERIC(14,2), DEFAULT 0.00)
- `created_by` (UUID, FK -> `profiles.id` ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

#### `public.event_tasks`
Operational checklist items tied to an event.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `event_id` (UUID, FK -> `events.id` ON DELETE CASCADE)
- `title` (TEXT NOT NULL)
- `description` (TEXT, NULL)
- `assigned_to` (UUID, FK -> `profiles.id` ON DELETE SET NULL)
- `due_date` (TIMESTAMPTZ, NULL)
- `status` (task_status, DEFAULT 'todo')
- `priority` (task_priority, DEFAULT 'medium')
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

#### `public.event_vendors` (Junction)
Contracts mapping vendors to specific events.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `event_id` (UUID, FK -> `events.id` ON DELETE CASCADE)
- `vendor_id` (UUID, FK -> `vendors.id` ON DELETE CASCADE)
- `service_name` (TEXT NOT NULL)
- `cost` (NUMERIC(14,2), DEFAULT 0.00)
- `status` (vendor_status, DEFAULT 'proposed')
- `notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- Unique constraint: `UNIQUE(event_id, vendor_id)`

---

## 5. Architectural Invariants & Rules for AI Agents

When implementing changes or extending this project, observe these rules:

1. **Next.js 16 Dynamic Route Params**:
   In Next.js 15+, `params` in page components is a `Promise`. Always await it:
   ```typescript
   export default async function Page({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
   }
   ```
2. **Server-Side Data Safety & Mock Fallbacks**:
   When querying Supabase in Server Components, always provide a resilient mock fallback if the database has not yet been seeded or environment variables are in demo mode. This ensures local developers and reviewers can run the UI without crashing.
3. **No Unrequested Backends**:
   Do **not** add Express, Nest, or FastAPI servers for application features. Next.js Server Actions (`"use server"`) handle all API mutations.
4. **Strict Python Isolation**:
   Any Python tooling or scripts must run inside the local `.venv/` virtual environment. Never install packages globally. Keep `requirements.txt` updated.
5. **Cookie Session Sync**:
   Always use `@/lib/supabase/server` (`createClient()`) in Server Components and Server Actions. Never instantiate raw Supabase clients without cookie handlers on the server.
6. **Cache Invalidation**:
   After any mutation in Server Actions (`actions.ts`), call `revalidatePath('/affected-route')` before redirecting or returning.
7. **RBAC Security Invariant**:
   Admin (`role = 'admin'`) has full CRUD across all entities (Events, Tasks, Vendors, Clients, Staff profiles). Staff (`role = 'staff'`) has operational Read/Create/Update capabilities but cannot delete entities or manage user accounts. RLS is enforced at the database level using `public.is_admin()`.
8. **Interactive Date/Time Pickers**:
   All date and time inputs must use the `DateTimePicker` component (`components/ui/date-time-picker.tsx`) providing an interactive mini-calendar popover and hour/minute selector.



