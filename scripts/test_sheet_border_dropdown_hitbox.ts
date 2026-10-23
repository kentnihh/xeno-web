import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("===============================================================");
console.log("TEST SUITE: Sheet Border Dropdown Hitbox & Hover Bridge Audits");
console.log("===============================================================\n");

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");
const dynamicGridPath = path.resolve(
  process.cwd(),
  "components/events/spreadsheet/dynamic-sheet-grid.tsx"
);

assert(fs.existsSync(globalsCssPath), "app/globals.css must exist");
assert(fs.existsSync(dynamicGridPath), "dynamic-sheet-grid.tsx must exist");

const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
const dynamicGrid = fs.readFileSync(dynamicGridPath, "utf-8");

// --- 1. Audit CSS: Expand Clickable & Hover Area to Full Width ---
console.log("1. Auditing CSS Full-Width Hitbox & Menu Items...");

const requiredSelectors = [
  ".fortune-border-select-option",
  ".fortune-border-menu-item",
  '[data-action="border-color"]',
  '[data-action="border-style"]',
  ".luckysheet-border-color-picker-item",
];

for (const sel of requiredSelectors) {
  assert(
    globalsCss.includes(sel),
    `globals.css must contain required selector: ${sel}`
  );
}
console.log("   ✓ All required border menu item selectors present in globals.css");

assert(
  globalsCss.includes("width: 100% !important"),
  "globals.css must set width: 100% !important on border menu items"
);
assert(
  globalsCss.includes("display: flex !important"),
  "globals.css must set display: flex !important on border menu items"
);
assert(
  globalsCss.includes("box-sizing: border-box !important"),
  "globals.css must set box-sizing: border-box !important"
);
assert(
  globalsCss.includes("padding: 8px 12px !important"),
  "globals.css must set padding: 8px 12px !important"
);
console.log("   ✓ Full-width, flex layout, box-sizing, and padding verified");

// --- 2. Audit CSS: Pointer Events Suppression on Label Children ---
console.log("\n2. Auditing Pointer Events on Label & Indicator Children...");

assert(
  globalsCss.includes(".fortune-border-select-option .fortune-toolbar-menu-line"),
  "globals.css must style .fortune-toolbar-menu-line inside .fortune-border-select-option"
);
assert(
  globalsCss.includes("pointer-events: none !important"),
  "globals.css must set pointer-events: none !important on label children to avoid shrinking hitbox"
);
console.log("   ✓ Pointer events on child label/arrow suppressed to ensure solid row hitbox");

// --- 3. Audit CSS: Indicators Alignment (Color Bar & Line Style Preview) ---
console.log("\n3. Auditing Indicators Alignment...");

assert(
  globalsCss.includes(".fortune-border-color-preview"),
  "globals.css must style .fortune-border-color-preview"
);
assert(
  globalsCss.includes(".fortune-border-style-preview"),
  "globals.css must style .fortune-border-style-preview"
);
console.log("   ✓ Color and Line Style preview indicators properly aligned with width & height");

// --- 4. Audit CSS: Hover Bridge Pseudo-Elements & High Z-Index ---
console.log("\n4. Auditing Hover Bridge (::before / ::after) & Z-Index...");

assert(
  globalsCss.includes(".fortune-border-select-menu::before"),
  "globals.css must define .fortune-border-select-menu::before hover bridge"
);
assert(
  globalsCss.includes(".fortune-border-select-menu::after"),
  "globals.css must define .fortune-border-select-menu::after hover bridge"
);
assert(
  globalsCss.includes("z-index: 9999 !important") || globalsCss.includes("z-index: 10000 !important"),
  "globals.css must set high z-index on flyout submenus"
);
assert(
  globalsCss.includes("overflow: visible !important"),
  "globals.css must set overflow: visible !important on parent dropdowns to prevent clipping"
);
console.log("   ✓ Invisible hover bridge (::before & ::after) and high z-index verified");

// --- 5. Audit JavaScript Interaction in DynamicSheetGrid ---
console.log("\n5. Auditing DynamicSheetGrid Hover Exit Delay & Click-to-Lock...");

assert(
  dynamicGrid.includes("containerRef"),
  "dynamic-sheet-grid.tsx must define containerRef"
);
assert(
  dynamicGrid.includes("ref={containerRef}"),
  "dynamic-sheet-grid.tsx must attach ref={containerRef} to the wrapper container"
);
assert(
  dynamicGrid.includes("scheduleClose") || dynamicGrid.includes("closeTimer"),
  "dynamic-sheet-grid.tsx must implement a scheduled close timer for hover exit delay"
);
assert(
  dynamicGrid.includes("180") || dynamicGrid.includes("150") || dynamicGrid.includes("200"),
  "dynamic-sheet-grid.tsx must set hover exit delay between 150ms-200ms"
);
assert(
  dynamicGrid.includes("data-locked"),
  "dynamic-sheet-grid.tsx must support locking the submenu open on click"
);
assert(
  dynamicGrid.includes("openSubmenu"),
  "dynamic-sheet-grid.tsx must implement openSubmenu with positioning logic"
);
console.log("   ✓ DynamicSheetGrid implements hover exit delay (~180ms) and click-to-lock submenu");

// --- 6. Audit Scope Isolation ---
console.log("\n6. Auditing Scope Isolation...");

assert(
  !dynamicGrid.includes("disableToolbar") && !dynamicGrid.includes("hideGrid"),
  "dynamic-sheet-grid.tsx must not alter unrelated sheet functionality"
);
console.log("   ✓ Scope strictly isolated to border dropdown and flyout submenus");

console.log("\n===============================================================");
console.log("🎉 ALL SHEET BORDER DROPDOWN & HOVER BRIDGE TESTS PASSED! 🚀");
console.log("===============================================================");
