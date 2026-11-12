/**
 * Automated Verification Suite:
 * 1. Spreadsheet PDF Export Border Thickness & Style Preservation (config.borderInfo and cell.bd)
 * 2. Single Ctrl+Enter Line Break in Cell Editor & Text Wrap (tb: "2") on Commit
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  computeSheetBorderMap,
  resolveBorderStyle,
  parseFortuneSheetForAutoTable,
  buildSpreadsheetPdf,
} from "../lib/pdf/spreadsheet-pdf";
import {
  isCellEditorActive,
  insertNewlineAtCaret,
  cleanEditorOnCommit,
} from "../lib/spreadsheet-autofill";
import { normalizeCellForFortuneSheet, sanitizeSheetData } from "../lib/spreadsheet-adapter";

console.log("==================================================================");
console.log("TEST SUITE: PDF Border Thickness & Single Ctrl+Enter Verification");
console.log("==================================================================\n");

// ============================================================================
// 1. Border Style Code & Thickness Mapping Audits
// ============================================================================
console.log("--- 1. Testing Border Style Code & Thickness Mappings ---");

// Test 1: Style 1 (Thin): 1px solid / 0.8pt -> ~0.28mm
const thinStyle = resolveBorderStyle({ style: 1, color: "#000000" });
assert.ok(thinStyle, "Thin border must resolve");
assert.strictEqual(thinStyle.lineStyle, "solid", "Style 1 must be solid");
assert.strictEqual(Math.round(thinStyle.widthMm * 100) / 100, 0.28, "Style 1 width must be ~0.28mm (0.8pt)");
assert.deepStrictEqual(thinStyle.color, [0, 0, 0], "Color #000000 must resolve to [0, 0, 0]");

// Test 2: Style 2 (Hair): 0.5px solid / 0.4pt -> ~0.14mm
const hairStyle = resolveBorderStyle({ style: 2, color: "#000000" });
assert.ok(hairStyle, "Hair border must resolve");
assert.strictEqual(hairStyle.lineStyle, "solid", "Style 2 must be solid");
assert.strictEqual(Math.round(hairStyle.widthMm * 100) / 100, 0.14, "Style 2 width must be ~0.14mm (0.4pt)");

// Test 3: Style 3 (Dotted): 1px dotted -> ~0.28mm
const dottedStyle = resolveBorderStyle({ style: 3, color: "#ff0000" });
assert.ok(dottedStyle, "Dotted border must resolve");
assert.strictEqual(dottedStyle.lineStyle, "dotted", "Style 3 must be dotted");
assert.strictEqual(Math.round(dottedStyle.widthMm * 100) / 100, 0.28, "Style 3 width must be ~0.28mm");
assert.deepStrictEqual(dottedStyle.color, [255, 0, 0], "Color #ff0000 must resolve to [255, 0, 0]");

// Test 4: Style 4 (Dashed): 1px dashed -> ~0.28mm
const dashedStyle = resolveBorderStyle({ style: 4, color: "#000000" });
assert.ok(dashedStyle, "Dashed border must resolve");
assert.strictEqual(dashedStyle.lineStyle, "dashed", "Style 4 must be dashed");
assert.strictEqual(Math.round(dashedStyle.widthMm * 100) / 100, 0.28, "Style 4 width must be ~0.28mm");

// Test 5: Style 7 (Medium): 2px solid / 1.6pt -> ~0.56mm
const mediumStyle = resolveBorderStyle({ style: 7, color: "#000000" });
assert.ok(mediumStyle, "Medium border must resolve");
assert.strictEqual(mediumStyle.lineStyle, "solid", "Style 7 must be solid");
assert.strictEqual(Math.round(mediumStyle.widthMm * 100) / 100, 0.56, "Style 7 width must be ~0.56mm (1.6pt)");

// Test 6: Style 12 (Double): 3px double / 2.2pt -> ~0.78mm
const doubleStyle = resolveBorderStyle({ style: 12, color: "#000000" });
assert.ok(doubleStyle, "Double border must resolve");
assert.strictEqual(doubleStyle.lineStyle, "double", "Style 12 must be double");
assert.strictEqual(Math.round(doubleStyle.widthMm * 100) / 100, 0.78, "Style 12 width must be ~0.78mm (2.2pt)");

// Test 7: Style 13 (Thick): 3.5px solid / 2.8pt -> ~0.99mm
const thickStyle = resolveBorderStyle({ style: 13, color: "#000000" });
assert.ok(thickStyle, "Thick border must resolve");
assert.strictEqual(thickStyle.lineStyle, "solid", "Style 13 must be solid");
assert.strictEqual(Math.round(thickStyle.widthMm * 100) / 100, 0.99, "Style 13 width must be ~0.99mm (2.8pt)");

// Verify thickness progression: Hair < Thin < Dotted/Dashed < Medium < Thick
assert.ok(hairStyle.widthMm < thinStyle.widthMm, "Hair must be thinner than Thin");
assert.ok(thinStyle.widthMm < mediumStyle.widthMm, "Thin must be thinner than Medium");
assert.ok(mediumStyle.widthMm < thickStyle.widthMm, "Medium must be thinner than Thick");
console.log("   ✓ All border style codes correctly mapped with distinct thickness progression");

// ============================================================================
// 2. config.borderInfo and cell.bd Parsing
// ============================================================================
console.log("\n--- 2. Testing config.borderInfo and cell.bd Map Resolution ---");

const testSheetData = {
  name: "BordersTest",
  config: {
    borderInfo: [
      // Thin border-all on A1:C2
      {
        rangeType: "range",
        borderType: "border-all",
        style: 1,
        color: "#999999",
        range: [{ row: [0, 1], column: [0, 2] }],
      },
      // Thick border-bottom on row 0 (A1:C1)
      {
        rangeType: "range",
        borderType: "border-bottom",
        style: 13,
        color: "#000000",
        range: [{ row: [0, 0], column: [0, 2] }],
      },
      // Double border-outside on A2:B2
      {
        rangeType: "range",
        borderType: "border-outside",
        style: 12,
        color: "#111111",
        range: [{ row: [1, 1], column: [0, 1] }],
      },
      // Cell rangeType override on C2 (row 1, col 2)
      {
        rangeType: "cell",
        value: {
          row_index: 1,
          col_index: 2,
          r: { style: 7, color: "#0000ff" },
        },
      },
    ],
  },
  data: [
    [
      { v: "Header A" },
      { v: "Header B" },
      { v: "Header C" },
    ],
    [
      { v: "Data A" },
      { v: "Data B" },
      { v: "Data C", bd: { b: { style: 13, color: "#222222" } } },
    ],
  ],
};

const borderMap = computeSheetBorderMap(testSheetData);

// Cell 0_0 (Header A): Top should be thin (#999999), Bottom should be thick (#000000)
const b0_0 = borderMap.get("0_0");
assert.ok(b0_0, "Cell 0_0 must have borders");
assert.strictEqual(b0_0.t?.style, 1, "0_0 top must be thin (style 1)");
assert.strictEqual(b0_0.b?.style, 13, "0_0 bottom must be thick (style 13)");
assert.strictEqual(b0_0.b?.color, "#000000", "0_0 bottom color must be #000000");

// Cell 1_0 (Data A): Top shares edge with 0_0 bottom (thick style 13), bottom has style 12
const b1_0 = borderMap.get("1_0");
assert.ok(b1_0, "Cell 1_0 must have borders");
assert.strictEqual(b1_0.t?.style, 13, "1_0 top border shared with 0_0 bottom must resolve to thicker border (style 13)");
assert.strictEqual(b1_0.b?.style, 12, "1_0 bottom border has border-outside (double style 12)");

// Adjacent sync check: row 2 top (2_0.t) should synchronize with row 1 bottom (1_0.b)
const b2_0 = borderMap.get("2_0");
assert.ok(b2_0, "Cell 2_0 must have borders");
assert.strictEqual(b2_0.t?.style, 12, "2_0 top border must be synchronized with 1_0 bottom (double style 12)");

// Double border check on 1_1 (Data B): bottom should be style 12 (double)
const b1_1 = borderMap.get("1_1");
assert.ok(b1_1, "Cell 1_1 must have borders");
assert.strictEqual(b1_1.b?.style, 12, "1_1 bottom must be double (style 12)");

// Cell bd check on 1_2 (Data C): bottom has cell.bd style 13, right has borderInfo style 7 (#0000ff)
const b1_2 = borderMap.get("1_2");
assert.ok(b1_2, "Cell 1_2 must have borders");
assert.strictEqual(b1_2.r?.style, 7, "1_2 right border must be medium (style 7)");
assert.strictEqual(b1_2.b?.style, 13, "1_2 bottom border must come from cell.bd (thick style 13)");

console.log("   ✓ config.borderInfo (range and cell) and cell.bd properly resolved and synchronized");

// ============================================================================
// 3. End-to-End PDF Export with Preserved Border Thickness
// ============================================================================
console.log("\n--- 3. Testing End-to-End PDF Export with Preserved Borders ---");

const pdfDoc = buildSpreadsheetPdf({
  eventTitle: "Border Verification Gala",
  sheets: [
    {
      id: "sheet-border-1",
      event_id: "test-event-1",
      sheet_name: "BordersTest",
      data: testSheetData as any,
      sort_order: 0,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  orientation: "landscape",
});

const pdfBytes = pdfDoc.output("arraybuffer");
assert.ok(pdfBytes.byteLength > 10000, "PDF document with styled borders must generate valid bytes");
console.log(`   ✓ PDF export built successfully (${pdfBytes.byteLength} bytes) with preserved custom borders`);

// ============================================================================
// 4. Single Ctrl+Enter Keypress in Cell Editor
// ============================================================================
console.log("\n--- 4. Testing Single Ctrl+Enter Keypress Line Break ---");

// Mock standard browser DOM nodes for headless Node testing
class MockDOMNode {
  nodeType = 1;
  nodeName = "DIV";
  childNodes: MockDOMNode[] = [];
  parentNode: MockDOMNode | null = null;
  attributes: Record<string, string> = {};
  textContent = "";
  innerHTML = "";

  appendChild(child: MockDOMNode) {
    child.parentNode = this;
    this.childNodes.push(child);
    this.updateInnerHTML();
    return child;
  }

  insertBefore(newNode: MockDOMNode, refNode: MockDOMNode | null) {
    newNode.parentNode = this;
    const idx = refNode ? this.childNodes.indexOf(refNode) : -1;
    if (idx === -1) {
      this.childNodes.push(newNode);
    } else {
      this.childNodes.splice(idx, 0, newNode);
    }
    this.updateInnerHTML();
    return newNode;
  }

  removeChild(child: MockDOMNode) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    this.updateInnerHTML();
    return child;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  get nextSibling(): MockDOMNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx !== -1 && idx < this.parentNode.childNodes.length - 1
      ? this.parentNode.childNodes[idx + 1]
      : null;
  }

  get previousSibling(): MockDOMNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1] : null;
  }

  setAttribute(k: string, v: string) {
    this.attributes[k] = v;
  }

  getAttribute(k: string) {
    return this.attributes[k] ?? null;
  }

  querySelectorAll(sel: string): MockDOMNode[] {
    const results: MockDOMNode[] = [];
    for (const child of this.childNodes) {
      if (sel.includes("data-fortune-placeholder") && child.attributes["data-fortune-placeholder"] === "true") {
        results.push(child);
      }
      results.push(...child.querySelectorAll(sel));
    }
    return results;
  }

  updateInnerHTML() {
    this.innerHTML = this.childNodes
      .map((c) => {
        if (c.nodeName === "BR") return "<br>";
        return c.textContent || "";
      })
      .join("");
  }
}

class MockDOMTextNode extends MockDOMNode {
  nodeType = 3;
  nodeName = "#text";
  constructor(txt: string) {
    super();
    this.textContent = txt;
  }
}

class MockDOMBrElement extends MockDOMNode {
  nodeName = "BR";
}

class MockDOMEditorElement extends MockDOMNode {
  isContentEditable = true;
  id = "luckysheet-rich-text-editor";
  dispatchedEvents: string[] = [];

  dispatchEvent(evt: { type: string }) {
    this.dispatchedEvents.push(evt.type);
    return true;
  }
}

// Setup simulated window and document
const mockEditor = new MockDOMEditorElement();
const textNode1 = new MockDOMTextNode("test1");
mockEditor.appendChild(textNode1);

let mockSelectionRange: {
  node: MockDOMNode;
  offset: number;
} = { node: textNode1, offset: 5 };

(globalThis as any).window = {
  getSelection: () => ({
    rangeCount: 1,
    getRangeAt: () => ({
      deleteContents: () => {},
      insertNode: (node: MockDOMNode) => {
        mockEditor.appendChild(node);
      },
      setStartAfter: (node: MockDOMNode) => {
        mockSelectionRange = { node, offset: 0 };
      },
      setEndAfter: (node: MockDOMNode) => {},
    }),
    removeAllRanges: () => {},
    addRange: () => {},
  }),
};

(globalThis as any).document = {
  activeElement: mockEditor,
  createElement: (tag: string) => {
    if (tag.toLowerCase() === "br") return new MockDOMBrElement();
    return new MockDOMNode();
  },
  createTextNode: (txt: string) => new MockDOMTextNode(txt),
};

(globalThis as any).Node = {
  TEXT_NODE: 3,
};

assert.strictEqual(isCellEditorActive(), true, "mockEditor must be identified as active cell editor");

// Simulate FIRST Ctrl+Enter keypress
const handledFirstPress = insertNewlineAtCaret(mockEditor as any);
assert.strictEqual(handledFirstPress, true, "insertNewlineAtCaret must handle the first Ctrl+Enter");

// After 1st press: mockEditor must contain a <br> AND a placeholder <br> so line break is visibly rendered immediately
const brNodes = mockEditor.childNodes.filter((c) => c.nodeName === "BR");
assert.strictEqual(brNodes.length, 2, "First press MUST insert visual <br> plus placeholder <br> for browser layout");
assert.strictEqual(
  brNodes[1].getAttribute("data-fortune-placeholder"),
  "true",
  "Trailing br must be marked as data-fortune-placeholder"
);
assert.ok(mockEditor.dispatchedEvents.includes("input"), "input event must be dispatched to sync state");
console.log("   ✓ Single Ctrl+Enter immediately inserts visual line break (<br>) on FIRST press");

// User types 'test2' after the line break
const textNode2 = new MockDOMTextNode("test2");
mockEditor.insertBefore(textNode2, brNodes[1]);

// Simulate cell commit (e.g. Enter without Ctrl or blur)
cleanEditorOnCommit(mockEditor as any);

// After commit: placeholder <br> must be cleanly removed so no double \n\n occurs
const remainingBr = mockEditor.childNodes.filter((c) => c.nodeName === "BR");
assert.strictEqual(remainingBr.length, 1, "After commit, placeholder <br> is removed leaving exact 1 line break");
console.log("   ✓ cleanEditorOnCommit cleanly strips layout placeholder <br>, avoiding double newlines");

// ============================================================================
// 5. Wrap Text (tb: "2") & Serialization on Commit
// ============================================================================
console.log("\n--- 5. Testing Wrap Text (tb: '2') Serialization ---");

// Cell with multiline string normalized through normalizeCellForFortuneSheet
const multilineRaw = {
  v: "test1\ntest2",
};
const normalized = normalizeCellForFortuneSheet(multilineRaw);
assert.strictEqual(normalized.tb, "2", "Multiline cell MUST automatically have tb: '2' (wrap text)");
assert.strictEqual(normalized.ct?.t, "inlineStr", "Multiline cell MUST use inlineStr for FortuneSheet rendering");

// Round trip through sanitizeSheetData
const sheetPayload = {
  name: "Sheet 1",
  data: [[normalized]],
};
const sanitized = sanitizeSheetData(sheetPayload as any) as any;
assert.strictEqual(sanitized.data?.[0]?.[0]?.tb, "2", "tb: '2' wrap text must be preserved after sanitizeSheetData");
assert.strictEqual(sanitized.data?.[0]?.[0]?.v, "test1\r\ntest2", "Newlines preserved in FortuneSheet inline format");

console.log("   ✓ Wrap text (tb: '2') correctly enforced on cell commit and sanitization");

console.log("\n==================================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
console.log("==================================================================");
