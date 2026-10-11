"""Unit self-check for task reminder classification and formatting."""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from scripts.task_reminder import classify_task_urgency, format_report


def run_checks():
    today = datetime(2026, 10, 11, tzinfo=timezone.utc).date()

    # 1. Overdue task
    overdue_task = {
        "title": "Overdue task",
        "priority": "medium",
        "due_date": "2026-10-09T10:00:00Z",
    }
    remind, tag, diff = classify_task_urgency(overdue_task, today)
    assert remind is True, "Overdue task should trigger reminder"
    assert "OVERDUE" in tag
    assert diff == -2

    # 2. Due today
    today_task = {
        "title": "Today task",
        "priority": "low",
        "due_date": "2026-10-11T15:00:00Z",
    }
    remind, tag, diff = classify_task_urgency(today_task, today)
    assert remind is True, "Today task should trigger reminder"
    assert tag == "DUE TODAY"
    assert diff == 0

    # 3. Due tomorrow
    tomorrow_task = {
        "title": "Tomorrow task",
        "priority": "high",
        "due_date": "2026-10-12T09:00:00Z",
    }
    remind, tag, diff = classify_task_urgency(tomorrow_task, today)
    assert remind is True, "Tomorrow task should trigger reminder"
    assert tag == "DUE TOMORROW"
    assert diff == 1

    # 4. Due in 5 days, priority medium -> no reminder
    future_task = {
        "title": "Future task",
        "priority": "medium",
        "due_date": "2026-10-16T09:00:00Z",
    }
    remind, tag, diff = classify_task_urgency(future_task, today)
    assert remind is False, "Normal future task should not trigger reminder"

    # 5. Due in 5 days, priority urgent -> triggers reminder
    urgent_future_task = {
        "title": "Urgent future task",
        "priority": "urgent",
        "due_date": "2026-10-16T09:00:00Z",
    }
    remind, tag, diff = classify_task_urgency(urgent_future_task, today)
    assert remind is True, "Urgent priority should trigger reminder"
    assert "URGENT PRIORITY" in tag

    # 6. Report formatting check
    sample_report = format_report([(urgent_future_task, "URGENT PRIORITY (in 5d)", 5)])
    assert "XENO ENTERTAINMENT — EVENT TASK REMINDER REPORT" in sample_report
    assert "Urgent future task" in sample_report
    assert "Ringkasan" in sample_report

    print("✓ All task reminder checks passed successfully!")


if __name__ == "__main__":
    run_checks()
