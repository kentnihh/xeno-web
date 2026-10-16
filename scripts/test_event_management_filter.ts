/**
 * Verification test for Event Management page filtering logic:
 * - "Aktif" tab filter: status != completed AND date >= today (start of day)
 * - "Terlewat" tab filter: date < today (start of day) regardless of status
 * - Timezone safety: events happening today are included in "Aktif" and NOT "Terlewat"
 */

import assert from "node:assert";

console.log("== Testing Event Management 'Aktif' & 'Terlewat' Filter Logic ==");

// Mock Supabase Query Builder to test query building
interface MockEventsQueryState {
  neqFilters: { column: string; value: string }[];
  gteFilters: { column: string; value: string }[];
  ltFilters: { column: string; value: string }[];
  eqFilters: { column: string; value: string }[];
  orderClauses: { column: string; ascending: boolean }[];
}

function createMockSupabase(state: MockEventsQueryState) {
  const query: any = {
    from() {
      return query;
    },
    select() {
      return query;
    },
    order(column: string, { ascending }: { ascending: boolean }) {
      state.orderClauses.push({ column, ascending });
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
    lt(column: string, value: string) {
      state.ltFilters.push({ column, value });
      return query;
    },
    eq(column: string, value: string) {
      state.eqFilters.push({ column, value });
      return query;
    },
    range() {
      return query;
    },
  };
  return query;
}

// Emulate query building logic from app/(dashboard)/events/page.tsx
function buildEventsQuery(supabase: any, statusFilter: string, now = new Date()) {
  const isPastFilter = statusFilter === "past" || statusFilter === "terlewat";

  const localTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const jakartaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const jakartaTodayStart = new Date(`${jakartaDate}T00:00:00+07:00`);
  const todayStart = localTodayStart < jakartaTodayStart ? localTodayStart : jakartaTodayStart;
  const todayStartISO = todayStart.toISOString();

  let query = supabase
    .from("events")
    .select("*, client:clients(*)", { count: "exact" })
    .order("start_date", { ascending: isPastFilter ? false : true });

  if (isPastFilter) {
    query = query.lt("start_date", todayStartISO);
  } else if (statusFilter === "active") {
    query = query.neq("status", "completed").gte("start_date", todayStartISO);
  } else if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  return { query, todayStart, todayStartISO, isPastFilter };
}

// Emulate in-memory / fallback filtering from app/(dashboard)/events/page.tsx
function filterEventsArray(events: any[], statusFilter: string, todayStart: Date) {
  const isPastFilter = statusFilter === "past" || statusFilter === "terlewat";

  return events.filter((ev) => {
    const isPast = new Date(ev.start_date).getTime() < todayStart.getTime();

    if (isPastFilter) {
      return isPast;
    }
    if (statusFilter === "active") {
      return ev.status !== "completed" && !isPast;
    }
    if (statusFilter !== "all") {
      return ev.status === statusFilter;
    }
    return true;
  });
}

// Test 1: Query construction for "active" (Aktif)
const activeState: MockEventsQueryState = {
  neqFilters: [],
  gteFilters: [],
  ltFilters: [],
  eqFilters: [],
  orderClauses: [],
};
buildEventsQuery(createMockSupabase(activeState), "active");
assert.strictEqual(activeState.neqFilters[0]?.column, "status");
assert.strictEqual(activeState.neqFilters[0]?.value, "completed", "Aktif must filter out completed status");
assert.strictEqual(activeState.gteFilters[0]?.column, "start_date", "Aktif must filter start_date >= today");
assert.strictEqual(activeState.ltFilters.length, 0, "Aktif must not have lt filters");
console.log("✓ Query logic for 'Aktif': excludes completed and requires start_date >= todayStart");

// Test 2: Query construction for "past" / "terlewat" (Terlewat)
for (const pastKey of ["past", "terlewat"]) {
  const pastState: MockEventsQueryState = {
    neqFilters: [],
    gteFilters: [],
    ltFilters: [],
    eqFilters: [],
    orderClauses: [],
  };
  buildEventsQuery(createMockSupabase(pastState), pastKey);
  assert.strictEqual(pastState.ltFilters[0]?.column, "start_date", "Terlewat must filter start_date < today");
  assert.strictEqual(pastState.neqFilters.length, 0, "Terlewat must include events regardless of status");
  assert.strictEqual(pastState.orderClauses[0]?.ascending, false, "Terlewat orders descending (most recent past first)");
  console.log(`✓ Query logic for '${pastKey}': filters start_date < todayStart regardless of status`);
}

// Test 3: Timezone Safety and Dataset Filtering
const simulatedNow = new Date("2026-10-16T12:45:00.000Z"); // 19:45 in Jakarta (+07:00)
const { todayStart } = buildEventsQuery(createMockSupabase({ neqFilters: [], gteFilters: [], ltFilters: [], eqFilters: [], orderClauses: [] }), "active", simulatedNow);

const mockDataset = [
  { id: "1", title: "Morning Event Today", start_date: "2026-10-16T01:00:00.000Z", status: "confirmed" }, // 08:00 WIB today
  { id: "2", title: "Tonight Event Today", start_date: "2026-10-16T13:00:00.000Z", status: "planning" },  // 20:00 WIB today
  { id: "3", title: "Completed Event Today", start_date: "2026-10-16T04:00:00.000Z", status: "completed" },// 11:00 WIB today
  { id: "4", title: "Upcoming Event Next Week", start_date: "2026-10-23T10:00:00.000Z", status: "confirmed" },
  { id: "5", title: "Event Yesterday Night", start_date: "2026-10-15T15:00:00.000Z", status: "confirmed" }, // 22:00 WIB yesterday
  { id: "6", title: "Past Event Last Month", start_date: "2026-09-10T10:00:00.000Z", status: "completed" },
];

// Test "active"
const activeResults = filterEventsArray(mockDataset, "active", todayStart);
const activeIds = activeResults.map((e) => e.id);
assert.deepStrictEqual(activeIds, ["1", "2", "4"], "Aktif must contain non-completed events today and in future");
assert.ok(!activeIds.includes("3"), "Aktif must NOT include completed events");
assert.ok(!activeIds.includes("5"), "Aktif must NOT include yesterday event");
assert.ok(!activeIds.includes("6"), "Aktif must NOT include past event");
console.log("✓ 'Aktif' dataset filter: accurately returns events happening today and in future without completed events");

// Test "terlewat"
const pastResults = filterEventsArray(mockDataset, "past", todayStart);
const pastIds = pastResults.map((e) => e.id);
assert.deepStrictEqual(pastIds, ["5", "6"], "Terlewat must contain all events strictly < today regardless of status");
assert.ok(!pastIds.includes("1"), "Terlewat must NOT include morning event happening today");
assert.ok(!pastIds.includes("2"), "Terlewat must NOT include tonight event happening today");
assert.ok(!pastIds.includes("3"), "Terlewat must NOT include completed event happening today");
console.log("✓ 'Terlewat' dataset filter: accurately returns all events before today regardless of status");

console.log("\n== ALL EVENT MANAGEMENT FILTER TESTS PASSED! ==");
