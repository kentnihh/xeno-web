import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import { ConfirmModal, DeleteConfirmButton } from "../components/ui/confirm-modal";

// 1. Confirm exports exist and are callable functions
assert.strictEqual(typeof ConfirmModal, "function", "ConfirmModal must be exported as a function component");
assert.strictEqual(typeof DeleteConfirmButton, "function", "DeleteConfirmButton must be exported as a function component");

// 2. Test modal rendering with renderToString
const mockConfirm = async () => {};
const mockClose = () => {};

// Closed modal renders nothing
const closedHtml = renderToString(
  React.createElement(ConfirmModal, {
    isOpen: false,
    title: "Test Delete",
    itemName: "Acara Gala 2026",
    onConfirm: mockConfirm,
    onClose: mockClose,
  })
);
assert.strictEqual(closedHtml, "", "ConfirmModal must render empty string when isOpen is false");

// Open modal renders warning title, message with dynamic item name, cancel and delete buttons
const openHtml = renderToString(
  React.createElement(ConfirmModal, {
    isOpen: true,
    title: "Konfirmasi Hapus Acara",
    itemName: "Acara Gala 2026",
    onConfirm: mockConfirm,
    onClose: mockClose,
  })
);
assert(openHtml.includes("Konfirmasi Hapus Acara"), "Rendered HTML must include title");
assert(openHtml.includes("Acara Gala 2026"), "Rendered HTML must include dynamic item name");
assert(openHtml.includes("Batal"), "Rendered HTML must include Batal button");
assert(openHtml.includes("Hapus"), "Rendered HTML must include Hapus button");
assert(openHtml.includes("bg-[#ff453a]"), "Rendered HTML must style delete button in red");

// DeleteConfirmButton renders trigger element
const buttonHtml = renderToString(
  React.createElement(
    DeleteConfirmButton,
    {
      title: "Hapus Klien",
      itemName: "PT Sinar Abadi",
      onConfirm: mockConfirm,
      triggerClassName: "btn-delete-test",
    },
    React.createElement("span", null, "Hapus Klien")
  )
);
assert(buttonHtml.includes("btn-delete-test"), "DeleteConfirmButton must render trigger with provided className");
assert(buttonHtml.includes("Hapus Klien"), "DeleteConfirmButton must render trigger children");

console.log("ConfirmModal React SSR test passed successfully.");

