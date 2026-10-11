"""Xeno Entertainment - Event Task Reminder Automation Script.

Queries event_tasks in Supabase for incomplete tasks that are:
1. Marked with 'urgent' priority, OR
2. Have a due date of today or tomorrow (including overdue tasks).

Generates a clean terminal report and provides dispatch hooks for future
notifications (Email / Slack / WhatsApp).
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from scripts.db_client import get_supabase_client

DEMO_TASKS = [
    {
        "id": "task-demo-1",
        "title": "Finalisasi Audio Rigging & Line Check",
        "description": "Pastikan semua speaker array dan wireless mic frekuensi teruji tanpa interferensi.",
        "status": "in_progress",
        "priority": "urgent",
        "due_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "event": {"title": "Sinar Jaya Annual Gala 2026"},
        "assignee": {
            "full_name": "Rian Kru Operasional",
            "email": "rian@xenoent.com",
            "phone": "+62 813-3333-4444",
        },
    },
    {
        "id": "task-demo-2",
        "title": "Koordinasi Loading Dermaga VIP",
        "description": "Ambil surat izin jalan dari dinas perhubungan dan serahkan ke satpam venue.",
        "status": "todo",
        "priority": "high",
        "due_date": datetime.now(timezone.utc).isoformat(),
        "event": {"title": "Sinar Jaya Annual Gala 2026"},
        "assignee": {
            "full_name": "Jonathan Admin",
            "email": "admin@xenoent.com",
            "phone": "+62 812-1111-2222",
        },
    },
    {
        "id": "task-demo-3",
        "title": "Briefing Master of Ceremony (MC) & Rundown Rehearsal",
        "description": "Sinkronisasi cue musik pembuka dengan lighting cues dan video bumper.",
        "status": "todo",
        "priority": "urgent",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "event": {"title": "Tech Summit Jakarta 2026"},
        "assignee": None,
    },
]


def classify_task_urgency(task: dict[str, Any], today_date: Any) -> tuple[bool, str, int | None]:
    """Determines whether a task requires reminder and categorizes urgency."""
    priority = str(task.get("priority") or "").lower()
    is_urgent_priority = priority == "urgent"

    due_date_str = task.get("due_date")
    if not due_date_str:
        if is_urgent_priority:
            return True, "URGENT PRIORITY", None
        return False, "", None

    try:
        due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        due_date = due_dt.date()
        days_diff = (due_date - today_date).days

        if days_diff < 0:
            return True, f"OVERDUE ({abs(days_diff)}d)", days_diff
        elif days_diff == 0:
            return True, "DUE TODAY", days_diff
        elif days_diff == 1:
            return True, "DUE TOMORROW", days_diff
        elif is_urgent_priority:
            return True, f"URGENT PRIORITY (in {days_diff}d)", days_diff
    except Exception:
        if is_urgent_priority:
            return True, "URGENT PRIORITY", None

    return False, "", None



def fetch_pending_tasks(client: Any) -> list[dict[str, Any]]:
    """Queries Supabase for non-completed event tasks enriched with event and assignee."""
    try:
        res = (
            client.table("event_tasks")
            .select("*, event:events(id, title), assignee:profiles(full_name, email, phone)")
            .neq("status", "done")
            .order("due_date", desc=False)
            .execute()
        )
        return res.data or []
    except Exception as e:
        print(f"[!] Warning: Query error from Supabase: {e}")
        return []


def format_report(tasks_with_urgency: list[tuple[dict[str, Any], str, int | None]]) -> str:
    """Formats tasks into a clean terminal report with Apple-like minimalism."""
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    total_count = len(tasks_with_urgency)

    lines = []
    lines.append("=" * 76)
    lines.append("  XENO ENTERTAINMENT — EVENT TASK REMINDER REPORT")
    lines.append(f"  Generated: {now_str}")
    lines.append(f"  Status: {total_count} task(s) requiring attention")
    lines.append("=" * 76)

    if not tasks_with_urgency:
        lines.append("\n  ✓ All operational tasks are on schedule. No urgent reminders pending.")
        lines.append("=" * 76)
        return "\n".join(lines)

    lines.append("")

    # Sort: Overdue first (days_diff < 0), then today (0), then tomorrow (1), then rest
    def sort_key(item: tuple[dict[str, Any], str, int | None]):
        diff = item[2]
        return diff if diff is not None else 999

    sorted_tasks = sorted(tasks_with_urgency, key=sort_key)

    for idx, (task, urgency_tag, _) in enumerate(sorted_tasks, 1):
        event_name = (task.get("event") or {}).get("title") or "Event Tidak Ditentukan"
        title = task.get("title") or "Tanpa Judul"
        status = task.get("status") or "todo"
        priority = (task.get("priority") or "medium").upper()
        due_date_raw = task.get("due_date")

        due_date_display = "Tidak ada tenggat"
        if due_date_raw:
            try:
                dt = datetime.fromisoformat(due_date_raw.replace("Z", "+00:00"))
                due_date_display = dt.strftime("%d %b %Y, %H:%M UTC")
            except Exception:
                due_date_display = due_date_raw

        assignee = task.get("assignee")
        if assignee and assignee.get("full_name"):
            contact_parts = [assignee.get("full_name")]
            email = assignee.get("email")
            phone = assignee.get("phone")
            if email:
                contact_parts.append(email)
            if phone:
                contact_parts.append(phone)
            assignee_str = " | ".join(contact_parts)
        else:
            assignee_str = "⚠️ Belum ditugaskan (Unassigned)"

        desc = task.get("description")

        badge = f"[{urgency_tag}]"
        lines.append(f"  {idx}. {badge} {title}")
        lines.append(f"     Acara     : {event_name}")
        lines.append(f"     Prioritas : {priority}  |  Status: {status.upper()}")
        lines.append(f"     Tenggat   : {due_date_display}")
        lines.append(f"     Petugas   : {assignee_str}")
        if desc:
            lines.append(f"     Catatan   : {desc}")
        lines.append("  " + "-" * 72)

    # Summary Breakdown
    overdue_count = sum(1 for _, tag, diff in tasks_with_urgency if diff is not None and diff < 0)
    today_count = sum(1 for _, tag, diff in tasks_with_urgency if diff == 0)
    tomorrow_count = sum(1 for _, tag, diff in tasks_with_urgency if diff == 1)
    urgent_priority_count = sum(
        1 for t, _, _ in tasks_with_urgency if str(t.get("priority") or "").lower() == "urgent"
    )

    lines.append("")
    lines.append(
        f"  Ringkasan: {overdue_count} Terlambat | {today_count} Hari Ini | {tomorrow_count} Besok | {urgent_priority_count} Prioritas Urgent"
    )
    lines.append("=" * 76)
    return "\n".join(lines)


def dispatch_notifications(tasks_with_urgency: list[tuple[dict[str, Any], str, int | None]]) -> None:
    """Extension hook for future notification adapters (Email, Slack, WhatsApp).

    Example integrations:
    - Email: Resend / SendGrid API
    - Slack: Incoming Webhook
    - WhatsApp: Twilio / Whapi API
    """
    pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Xeno Entertainment - Event Task Reminder Background Script"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run script with realistic sample tasks to preview report formatting",
    )
    args = parser.parse_args()

    today_date = datetime.now(timezone.utc).date()

    if args.demo:
        print("[*] Running in DEMO mode with sample event tasks dataset...\n")
        raw_tasks = DEMO_TASKS
    else:
        try:
            client = get_supabase_client()
            raw_tasks = fetch_pending_tasks(client)
        except Exception as e:
            print(f"[!] Database connection error: {e}")
            print("[*] Falling back to demo mode for preview...\n")
            raw_tasks = DEMO_TASKS

    urgent_tasks = []
    for t in raw_tasks:
        needs_reminder, tag, days_diff = classify_task_urgency(t, today_date)
        if needs_reminder:
            urgent_tasks.append((t, tag, days_diff))

    report = format_report(urgent_tasks)
    print(report)

    # Optional future dispatch hook
    dispatch_notifications(urgent_tasks)


if __name__ == "__main__":
    main()
