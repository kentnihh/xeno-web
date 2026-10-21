import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { handleKeydownForZoom } from "@fortune-sheet/core";
import {
  triggerFortuneSheetNativeZoom,
  setFortuneSheetZoomLevel,
  ZOOM_PRESETS,
} from "../lib/spreadsheet-zoom";

console.log("=== Testing Fullscreen and Zoom Controls in Spreadsheet Wrapper ===\n");

function readCode(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
}

// ---------------------------------------------------------
// 1. Native FortuneSheet Zoom Logic Verification
// ---------------------------------------------------------
console.log("--- 1. Testing FortuneSheet Native Zoom Algorithm ---");

// Step in (+)
const z1 = handleKeydownForZoom({ ctrlKey: true, key: "+", preventDefault() {} } as any, 1.0);
assert.strictEqual(z1, 1.1, "1.0 + step must equal 1.1");
console.log("✓ handleKeydownForZoom step in: 1.0 -> 1.1");

// Step in (+) again
const z2 = handleKeydownForZoom({ ctrlKey: true, key: "+", preventDefault() {} } as any, 1.1);
assert.strictEqual(z2, 1.2, "1.1 + step must equal 1.2");
console.log("✓ handleKeydownForZoom step in: 1.1 -> 1.2");

// Step out (-)
const z3 = handleKeydownForZoom({ ctrlKey: true, key: "-", preventDefault() {} } as any, 1.2);
assert.strictEqual(z3, 1.1, "1.2 - step must equal 1.1");
console.log("✓ handleKeydownForZoom step out: 1.2 -> 1.1");

// Reset (0)
const zReset = handleKeydownForZoom({ ctrlKey: true, key: "0", preventDefault() {} } as any, 1.5);
assert.strictEqual(zReset, 1.0, "Reset key '0' must return zoom to 1.0");
console.log("✓ handleKeydownForZoom reset '0': 1.5 -> 1.0");

// Presets check
assert.strictEqual(ZOOM_PRESETS.length, 8, "ZOOM_PRESETS must have 8 presets");
assert.deepStrictEqual(
  ZOOM_PRESETS.map((p) => p.value),
  [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0],
  "ZOOM_PRESETS values must match standard spreadsheet zoom ratios"
);
console.log("✓ ZOOM_PRESETS defined with standard intervals (50% to 200%)");

// ---------------------------------------------------------
// 2. EventSpreadsheetTabs Code Contract Verification
// ---------------------------------------------------------
console.log("\n--- 2. Auditing EventSpreadsheetTabs Code Contracts ---");
const eventTabsCode = readCode("components/events/spreadsheet/event-spreadsheet-tabs.tsx");

// Fullscreen state & styles
assert(eventTabsCode.includes("const [isFullscreen, setIsFullscreen] = useState"), "EventSpreadsheetTabs must declare isFullscreen state");
assert(eventTabsCode.includes("fixed inset-0 z-[100] bg-background w-full h-screen p-4 flex flex-col gap-3 overflow-hidden"), "EventSpreadsheetTabs must apply requested fullscreen classes");
assert(eventTabsCode.includes("space-y-4"), "EventSpreadsheetTabs must retain normal DOM flow when not fullscreen");
assert(eventTabsCode.includes('e.key === "Escape"'), "EventSpreadsheetTabs must handle Escape key to exit fullscreen");
assert(eventTabsCode.includes('document.body.style.overflow = "hidden"'), "EventSpreadsheetTabs must lock body scroll in fullscreen");
console.log("✓ Fullscreen state, Tailwind classes, Escape key, and body scroll lock verified in EventSpreadsheetTabs");

// Action Bar buttons: Zoom & Fullscreen
assert(eventTabsCode.includes("<ZoomOut"), "EventSpreadsheetTabs must render ZoomOut icon");
assert(eventTabsCode.includes("<ZoomIn"), "EventSpreadsheetTabs must render ZoomIn icon");
assert(eventTabsCode.includes("<Maximize2"), "EventSpreadsheetTabs must render Maximize2 icon");
assert(eventTabsCode.includes("<Minimize2"), "EventSpreadsheetTabs must render Minimize2 icon");
assert(eventTabsCode.includes("handleZoomIn"), "EventSpreadsheetTabs must bind handleZoomIn");
assert(eventTabsCode.includes("handleZoomOut"), "EventSpreadsheetTabs must bind handleZoomOut");
assert(eventTabsCode.includes("handleSelectZoomPreset"), "EventSpreadsheetTabs must bind handleSelectZoomPreset");
assert(eventTabsCode.includes("ZOOM_PRESETS.map"), "EventSpreadsheetTabs must render zoom presets dropdown");
console.log("✓ Zoom In/Out, Zoom Dropdown, and Fullscreen toggle buttons verified in EventSpreadsheetTabs action bar");

