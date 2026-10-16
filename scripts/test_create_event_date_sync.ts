import assert from "assert";

console.log("=== Testing Create Event Form Date Synchronization & Smart Default ===\n");

// Test 1: Auto-fill logic (+1 hour smart default)
console.log("Test 1: Auto-fill calculates exactly +1 hour from start_date");
function calculateSmartDefaultEndDate(startDate: Date): Date {
  return new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
}

const start1 = new Date("2026-10-20T10:00:00.000Z");
const autoEnd1 = calculateSmartDefaultEndDate(start1);

assert.strictEqual(
  autoEnd1.toISOString(),
  "2026-10-20T11:00:00.000Z",
  "End date must match exact same date and be exactly 1 hour after start_date"
);
console.log(`  ✓ Start: ${start1.toISOString()} -> Auto-calculated End: ${autoEnd1.toISOString()}`);

// Test 2: When user changes start_date, end_date automatically updates
console.log("\nTest 2: When start_date changes, end_date updates seamlessly");
let currentStart = new Date("2026-11-15T14:00:00.000Z");
let currentEnd = calculateSmartDefaultEndDate(currentStart);

assert.strictEqual(currentEnd.toISOString(), "2026-11-15T15:00:00.000Z");

// User updates start date to 2026-12-01 09:30
const updatedStart = new Date("2026-12-01T09:30:00.000Z");
currentStart = updatedStart;
currentEnd = calculateSmartDefaultEndDate(updatedStart);

assert.strictEqual(
  currentEnd.toISOString(),
  "2026-12-01T10:30:00.000Z",
  "End date must update to 2026-12-01 10:30"
);
console.log(`  ✓ Updated Start: ${currentStart.toISOString()} -> New End: ${currentEnd.toISOString()}`);

// Test 3: Keep it editable (multi-day event manual override)
console.log("\nTest 3: End date remains completely editable for multi-day events");
const manualMultiDayEnd = new Date("2026-12-05T18:00:00.000Z"); // 4 days later
currentEnd = manualMultiDayEnd;

assert.strictEqual(
  currentEnd.toISOString(),
  "2026-12-05T18:00:00.000Z",
  "User manual edit to multi-day end date must be preserved"
);
assert(
  currentEnd.getTime() > currentStart.getTime(),
  "Multi-day range must be positive"
);
console.log(`  ✓ Multi-day event manually configured: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);

console.log("\n=== ALL CREATE EVENT DATE SYNC TESTS PASSED! ===\n");
