import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getCurrentUser, getCurrentProfile, getUserRoles, isAdmin, hasPermission } from "../lib/auth";

console.log("=== RUNNING PERFORMANCE & NAVIGATION AUDIT TESTS ===\n");

// --- 1. Auditing Route-Level loading.tsx (Streaming SSR) ---
console.log("--- 1. Auditing Route-Level loading.tsx (Streaming SSR) ---");

const requiredLoadingFiles = [
  "app/(dashboard)/loading.tsx",
  "app/(dashboard)/events/loading.tsx",
  "app/(dashboard)/events/[id]/loading.tsx",
  "app/(dashboard)/clients/loading.tsx",
  "app/(dashboard)/vendors/loading.tsx",
  "app/(dashboard)/settings/templates/loading.tsx",
  "app/(dashboard)/team/loading.tsx",
  "app/(dashboard)/settings/rbac/loading.tsx",
];

for (const relPath of requiredLoadingFiles) {
  const fullPath = path.resolve(process.cwd(), relPath);
  assert(fs.existsSync(fullPath), `loading.tsx must exist at ${relPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  assert(
    content.includes("export default function"),
    `${relPath} must default-export a React component`
  );
  assert(
    content.includes("animate-pulse"),
    `${relPath} skeleton must feature animate-pulse for seamless perceived streaming`
  );
  console.log(`✓ Verified streaming loading skeleton: ${relPath}`);
}

// --- 2. Auditing React cache() Auth Session Caching ---
console.log("\n--- 2. Auditing React cache() Auth Session Caching ---");

assert(typeof cache === "function", "React cache utility must be available");
assert(typeof getCurrentUser === "function", "getCurrentUser must be exported as a function");
assert(typeof getCurrentProfile === "function", "getCurrentProfile must be exported as a function");
assert(typeof getUserRoles === "function", "getUserRoles must be exported as a function");
assert(typeof isAdmin === "function", "isAdmin must be exported as a function");
assert(typeof hasPermission === "function", "hasPermission must be exported as a function");

const authSource = fs.readFileSync(path.resolve(process.cwd(), "lib/auth.ts"), "utf-8");
assert(authSource.includes('import { cache } from "react"'), "lib/auth.ts must import cache from 'react'");
assert(authSource.includes("export const getCurrentUser = cache("), "getCurrentUser must be wrapped with cache()");
assert(authSource.includes("export const getCurrentProfile = cache("), "getCurrentProfile must be wrapped with cache()");
assert(authSource.includes("export const getUserRoles = cache("), "getUserRoles must be wrapped with cache()");
assert(authSource.includes("export const isAdmin = cache("), "isAdmin must be wrapped with cache()");
assert(authSource.includes("export const getUserPermissions = cache("), "getUserPermissions must be wrapped with cache()");
assert(authSource.includes("export const hasPermission = cache("), "hasPermission must be wrapped with cache()");
console.log("✓ All auth session, role, and permission resolvers are wrapped with React cache()");

// --- 3. Auditing Parallelized Data Fetching (Promise.all) ---
console.log("\n--- 3. Auditing Parallelized Data Fetching (Promise.all) ---");

// Check layout.tsx
const layoutSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/layout.tsx"), "utf-8");
assert(
  layoutSource.includes("Promise.all(["),
  "DashboardLayout must run profile, admin, and permission checks concurrently using Promise.all"
);
assert(
  layoutSource.includes("getCurrentUser()"),
  "DashboardLayout must use cached getCurrentUser"
);
console.log("✓ DashboardLayout parallel data fetching verified");

// Check dashboard/page.tsx
const dashboardPageSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/dashboard/page.tsx"), "utf-8");
assert(
  dashboardPageSource.includes("await Promise.all([\n    eventsQuery,\n    pendingEventsQuery,\n    tasksQuery,\n  ])") ||
  dashboardPageSource.includes("Promise.all([\n    eventsQuery"),
  "DashboardPage must execute events, pending events, and tasks queries concurrently with Promise.all"
);
console.log("✓ DashboardPage parallel queries verified");

// Check events/page.tsx
const eventsPageSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/events/page.tsx"), "utf-8");
assert(
  eventsPageSource.includes("Promise.all([\n    query,\n    allSearchQuery,\n  ])"),
  "EventsPage must execute paginated query and search query in parallel"
);
console.log("✓ EventsPage parallel queries verified");

// Check clients/page.tsx
const clientsPageSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/clients/page.tsx"), "utf-8");
assert(
  clientsPageSource.includes("Promise.all([") && clientsPageSource.includes("from(\"clients\")"),
  "ClientsPage must fetch permissions and client records in parallel"
);
console.log("✓ ClientsPage parallel queries verified");

// Check vendors/page.tsx
const vendorsPageSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/vendors/page.tsx"), "utf-8");
assert(
  vendorsPageSource.includes("Promise.all([") && vendorsPageSource.includes("from(\"vendors\")"),
  "VendorsPage must fetch permissions and vendor records in parallel"
);
console.log("✓ VendorsPage parallel queries verified");

// Check team/page.tsx
const teamPageSource = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/team/page.tsx"), "utf-8");
assert(
  teamPageSource.includes("Promise.all([") && teamPageSource.includes("from(\"profiles\")"),
  "TeamPage must fetch permissions, user, and profiles in parallel"
);
console.log("✓ TeamPage parallel queries verified");

// --- 4. Auditing Strict Lazy Loading for Heavy Modules ---
console.log("\n--- 4. Auditing Strict Lazy Loading for Heavy Modules ---");

// Check event-detail-tabs.tsx
const eventDetailTabsSource = fs.readFileSync(
  path.resolve(process.cwd(), "components/events/event-detail-tabs.tsx"),
  "utf-8"
);
assert(
  eventDetailTabsSource.includes('dynamic(') && eventDetailTabsSource.includes('ssr: false'),
  "EventDetailTabs must lazily load EventSpreadsheetTabs with ssr: false"
);
console.log("✓ EventDetailTabs lazily loads EventSpreadsheetTabs on-demand");

// Check templates-tabs-view.tsx
const templatesTabsSource = fs.readFileSync(
  path.resolve(process.cwd(), "components/settings/templates-tabs-view.tsx"),
  "utf-8"
);
assert(
  templatesTabsSource.includes('dynamic(') && templatesTabsSource.includes('ssr: false'),
  "TemplatesTabsView must lazily load MasterTemplatesManager with ssr: false"
);
console.log("✓ TemplatesTabsView lazily loads MasterTemplatesManager on-demand");

// Check that heavy modules (@fortune-sheet/react, jspdf) are not imported top-level in general routes
const generalRoutePages = [
  "app/(dashboard)/dashboard/page.tsx",
  "app/(dashboard)/events/page.tsx",
  "app/(dashboard)/clients/page.tsx",
  "app/(dashboard)/vendors/page.tsx",
  "app/(dashboard)/team/page.tsx",
];

for (const routePath of generalRoutePages) {
  const content = fs.readFileSync(path.resolve(process.cwd(), routePath), "utf-8");
  assert(!content.includes('@fortune-sheet'), `${routePath} must not import @fortune-sheet`);
  assert(!content.includes('import jsPDF') && !content.includes('from "jspdf"'), `${routePath} must not import jspdf`);
}
console.log("✓ General dashboard routes are ultralight with zero top-level heavy library imports");

console.log("\n🎉 ALL PERFORMANCE & NAVIGATION AUDIT ASSERTIONS PASSED! 🚀");
