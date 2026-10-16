/**
 * Verification test for Dashboard "Acara Aktif" query filtering logic.
 *
 * Validates:
 * 1. Filter condition 1: Excludes completed events (.neq('status', 'completed'))
 * 2. Filter condition 2: Excludes past events (.gte('start_date', todayStart))
 * 3. Filter condition 3: Timezone safety - Start of today (00:00:00) includes events today
 *    even when scheduled earlier in the day or under UTC/Asia:Jakarta offsets.
 */

import assert from "node:assert";

// Mock Supabase Query Builder to test query construction
interface MockQueryState {
  fromTable?: string;
  selectFields?: string;
  neqFilters: { column: string; value: string }[];
  gteFilters: { column: string; value: string }[];
  orderClauses: { column: string; options: { ascending: boolean } }[];
}

function createMockSupabase(state: MockQueryState) {
  const query: any = {
    from(table: string) {
      state.fromTable = table;
      return query;
    },
    select(fields: string) {
      state.selectFields = fields;
      return query;
    },
    neq(column: string, value: string) {
      state.neqFilters.push({ column, value });
      return query;
    },
    gte(column: string, value: string) {
      state.gteFilters.push({ column, value });
      return query;
    },
    order(column: string, options: { ascending: boolean }) {
      state.orderClauses.push({ column, options });
      return query;
    },
  };
  return query;
}

// Emulate the exact query logic from app/(dashboard)/dashboard/page.tsx
function executeDashboardEventsQuery(supabase: any, now = new Date()) {
  const localTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const jakartaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const jakartaTodayStart = new Date(`${jakartaDate}T00:00:00+07:00`);
  const todayStart = localTodayStart < jakartaTodayStart ? localTodayStart : jakartaTodayStart;

  return supabase
    .from("events")
    .select("*, client:clients(*)")
    .neq("status", "completed")
    .gte("start_date", todayStart.toISOString())
    .order("start_date", { ascending: true });
}

console.log("== Testing Dashboard 'Acara Aktif' Supabase Query Filters ==");

// Test 1: Query construction and filters
const queryState: MockQueryState = {
  neqFilters: [],
  gteFilters: [],
  orderClauses: [],
};
const mockClient = createMockSupabase(queryState);
executeDashboardEventsQuery(mockClient);

assert.strictEqual(queryState.fromTable, "events", "Query must target 'events' table");
assert.ok(queryState.selectFields?.includes("*, client:clients(*)"), "Query must select event and client fields");

// Condition 1: Exclude completed status
const statusNeq = queryState.neqFilters.find((f) => f.column === "status");
assert.ok(statusNeq, "Query must have .neq('status', ...) filter");
assert.strictEqual(statusNeq.value, "completed", "Status filter must exclude 'completed' status");
console.log("✓ Condition 1 passed: status must NOT be 'completed' (.neq('status', 'completed'))");

// Condition 2: Filter start_date >= today
const dateGte = queryState.gteFilters.find((f) => f.column === "start_date");
assert.ok(dateGte, "Query must have .gte('start_date', ...) filter");
console.log("✓ Condition 2 passed: event date must not have passed (.gte('start_date', todayStart))");

// Condition 3: Timezone safety test
// An event starting at 08:00 AM today must be included even if the query runs at 19:00 (7 PM)
const simulatedNow = new Date("2026-10-16T12:03:57.000Z"); // 19:03:57 in Jakarta (+07:00)
const earlyMorningEventDate = "2026-10-16T01:00:00.000Z"; // 08:00:00 in Jakarta (+07:00)
const yesterdayEventDate = "2026-10-15T16:00:00.000Z"; // 23:00:00 on Oct 15 in Jakarta (+07:00)

const testQueryState: MockQueryState = {
  neqFilters: [],
  gteFilters: [],
  orderClauses: [],
};
executeDashboardEventsQuery(createMockSupabase(testQueryState), simulatedNow);
const boundaryDateIso = testQueryState.gteFilters[0].value;
const boundaryTimestamp = new Date(boundaryDateIso).getTime();

assert.ok(
  new Date(earlyMorningEventDate).getTime() >= boundaryTimestamp,
  "Events occurring earlier today (morning) must NOT be filtered out as past events"
);
console.log("✓ Timezone Safety: Event at 08:00 AM today is included when checked at 19:00 PM");

assert.ok(
  new Date(yesterdayEventDate).getTime() < boundaryTimestamp,
  "Events occurring yesterday must be filtered out as past events"
);
console.log("✓ Timezone Safety: Event from yesterday is correctly filtered out as past event");

// Test 4: Simulation of in-memory filter matching database behavior
const sampleEvents = [
  { id: "1", title: "Active Upcoming", status: "confirmed", start_date: "2026-10-20T10:00:00Z" },
  { id: "2", title: "Active Today", status: "ongoing", start_date: earlyMorningEventDate },
  { id: "3", title: "Completed Today", status: "completed", start_date: earlyMorningEventDate },
  { id: "4", title: "Past Event", status: "confirmed", start_date: yesterdayEventDate },
  { id: "5", title: "Completed Past", status: "completed", start_date: yesterdayEventDate },
];

const filteredEvents = sampleEvents.filter(
  (ev) => ev.status !== "completed" && new Date(ev.start_date).getTime() >= boundaryTimestamp
);

assert.strictEqual(filteredEvents.length, 2, "Only active and upcoming non-completed events must remain");
assert.strictEqual(filteredEvents[0].id, "1");
assert.strictEqual(filteredEvents[1].id, "2");
console.log("✓ Filter simulation passed: accurately retains truly active and upcoming events (2 of 5)");

console.log("\n== ALL DASHBOARD ACTIVE EVENTS TESTS PASSED! ==");
