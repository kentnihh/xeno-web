import assert from "node:assert";
import { buildEventSummaryPdf } from "../lib/pdf/event-summary-pdf";
import type { Event, EventCrew, EventTask, EventExpense } from "../types/database";

console.log("== Running PDF Export Self-Check ==");

const mockEvent: Event = {
  id: "evt-12345678-abcd",
  title: "Sinar Jaya Annual Gala 2026",
  description: "Annual corporate gathering and celebration",
  client_id: "cl-1",
  venue: "Grand Ballroom Hotel Indonesia Kempinski Jakarta",
  start_date: "2026-10-20T11:00:00.000Z",
  end_date: "2026-10-20T16:00:00.000Z",
  status: "confirmed",
  budget: 250000000,
  created_by: "usr-1",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  client: {
    id: "cl-1",
    name: "PT Sinar Jaya Abadi",
    company: "Sinar Jaya Group",
    email: "contact@sinarjaya.co.id",
    phone: "+62 21-555-1234",
    address: "Jakarta Pusat",
    notes: "VIP Client",
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

const mockCrew: EventCrew[] = [
  {
    id: "crew-1",
    event_id: mockEvent.id,
    profile_id: "usr-1",
    role_in_event: "Stage Manager",
    created_at: "2026-10-01T00:00:00.000Z",
    profile: {
      id: "usr-1",
      full_name: "Jonathan Admin",
      email: "admin@xenoent.com",
      role: "admin",
      phone: "+62 812-1111-2222",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  },
  {
    id: "crew-2",
    event_id: mockEvent.id,
    profile_id: "usr-2",
    role_in_event: "Sound Engineer & Audio Director",
    created_at: "2026-10-01T00:00:00.000Z",
    profile: {
      id: "usr-2",
      full_name: "Rian Kru Operasional",
      email: "rian@xenoent.com",
      role: "staff",
      phone: "+62 813-3333-4444",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  },
];

const mockTasks: EventTask[] = [
  {
    id: "task-1",
    event_id: mockEvent.id,
    title: "Rigging Sound System & FOH Audio Check",
    description: "Line check 32 channel dan sinkronisasi wireless mic Shure.",
    assigned_to: "usr-2",
    due_date: "2026-10-20T08:00:00.000Z",
    status: "in_progress",
    priority: "urgent",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: mockCrew[1].profile,
  },
  {
    id: "task-2",
    event_id: mockEvent.id,
    title: "Briefing MC & Opening Sequence Rehearsal",
    description: "Gladi resik cue pembuka dan video bumper VIP.",
    assigned_to: "usr-1",
    due_date: "2026-10-20T09:30:00.000Z",
    status: "todo",
    priority: "high",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: mockCrew[0].profile,
  },
  {
    id: "task-3",
    event_id: mockEvent.id,
    title: "Closing & Clear Area Ballroom",
    description: "Bongkar panggung dan load-out semua perlengkapan rental.",
    assigned_to: null,
    due_date: "2026-10-20T17:00:00.000Z",
    status: "todo",
    priority: "medium",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: null,
  },
];

const mockExpenses: EventExpense[] = [
  {
    id: "exp-1",
    event_id: mockEvent.id,
    amount: 85000000,
    category: "Vendor",
    expense_date: "2026-10-10",
    status: "Paid",
    notes: "DP Sound system",
    created_at: "2026-10-10T00:00:00.000Z",
  },
];

// Test 1: Full dataset generation
const doc1 = buildEventSummaryPdf({
  event: mockEvent,
  crew: mockCrew,
  tasks: mockTasks,
  expenses: mockExpenses,
});

assert(doc1 !== null, "PDF doc should be returned");
assert(doc1.getNumberOfPages() >= 1, "PDF should have at least 1 page");
const bytes1 = doc1.output("arraybuffer").byteLength;
assert(bytes1 > 2000, `PDF byte length should be > 2000 bytes, got ${bytes1}`);
console.log(`✓ Full PDF export succeeded (${bytes1} bytes, ${doc1.getNumberOfPages()} page(s))`);

// Test 2: Empty crew and tasks fallback
const doc2 = buildEventSummaryPdf({
  event: mockEvent,
  crew: [],
  tasks: [],
});
assert(doc2.getNumberOfPages() === 1, "Empty dataset should fit in 1 page");
const bytes2 = doc2.output("arraybuffer").byteLength;
assert(bytes2 > 2000, `Empty PDF byte length should be > 2000 bytes, got ${bytes2}`);
console.log(`✓ Empty fallback PDF export succeeded (${bytes2} bytes)`);

console.log("== All PDF Export checks passed successfully! ==");
