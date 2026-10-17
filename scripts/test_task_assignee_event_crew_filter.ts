import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { TaskModal } from "../components/events/task-modal";
import type { EventCrew, Profile } from "../types/database";

console.log("=== Testing Task Assignee Event Crew Filter ===");

// 1. Verify File Source Implementations
console.log("\n--- 1. Testing Code Structure & Contracts ---");
const taskModalPath = path.resolve(process.cwd(), "components/events/task-modal.tsx");
const taskModalCode = fs.readFileSync(taskModalPath, "utf-8");
assert(taskModalCode.includes("assignedCrew?: EventCrew[]"), "TaskModal must accept assignedCrew prop");
assert(taskModalCode.includes('.from("event_crew")'), "TaskModal must include event_crew fallback query");
assert(taskModalCode.includes('.eq("event_id", eventId)'), "TaskModal fallback must filter by event_id");
assert(taskModalCode.includes('select("*, profile:profiles(*)")'), "TaskModal fallback must join profile:profiles(*)");
console.log("✔ TaskModal prop and fallback fetch logic verified.");

const eventTasksSectionPath = path.resolve(process.cwd(), "components/events/event-tasks-section.tsx");
const eventTasksSectionCode = fs.readFileSync(eventTasksSectionPath, "utf-8");
assert(eventTasksSectionCode.includes("assignedCrew?: EventCrew[]"), "EventTasksSection must accept assignedCrew prop");
assert(eventTasksSectionCode.includes("assignedCrew={assignedCrew}"), "EventTasksSection must forward assignedCrew to TaskModal");
console.log("✔ EventTasksSection prop forwarding verified.");

const eventCrewSectionPath = path.resolve(process.cwd(), "components/events/event-crew-section.tsx");
const eventCrewSectionCode = fs.readFileSync(eventCrewSectionPath, "utf-8");
assert(eventCrewSectionCode.includes("onCrewChange?: (crew: EventCrew[]) => void"), "EventCrewSection must accept onCrewChange prop");
assert(eventCrewSectionCode.includes("onCrewChange?.("), "EventCrewSection must call onCrewChange on update");
console.log("✔ EventCrewSection onCrewChange callback verified.");

const eventDetailTabsPath = path.resolve(process.cwd(), "components/events/event-detail-tabs.tsx");
const eventDetailTabsCode = fs.readFileSync(eventDetailTabsPath, "utf-8");
assert(eventDetailTabsCode.includes("useState<EventCrew[]>(crew)"), "EventDetailTabs must maintain currentCrew state");
assert(eventDetailTabsCode.includes("onCrewChange={setCurrentCrew}"), "EventDetailTabs must connect onCrewChange to EventCrewSection");
assert(eventDetailTabsCode.includes("assignedCrew={currentCrew}"), "EventDetailTabs must pass assignedCrew to EventTasksSection");
console.log("✔ EventDetailTabs state synchronization verified.");

// 2. Testing Combobox Filtering: ONLY Assigned Crew Appears
console.log("\n--- 2. Testing Dropdown Filtering with Assigned Crew ---");

