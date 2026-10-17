/**
 * Registers "Montserrat" into FortuneSheet's locale font array and fontjson mapping.
 * Setting Montserrat at index 0 makes it the default font for the toolbar dropdown
 * and canvas rendering engine.
 *
 * NOTE: Uses dynamic import so that @fortune-sheet/core is code-split into client chunks
 * and NEVER bundled into Cloudflare Edge Worker server functions.
 */
export async function registerMontserratInFortuneSheet(): Promise<void> {
  try {
    const core = await import("@fortune-sheet/core");
    const loc = core.locale({ lang: "en" } as any);
    if (loc && Array.isArray(loc.fontarray)) {
      if (!loc.fontarray.includes("Montserrat")) {
        loc.fontarray.unshift("Montserrat");
      }
      if (loc.fontjson) {
        const fontMap = loc.fontjson as Record<string, number>;
        fontMap["montserrat"] = 0;
        loc.fontarray.forEach((font: string, idx: number) => {
          fontMap[font.toLowerCase()] = idx;
        });
      }
    }
  } catch (err) {
    console.warn("[registerMontserratInFortuneSheet] Could not configure font:", err);
  }
}
