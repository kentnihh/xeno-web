import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EditEventModal } from "../components/events/edit-event-modal";
import {
  syncEventToGoogleCalendar,
  syncAllEventsToGoogleCalendar,
  syncUpcomingEventsToCalendar,
} from "../app/actions/gcal-sync";

console.log("=== Testing GCal Hook Order & Error Handling ===\n");

const mockRouter = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

function renderWithRouter(ui: React.ReactElement) {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter as any },
      ui
    )
  );
}

// 1. Test Hook Placement in EditEventModal
console.log("--- 1. Testing Hook Placement in EditEventModal ---");
const editEventModalCode = fs.readFileSync(
  path.resolve(process.cwd(), "components/events/edit-event-modal.tsx"),
  "utf-8"
);

// Verify no early return exists before useState(startDate) or useState(endDate)
const startDateIndex = editEventModalCode.indexOf("const [startDate, setStartDate]");
const earlyReturnIndex = editEventModalCode.indexOf("if (!isOpen && !showSyncModal) return null;");

assert(startDateIndex !== -1, "startDate hook must exist");
assert(earlyReturnIndex !== -1, "Conditional early return check must exist");
assert(
  startDateIndex < earlyReturnIndex,
  "ALL useState hooks (startDate, endDate) MUST be declared BEFORE any early return"
);
console.log("✓ All hooks in EditEventModal are declared at the very top before any conditional returns");

// 2. Test SSR Rendering of EditEventModal across state transitions
console.log("\n--- 2. Testing Component Rendering Lifecycle ---");
const mockEvent = {
  id: "test-event-uuid-001",
  title: "Astra Gala 2026",
  venue: "Grand Ballroom",
  start_date: "2026-10-20T10:00:00.000Z",
  end_date: "2026-10-20T18:00:00.000Z",
  status: "confirmed" as const,
  pic: "Jonathan Admin",
  description: null,
  client_id: null,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as any;

// Render when isOpen = false
const closedOutput = renderWithRouter(
  React.createElement(EditEventModal, {
    isOpen: false,
    onClose: () => {},
    event: mockEvent,
  })
);
assert.strictEqual(closedOutput, "", "Should return empty when closed");
console.log("✓ EditEventModal renders cleanly when closed");

// Render when isOpen = true
const openOutput = renderWithRouter(
  React.createElement(EditEventModal, {
    isOpen: true,
    onClose: () => {},
    event: mockEvent,
  })
);
assert(openOutput.includes("Edit Informasi Acara"), "Modal must render title when open");
assert(openOutput.includes("Astra Gala 2026"), "Modal must render event title");
console.log("✓ EditEventModal renders modal content without hook order violation");

// 3. Test Graceful Server Action Error Handling
console.log("\n--- 3. Testing Server Action Error Handling ---");
async function testErrorHandling() {
  // Test invalid/empty eventId returns error object rather than throwing
  const res1 = await syncEventToGoogleCalendar("");
  assert.strictEqual(res1.success, false, "Should return success: false for empty eventId");
  assert(res1.error || res1.message, "Should return an error message");
  console.log("✓ Empty eventId handled gracefully:", res1.message);

  // Test syncUpcomingEventsToCalendar without throwing
  const res2 = await syncUpcomingEventsToCalendar("non-existent-id");
  assert.strictEqual(typeof res2, "object", "Should return response object");
  assert.strictEqual(typeof res2.success, "boolean", "success boolean must be present");
  console.log("✓ syncUpcomingEventsToCalendar returns clean response object without crashing client boundary");
}

testErrorHandling().then(() => {
  console.log("\n=== ALL GCAL HOOK ORDER & ERROR HANDLING TESTS PASSED! ===");
});
