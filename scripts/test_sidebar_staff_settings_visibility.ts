import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { Sidebar } from "../components/sidebar";

const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");
const { PathnameContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime");

console.log("===============================================================");
console.log("TEST SUITE: Sidebar & Settings RBAC Visibility for STAFF");
console.log("===============================================================");

const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderSidebar(props: any, currentPath = "/dashboard") {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        PathnameContext.Provider,
        { value: currentPath },
        React.createElement(Sidebar, props)
      )
    )
  );
}

// 1. Test Sidebar rendering for STAFF (Direct session or Impersonated)
console.log("\n1. Testing Sidebar rendering for STAFF role...");

// Standard Staff with canAccessSettings=false
const staffHtml = renderSidebar({
  canAccessSettings: false,
  isSuperAdmin: false,
  userRole: "staff",
});

assert(staffHtml.includes("Menu Utama"), "Sidebar must render 'Menu Utama'");
assert(staffHtml.includes("Tim Kru"), "Sidebar must render 'Tim Kru'");
assert(!staffHtml.includes("Pengaturan"), "STAFF sidebar must NOT render 'Pengaturan' header");
assert(!staffHtml.includes("/settings/templates"), "STAFF sidebar must NOT link to Master Template");
assert(!staffHtml.includes("/settings/rbac"), "STAFF sidebar must NOT link to Manajemen RBAC");
assert(!staffHtml.includes("/settings/impersonate"), "STAFF sidebar must NOT link to Impersonate");
console.log("   ✓ STAFF sidebar ends cleanly at Tim Kru without Pengaturan section.");

// Defensive check: Staff with canAccessSettings=true accidentally passed
const staffOverriddenHtml = renderSidebar({
  canAccessSettings: true,
  isSuperAdmin: false,
  userRole: "staff",
});
assert(!staffOverriddenHtml.includes("Pengaturan"), "STAFF role guard must override canAccessSettings=true");
assert(!staffOverriddenHtml.includes("/settings/templates"), "STAFF role guard must suppress settings submenus");
console.log("   ✓ STAFF role guard strictly overrides accidental canAccessSettings=true.");

// 2. Test Sidebar rendering for ADMIN
console.log("\n2. Testing Sidebar rendering for ADMIN role...");
const adminHtml = renderSidebar({
  canAccessSettings: true,
  isSuperAdmin: false,
  userRole: "ADMIN",
  canManageTemplates: true,
  canManageRbac: true,
  canImpersonate: false,
});

assert(adminHtml.includes("Pengaturan"), "ADMIN sidebar must render 'Pengaturan' section");
assert(adminHtml.includes("Master Template"), "ADMIN sidebar must render 'Master Template'");
assert(adminHtml.includes("Manajemen RBAC"), "ADMIN sidebar must render 'Manajemen RBAC'");
assert(!adminHtml.includes("/settings/impersonate"), "ADMIN sidebar must NOT render 'Impersonate'");
console.log("   ✓ ADMIN sees Pengaturan with Master Template and RBAC, but NOT Impersonate.");

// 3. Test Sidebar rendering for SUPER_ADMIN
console.log("\n3. Testing Sidebar rendering for SUPER_ADMIN role...");
const superAdminHtml = renderSidebar({
  canAccessSettings: true,
  isSuperAdmin: true,
  userRole: "SUPER_ADMIN",
  canManageTemplates: true,
  canManageRbac: true,
  canImpersonate: true,
});

assert(superAdminHtml.includes("Pengaturan"), "SUPER_ADMIN sidebar must render 'Pengaturan' section");
assert(superAdminHtml.includes("Master Template"), "SUPER_ADMIN sidebar must render 'Master Template'");
assert(superAdminHtml.includes("Manajemen RBAC"), "SUPER_ADMIN sidebar must render 'Manajemen RBAC'");
assert(superAdminHtml.includes("Impersonate"), "SUPER_ADMIN sidebar must render 'Impersonate'");
console.log("   ✓ SUPER_ADMIN sees full Pengaturan menu including Impersonate.");

// 4. Test Granular Settings Item Filtering
console.log("\n4. Testing Granular Settings Item Filtering...");
const templatesOnlyHtml = renderSidebar({
  canAccessSettings: true,
  isSuperAdmin: false,
  userRole: "MANAGER",
  canManageTemplates: true,
  canManageRbac: false,
  canImpersonate: false,
});
assert(templatesOnlyHtml.includes("Pengaturan"), "Manager with templates permission sees Pengaturan");
assert(templatesOnlyHtml.includes("Master Template"), "Manager sees Master Template");
assert(!templatesOnlyHtml.includes("Manajemen RBAC"), "Manager without RBAC permission does NOT see Manajemen RBAC");
assert(!templatesOnlyHtml.includes("Impersonate"), "Manager without impersonate does NOT see Impersonate");
console.log("   ✓ Granular permissions correctly isolate individual settings submenus.");

// 5. Audit app/(dashboard)/layout.tsx for Impersonation Safety
console.log("\n5. Auditing layout.tsx for Impersonation Session Handling...");
const layoutCode = fs.readFileSync(
  path.join(process.cwd(), "app/(dashboard)/layout.tsx"),
  "utf-8"
);

assert(
  layoutCode.includes("!isEffectiveStaff"),
  "layout.tsx must explicitly block settings for STAFF"
);
assert(
  layoutCode.includes("effectiveIsSuperAdmin"),
  "layout.tsx must calculate effectiveIsSuperAdmin respecting active impersonation"
);
assert(
  layoutCode.includes("userRole={userRole}"),
  "layout.tsx must pass effective userRole to Sidebar"
);
console.log("   ✓ layout.tsx correctly derives effective role and permissions during impersonation.");

// 6. Verify components/layout/sidebar.tsx alias export exists
console.log("\n6. Verifying components/layout/sidebar.tsx module...");
assert(
  fs.existsSync(path.join(process.cwd(), "components/layout/sidebar.tsx")),
  "components/layout/sidebar.tsx must exist as alias/export"
);
console.log("   ✓ components/layout/sidebar.tsx exists and is accessible.");

console.log("\n===============================================================");
console.log("ALL SIDEBAR STAFF SETTINGS VISIBILITY TESTS PASSED! 🚀");
console.log("===============================================================");
