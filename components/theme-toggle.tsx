"use client";

import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Pilih Tampilan"
      className="inline-flex items-center p-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700/80 shadow-inner"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        onClick={() => setTheme("light")}
        title="Beralih ke Mode Terang (Light Mode)"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          theme === "light"
            ? "bg-white text-neutral-900 shadow-sm shadow-black/10"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
        }`}
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline text-[11px]">Terang</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        onClick={() => setTheme("dark")}
        title="Beralih ke Mode Gelap (Dark Mode)"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          theme === "dark"
            ? "bg-[#007aff] text-white shadow-sm shadow-[#007aff]/30"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
        }`}
      >
        <Moon className="w-3.5 h-3.5 text-blue-200 dark:text-white" />
        <span className="hidden sm:inline text-[11px]">Gelap</span>
      </button>
    </div>
  );
}
