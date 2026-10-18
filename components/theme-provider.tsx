"use client";

import React, { createContext, useContext, useCallback, useSyncExternalStore } from "react";

type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

const currentTheme: Theme = "light";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function getSnapshot(): Theme {
  return "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function forceLightTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light";
  root.setAttribute("data-theme", "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      localStorage.setItem("xeno-theme", "light");
    } catch {}
    forceLightTheme();
    notify();
  }, []);

  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((_t?: any) => {
    try {
      localStorage.setItem("xeno-theme", "light");
    } catch {}
    forceLightTheme();
    notify();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme("light");
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
