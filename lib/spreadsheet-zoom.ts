/**
 * Safely triggers FortuneSheet's native zoom via its global keydown handler.
 * FortuneSheet natively scales canvas drawing, text measurements, and adjusts
 * mouse hit-testing coordinates (x / zoomRatio, y / zoomRatio) so cell clicking
 * remains 100% pixel-perfect without canvas misalignment.
 */
export function triggerFortuneSheetNativeZoom(key: "+" | "-" | "0") {
  if (typeof document === "undefined") return;
  const keyCode = key === "+" ? 187 : key === "-" ? 189 : 48;
  const event = new KeyboardEvent("keydown", {
    key,
    code: key === "+" ? "Equal" : key === "-" ? "Minus" : "Digit0",
    which: keyCode,
    keyCode,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

/**
 * Steps to a target zoom ratio (e.g. 0.8, 1.2) safely using FortuneSheet's native zoom.
 */
export async function setFortuneSheetZoomLevel(current: number, target: number): Promise<void> {
  if (target === 1.0) {
    triggerFortuneSheetNativeZoom("0");
    return;
  }
  // Reset to 1.0 first if crossing 1.0 or moving from far away
  let currentVal = current;
  if (currentVal !== 1.0 && Math.sign(target - 1.0) !== Math.sign(currentVal - 1.0)) {
    triggerFortuneSheetNativeZoom("0");
    currentVal = 1.0;
    await new Promise((r) => setTimeout(r, 60));
  }

  const steps = Math.round((target - currentVal) / 0.1);
  const key = steps > 0 ? "+" : "-";
  const count = Math.abs(steps);

  for (let i = 0; i < count; i++) {
    triggerFortuneSheetNativeZoom(key);
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}

export const ZOOM_PRESETS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "90%", value: 0.9 },
  { label: "100%", value: 1.0 },
  { label: "110%", value: 1.1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2.0 },
];
