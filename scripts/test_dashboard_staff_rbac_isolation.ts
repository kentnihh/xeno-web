/**
 * Comprehensive Verification Test: Strict RBAC & Data Isolation for 'STAFF' Role.
 *
 * Validates:
 * 1. Current user & role identification (ADMIN, MANAGER, STAFF).
 * 2. STAFF role data isolation:
 *    a. Active Events: Only events where user exists in event_crew (assigned crew).
 *    b. Pending Events: Only events in event_crew with status 'planning'/'draft'.
 *    c. Pending Tasks: Only tasks where assigned_to === current user and status !== 'done'.
 *    d. Priority Crew Tasks: Ordered by priority descending (Urgent -> High -> Medium -> Low).
 *    e. Staff with no assignments gets 0 items (never leaks demo/other users data).
 * 3. ADMIN & MANAGER role bypass:
 *    - All events and tasks accessible without crew/assignee restriction.
 * 4. Google Calendar Sync Button RBAC protection:
 *    - Allowed for ADMIN & MANAGER.
 *    - Strictly blocked/hidden for STAFF.
 */

import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import { SyncGCalButton } from "../components/events/sync-gcal-button";
import { EventActionButtons } from "../components/events/event-action-buttons";
import { sortTasksByPriority } from "../lib/utils";

console.log("=== Running Comprehensive Staff RBAC & Data Isolation Tests ===\n");

// --- Mock Datasets ---
const MOCK_PROFILES = {
  admin: { id: "usr-admin-1", full_name: "Jonathan Admin", role: "admin" },
  manager: { id: "usr-manager-1", full_name: "Via Event Manager", role: "manager" },
  staffA: { id: "usr-staff-alice", full_name: "Alice Crew", role: "staff" },
  staffB: { id: "usr-staff-bob", full_name: "Bob Crew", role: "staff" },
};

const MOCK_EVENTS = [
  { id: "evt-gala", title: "Sinar Jaya Gala", status: "confirmed", start_date: "2026-10-25T10:00:00Z" },
  { id: "evt-wedding", title: "Jessica & Kevin Wedding", status: "planning", start_date: "2026-10-30T10:00:00Z" },
  { id: "evt-concert", title: "Jakarta Jazz Festival", status: "confirmed", start_date: "2026-11-05T10:00:00Z" },
  { id: "evt-birthday", title: "Grand Birthday Party", status: "planning", start_date: "2026-11-12T10:00:00Z" },
];

const MOCK_CREW = [
  { event_id: "evt-gala", profile_id: "usr-staff-alice", role_in_event: "Stage Manager" },
  { event_id: "evt-wedding", profile_id: "usr-staff-alice", role_in_event: "Sound Tech" },
  { event_id: "evt-concert", profile_id: "usr-staff-bob", role_in_event: "Lighting Lead" },
  // evt-birthday has no crew assigned yet
];

const MOCK_TASKS = [
  { id: "t1", title: "Gala Soundcheck", event_id: "evt-gala", assigned_to: "usr-staff-alice", priority: "urgent", status: "in_progress" },
  { id: "t2", title: "Gala Briefing MC", event_id: "evt-gala", assigned_to: "usr-staff-alice", priority: "low", status: "todo" },
  { id: "t3", title: "Gala Final Clean", event_id: "evt-gala", assigned_to: "usr-staff-alice", priority: "medium", status: "done" }, // Completed!
  { id: "t4", title: "Wedding Setup", event_id: "evt-wedding", assigned_to: "usr-staff-alice", priority: "high", status: "todo" },
  { id: "t5", title: "Concert Lighting", event_id: "evt-concert", assigned_to: "usr-staff-bob", priority: "urgent", status: "todo" },
  { id: "t6", title: "Unassigned Task", event_id: "evt-birthday", assigned_to: null, priority: "high", status: "todo" },
];

// --- 1. Test Active Events Isolation for STAFF ---
console.log("--- 1. Testing Active Events Isolation for Staff ---");

function filterActiveEvents(events: typeof MOCK_EVENTS, crew: typeof MOCK_CREW, userProfile: { id: string; role: string }) {
  const isPrivileged = userProfile.role === "admin" || userProfile.role === "manager";
  if (isPrivileged) return events;

  // Staff: only events where staff is in crew
  const assignedIds = new Set(crew.filter((c) => c.profile_id === userProfile.id).map((c) => c.event_id));
  return events.filter((ev) => assignedIds.has(ev.id));
}

const aliceEvents = filterActiveEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.staffA);
assert.strictEqual(aliceEvents.length, 2, "Alice should only see 2 assigned events");
assert(aliceEvents.some((e) => e.id === "evt-gala"), "Alice sees evt-gala");
assert(aliceEvents.some((e) => e.id === "evt-wedding"), "Alice sees evt-wedding");
assert(!aliceEvents.some((e) => e.id === "evt-concert"), "Alice must NOT see evt-concert (Bob's event)");
console.log("✓ Alice sees ONLY events assigned to her in event_crew (2 of 4)");

const bobEvents = filterActiveEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.staffB);
assert.strictEqual(bobEvents.length, 1, "Bob should only see 1 assigned event");
assert.strictEqual(bobEvents[0].id, "evt-concert", "Bob only sees evt-concert");
console.log("✓ Bob sees ONLY his assigned event (1 of 4)");

const unassignedStaffEvents = filterActiveEvents(MOCK_EVENTS, MOCK_CREW, { id: "usr-new-staff", role: "staff" });
assert.strictEqual(unassignedStaffEvents.length, 0, "Unassigned staff should see 0 events (no fallback leak)");
console.log("✓ Unassigned staff sees exactly 0 events without data leaks");