const mockAssignedCrew: EventCrew[] = [
  {
    id: "crew-row-1",
    event_id: "evt-wedding-bali",
    profile_id: "usr-alice",
    role_in_event: "Show Director",
    notes: "Main stage coordination",
    created_at: new Date().toISOString(),
    profile: {
      id: "usr-alice",
      full_name: "Alice Dirgantara",
      email: "alice@xenoent.com",
      role: "staff",
      phone: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "crew-row-2",
    event_id: "evt-wedding-bali",
    profile_id: "usr-bob",
    role_in_event: "Sound Specialist",
    notes: "FOH audio lead",
    created_at: new Date().toISOString(),
    profile: {
      id: "usr-bob",
      full_name: "Bob Sanjaya",
      email: "bob@xenoent.com",
      role: "staff",
      phone: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

// Render TaskModal with Alice assigned
const htmlWithAlice = renderToString(
  React.createElement(TaskModal, {
    isOpen: true,
    onClose: () => {},
    eventId: "evt-wedding-bali",
    task: {
      id: "task-1",
      event_id: "evt-wedding-bali",
      title: "Direct Grand Entrance",
      description: "Direct bridal party",
      assigned_to: "usr-alice",
      priority: "high",
      status: "todo",
      due_date: "2026-10-20T10:00:00Z",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    assignedCrew: mockAssignedCrew,
    onSubmit: () => {},
    isPending: false,
  })
);

// Assert Alice appears with her event role
assert(htmlWithAlice.includes("Alice Dirgantara"), "Combobox must display selected assigned crew member Alice");
assert(htmlWithAlice.includes("SHOW DIRECTOR"), "Combobox must display event role badge SHOW DIRECTOR");
assert(!htmlWithAlice.includes("Bob Sanjaya"), "Combobox trigger for Alice must not show Bob");

// Render TaskModal with Bob assigned
const htmlWithBob = renderToString(
  React.createElement(TaskModal, {
    isOpen: true,
    onClose: () => {},
    eventId: "evt-wedding-bali",
    task: {
      id: "task-2",
      event_id: "evt-wedding-bali",
      title: "Audio Rigging Check",
      description: "Check FOH wireless mics",
      assigned_to: "usr-bob",
      priority: "medium",
      status: "in_progress",
      due_date: "2026-10-20T09:00:00Z",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    assignedCrew: mockAssignedCrew,
    onSubmit: () => {},
    isPending: false,
  })
);

// Assert Bob appears with his event role
assert(htmlWithBob.includes("Bob Sanjaya"), "Combobox must display selected assigned crew member Bob");
assert(htmlWithBob.includes("SOUND SPECIALIST"), "Combobox must display event role badge SOUND SPECIALIST");
assert(!htmlWithBob.includes("Alice Dirgantara"), "Combobox trigger for Bob must not show Alice");

console.log("✔ Combobox strictly displays only officially assigned event crew with their event roles.");

// 3. Testing Empty Assigned Crew State
console.log("\n--- 3. Testing Empty Assigned Crew State ---");
const htmlWithEmptyCrew = renderToString(
  React.createElement(TaskModal, {
    isOpen: true,
    onClose: () => {},
    eventId: "evt-empty",
    assignedCrew: [],
    onSubmit: () => {},
    isPending: false,
  })
);

assert(htmlWithEmptyCrew.includes("-- Belum Ditugaskan --"), "Combobox must render unassigned label when value is empty");
assert(!htmlWithEmptyCrew.includes("Alice Dirgantara"), "Empty assigned crew must not show Alice");
console.log("✔ Empty assigned crew state safely handles empty list.");

// 4. Testing Backward Compatibility (crewProfiles fallback)
console.log("\n--- 4. Testing Backward Compatibility ---");
const mockProfiles: Profile[] = [
  {
    id: "usr-legacy-1",
    full_name: "Legacy Staff Member",
    email: "legacy@xenoent.com",
    role: "staff",
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const htmlLegacy = renderToString(
  React.createElement(TaskModal, {
    isOpen: true,
    onClose: () => {},
    eventId: "evt-legacy",
    task: {
      id: "task-legacy",
      event_id: "evt-legacy",
      title: "Legacy Task",
      description: null,
      assigned_to: "usr-legacy-1",
      priority: "low",
      status: "todo",
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    crewProfiles: mockProfiles,
    onSubmit: () => {},
    isPending: false,
  })
);

assert(htmlLegacy.includes("Legacy Staff Member"), "Legacy calls with crewProfiles must continue to render correctly");
console.log("✔ Backward compatibility with crewProfiles preserved.");

console.log("\n=== ALL TASK ASSIGNEE EVENT CREW FILTER TESTS PASSED! 🚀 ===");
