# Xeno Entertainment — Event Operations System

Internal operations and stage production management platform for Xeno Entertainment. Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, and Supabase.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v10.x` or higher (`corepack enable && corepack use pnpm@latest`)
- **Python**: `v3.12+` (for maintenance and background data scripts)
- **Supabase Account**: A Supabase project (or local Supabase CLI instance)

---

## 2. Environment Variables Setup

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: For local development without active Supabase keys, the app includes fallback mock data to allow UI testing.

---

## 3. Database Initialization

Execute the SQL scripts in the Supabase SQL Editor in the following order:

1. **Schema DDL**: `supabase/schema.sql` (Creates enums, tables, triggers, and RLS policies).
2. **Seed Data**: `supabase/seed.sql` (Inserts demo clients, vendors, events, and tasks).

---

## 4. Node.js Application Setup

```bash
# 1. Install Node.js dependencies
pnpm install

# 2. Run unit self-checks
pnpm test

# 3. Start development server
pnpm dev

# 4. Create production build
pnpm build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Strict Python Virtual Environment Rules

To prevent global Python pollution, all Python tooling and background scripts **must** execute strictly inside the isolated `.venv` virtual environment.

### 5.1 Create Virtual Environment (One-time)

Root of the project:

```bash
# macOS / Linux
python3 -m venv .venv

# Windows
python -m venv .venv
```

### 5.2 Activate Environment

**macOS / Linux:**
```bash
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
.venv\Scripts\activate.bat
```

When active, your terminal prompt will show the `(.venv)` prefix.

### 5.3 Install Isolated Dependencies

With `(.venv)` active:

```bash
pip install -r requirements.txt
```

### 5.4 Verify Isolation

Verify that `python` and `pip` point strictly to the `.venv` directory:

```bash
# macOS / Linux
which python
# Output should be: /path/to/xeno/.venv/bin/python

# Windows
where python
# Output should point to: \path\to\xeno\.venv\Scripts\python.exe
```

### 5.5 Exit Environment

```bash
deactivate
```


---

## 6. Background Automation Scripts

### 6.1 Event Task Reminder (`scripts/task_reminder.py`)

Scans Supabase `event_tasks` for uncompleted tasks requiring immediate crew attention:
- Overdue tasks (due date has passed).
- Tasks due today or tomorrow.
- Tasks marked with `urgent` priority.

#### Manual Execution

Using the isolated Python virtual environment:

```bash
# Production mode (queries live Supabase event_tasks table)
.venv/bin/python3 scripts/task_reminder.py

# Demo mode (previews report layout using sample dataset)
.venv/bin/python3 scripts/task_reminder.py --demo
```

On Windows:
```powershell
.venv\Scripts\python.exe scripts\task_reminder.py
```

#### Scheduled Execution via Cron Job

To run the reminder check automatically every morning at 08:00 AM:

1. Open your user crontab editor:
   ```bash
   crontab -e
   ```

2. Add the scheduled entry (replace `/absolute/path/to/xeno` with your actual project root):
   ```bash
   # Run event task reminder daily at 08:00 AM and append logs
   0 8 * * * cd /absolute/path/to/xeno && .venv/bin/python3 scripts/task_reminder.py >> /var/log/xeno-reminders.log 2>&1
   ```

3. Save and exit. The system cron daemon will execute the check daily and write output to the log file.

---

## 7. Architecture & AI Context Reference

- **`AI-CONTEXT.md`**: Complete architectural source of truth for AI agents (tech stack, folder tree, database schema, design invariants).
- **`PROGRESS.md`**: Current implementation state, completed milestones, and pending backlog.

# xeno-web