// Action bar stays pinned
assert(eventTabsCode.includes("shrink-0"), "Action bar must remain shrink-0 so it stays visible in fullscreen");
console.log("✓ Action bar pinned visibility verified in EventSpreadsheetTabs");

// Prop forwarding to DynamicSheetGrid
assert(eventTabsCode.includes("isFullscreen={isFullscreen}"), "EventSpreadsheetTabs must forward isFullscreen to DynamicSheetGrid");
assert(eventTabsCode.includes("zoomRatio={zoomRatio}"), "EventSpreadsheetTabs must forward zoomRatio to DynamicSheetGrid");
console.log("✓ isFullscreen and zoomRatio prop forwarding verified in EventSpreadsheetTabs");

// ---------------------------------------------------------
// 3. MasterTemplatesManager Code Contract Verification
// ---------------------------------------------------------
console.log("\n--- 3. Auditing MasterTemplatesManager Code Contracts ---");
const masterTplCode = readCode("components/settings/master-templates-manager.tsx");

// Fullscreen state & styles
assert(masterTplCode.includes("const [isFullscreen, setIsFullscreen] = useState"), "MasterTemplatesManager must declare isFullscreen state");
assert(masterTplCode.includes("fixed inset-0 z-[100] bg-background w-full h-screen p-4 flex flex-col gap-3 overflow-hidden"), "MasterTemplatesManager must apply requested fullscreen classes");
assert(masterTplCode.includes('e.key === "Escape"'), "MasterTemplatesManager must handle Escape key to exit fullscreen");
assert(masterTplCode.includes('document.body.style.overflow = "hidden"'), "MasterTemplatesManager must lock body scroll in fullscreen");
console.log("✓ Fullscreen state, Tailwind classes, Escape key, and body scroll lock verified in MasterTemplatesManager");

// Action Bar buttons: Zoom & Fullscreen
assert(masterTplCode.includes("<ZoomOut"), "MasterTemplatesManager must render ZoomOut icon");
assert(masterTplCode.includes("<ZoomIn"), "MasterTemplatesManager must render ZoomIn icon");
assert(masterTplCode.includes("<Maximize2"), "MasterTemplatesManager must render Maximize2 icon");
assert(masterTplCode.includes("<Minimize2"), "MasterTemplatesManager must render Minimize2 icon");
assert(masterTplCode.includes("handleZoomIn"), "MasterTemplatesManager must bind handleZoomIn");
assert(masterTplCode.includes("handleZoomOut"), "MasterTemplatesManager must bind handleZoomOut");
assert(masterTplCode.includes("handleSelectZoomPreset"), "MasterTemplatesManager must bind handleSelectZoomPreset");
assert(masterTplCode.includes("ZOOM_PRESETS.map"), "MasterTemplatesManager must render zoom presets dropdown");
console.log("✓ Zoom In/Out, Zoom Dropdown, and Fullscreen toggle buttons verified in MasterTemplatesManager action bar");

// Prop forwarding to DynamicSheetGrid
assert(masterTplCode.includes("isFullscreen={isFullscreen}"), "MasterTemplatesManager must forward isFullscreen to DynamicSheetGrid");
assert(masterTplCode.includes("zoomRatio={zoomRatio}"), "MasterTemplatesManager must forward zoomRatio to DynamicSheetGrid");
console.log("✓ isFullscreen and zoomRatio prop forwarding verified in MasterTemplatesManager");

// ---------------------------------------------------------
// 4. DynamicSheetGrid Fullscreen & Canvas Scaling Verification
// ---------------------------------------------------------
console.log("\n--- 4. Auditing DynamicSheetGrid Fullscreen & Canvas Sizing ---");
const gridCode = readCode("components/events/spreadsheet/dynamic-sheet-grid.tsx");

assert(gridCode.includes("isFullscreen = false"), "DynamicSheetGrid must accept isFullscreen prop with default false");
assert(gridCode.includes("zoomRatio"), "DynamicSheetGrid must accept zoomRatio prop");
assert(gridCode.includes('newSheet.zoomRatio = zoomRatio'), "DynamicSheetGrid must apply zoomRatio to initial sheet");
assert(gridCode.includes('flex-1 min-h-0 h-full'), "DynamicSheetGrid must scale canvas container with flex-1 min-h-0 h-full in fullscreen");
assert(gridCode.includes('h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px]'), "DynamicSheetGrid must preserve normal mode height for mobile responsiveness tests");
assert(gridCode.includes('window.dispatchEvent(new Event("resize"))'), "DynamicSheetGrid must trigger window resize event on fullscreen toggle");
console.log("✓ DynamicSheetGrid fullscreen canvas scaling, resize event, and initial zoom ratio verified");

console.log("\n🎉 ALL FULLSCREEN AND ZOOM TESTS PASSED SUCCESSFULLY! 🚀");