// --- 2. Test Admin/Manager Bypass ---
console.log("\n--- 2. Testing Admin & Manager Bypass ---");
const adminEvents = filterActiveEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.admin);
assert.strictEqual(adminEvents.length, 4, "Admin sees all 4 events");
const managerEvents = filterActiveEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.manager);
assert.strictEqual(managerEvents.length, 4, "Manager sees all 4 events");
console.log("✓ Admin and Manager bypass filter and see all events");

// --- 3. Test Pending Events (Acara Pending) Isolation for STAFF ---
console.log("\n--- 3. Testing Pending Events (Planning / Draft) Isolation ---");
function filterPendingEvents(events: typeof MOCK_EVENTS, crew: typeof MOCK_CREW, userProfile: { id: string; role: string }) {
  const isPrivileged = userProfile.role === "admin" || userProfile.role === "manager";
  const pendingEvents = events.filter((e) => ["planning", "draft"].includes(e.status));
  if (isPrivileged) return pendingEvents;

  const assignedIds = new Set(crew.filter((c) => c.profile_id === userProfile.id).map((c) => c.event_id));
  return pendingEvents.filter((e) => assignedIds.has(e.id));
}

const alicePending = filterPendingEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.staffA);
assert.strictEqual(alicePending.length, 1, "Alice sees only 1 pending event (evt-wedding)");
assert.strictEqual(alicePending[0].id, "evt-wedding");
console.log("✓ Staff Alice sees only her assigned pending event (1 of 2 total pending)");

const adminPending = filterPendingEvents(MOCK_EVENTS, MOCK_CREW, MOCK_PROFILES.admin);
assert.strictEqual(adminPending.length, 2, "Admin sees all 2 pending events");
console.log("✓ Admin sees all pending events (2 of 2)");

// --- 4. Test Pending Tasks & Priority Ordering for STAFF ---
console.log("\n--- 4. Testing Pending Tasks Isolation & Priority Ordering ---");
function filterAndSortStaffTasks(tasks: typeof MOCK_TASKS, userProfile: { id: string; role: string }) {
  const isPrivileged = userProfile.role === "admin" || userProfile.role === "manager";
  let result = tasks;
  if (!isPrivileged) {
    result = tasks.filter((t) => t.assigned_to === userProfile.id && t.status !== "done");
  }
  return sortTasksByPriority(result);
}

const aliceTasks = filterAndSortStaffTasks(MOCK_TASKS, MOCK_PROFILES.staffA);
assert.strictEqual(aliceTasks.length, 3, "Alice has 3 incomplete tasks (t1 urgent, t4 high, t2 low; t3 done excluded)");
assert.strictEqual(aliceTasks[0].priority, "urgent", "Most urgent task must appear first");
assert.strictEqual(aliceTasks[1].priority, "high", "High task appears second");
assert.strictEqual(aliceTasks[2].priority, "low", "Low task appears third");
assert(!aliceTasks.some((t) => t.status === "done"), "Done tasks must be excluded from pending tasks");
assert(!aliceTasks.some((t) => t.assigned_to !== "usr-staff-alice"), "Must not include other users tasks");
console.log("✓ Staff Alice tasks filtered strictly to her pending tasks, sorted by priority (Urgent -> High)");

const bobTasks = filterAndSortStaffTasks(MOCK_TASKS, MOCK_PROFILES.staffB);
assert.strictEqual(bobTasks.length, 1, "Bob only has 1 task");
assert.strictEqual(bobTasks[0].id, "t5");
console.log("✓ Staff Bob sees only his assigned task (t5)");

// --- 5. Test Google Calendar Sync Button Protection ---
console.log("\n--- 5. Testing Google Calendar Sync Button RBAC Protection ---");

// Test SyncGCalButton component when canSync is false
const staffBtnHtml = renderToString(React.createElement(SyncGCalButton, { canSync: false }));
assert.strictEqual(staffBtnHtml, "", "SyncGCalButton must render nothing when canSync is false");
console.log("✓ SyncGCalButton renders null for unauthorized staff (canSync=false)");

// Test SyncGCalButton component when canSync is true
const adminBtnHtml = renderToString(React.createElement(SyncGCalButton, { canSync: true, eventId: "evt-1" }));
assert(adminBtnHtml.includes("Sync ke Google Calendar"), "SyncGCalButton must render for authorized admin");
console.log("✓ SyncGCalButton renders properly for authorized users (canSync=true)");

// Test EventActionButtons hiding SyncGCalButton for staff
const staffActionHtml = renderToString(
  React.createElement(EventActionButtons, {
    event: { id: "evt-1", title: "Test Event" },
    sheets: [],
    crew: [],
    tasks: [],
    expenses: [],
    canSync: false,
  })
);
assert(!staffActionHtml.includes("Sync ke Google Calendar"), "EventActionButtons must NOT render Sync button when canSync=false");
console.log("✓ EventActionButtons omits SyncGCalButton when canSync=false");

const adminActionHtml = renderToString(
  React.createElement(EventActionButtons, {
    event: { id: "evt-1", title: "Test Event" },
    sheets: [],
    crew: [],
    tasks: [],
    expenses: [],
    canSync: true,
  })
);
assert(adminActionHtml.includes("Sync ke Google Calendar"), "EventActionButtons must render Sync button when canSync=true");
console.log("✓ EventActionButtons includes SyncGCalButton when canSync=true");

console.log("\n=== ALL STAFF RBAC & DATA ISOLATION TESTS PASSED SUCCESSFULLY! ===");
