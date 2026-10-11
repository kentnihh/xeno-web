import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Verify Theme Toggle & Provider
const themeProviderPath = path.join(process.cwd(), "components/theme-provider.tsx");
assert(fs.existsSync(themeProviderPath), "ThemeProvider must exist");
const themeProviderContent = fs.readFileSync(themeProviderPath, "utf-8");
assert(themeProviderContent.includes("ThemeProvider"), "ThemeProvider component must be defined");
assert(themeProviderContent.includes("useSyncExternalStore"), "ThemeProvider must use useSyncExternalStore");

const themeTogglePath = path.join(process.cwd(), "components/theme-toggle.tsx");
assert(fs.existsSync(themeTogglePath), "ThemeToggle must exist");
const themeToggleContent = fs.readFileSync(themeTogglePath, "utf-8");
assert(themeToggleContent.includes("ThemeToggle"), "ThemeToggle component must be defined");
assert(themeToggleContent.includes("Sun") && themeToggleContent.includes("Moon"), "ThemeToggle must have Sun and Moon icons");

// Verify Navbar
const navbarPath = path.join(process.cwd(), "components/navbar.tsx");
const navbarContent = fs.readFileSync(navbarPath, "utf-8");
assert(navbarContent.includes("ThemeToggle"), "Navbar must include ThemeToggle");
assert(navbarContent.includes("Buat Acara"), "Navbar must have prominent Buat Acara CTA");
assert(navbarContent.includes("apple-btn-primary"), "Buat Acara must use apple-btn-primary");

// Verify Sidebar
const sidebarPath = path.join(process.cwd(), "components/sidebar.tsx");
const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
assert(sidebarContent.includes("ChevronRight"), "Sidebar must have ChevronRight for affordance");
assert(sidebarContent.includes("Keluar Sistem"), "Sidebar must have explicit Keluar Sistem");
assert(sidebarContent.includes("LogOut"), "Sidebar must have LogOut icon");
assert(sidebarContent.includes("#007aff"), "Sidebar must have vibrant #007aff active state");

// Verify Dashboard
const dashboardPath = path.join(process.cwd(), "app/(dashboard)/page.tsx");
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
assert(dashboardContent.includes("Buat Acara"), "Dashboard header must have Buat Acara CTA");
assert(dashboardContent.includes("Daftar Acara Mendatang"), "Dashboard must contain Daftar Acara Mendatang");
assert(dashboardContent.includes("Tugas Kru Prioritas"), "Dashboard must contain Tugas Kru Prioritas");
assert(dashboardContent.includes("ChevronRight"), "Dashboard must contain ChevronRight affordance for cards");

// Verify Monthly Calendar
const calendarPath = path.join(process.cwd(), "components/dashboard/monthly-calendar.tsx");
const calendarContent = fs.readFileSync(calendarPath, "utf-8");
assert(calendarContent.includes("Kalender Acara Bulanan"), "Calendar component must exist");
assert(calendarContent.includes("border-border"), "Calendar must have clear semantic border contrast");
assert(calendarContent.includes("dayEvents"), "Calendar must handle day events");

// Verify Globals CSS
const globalsCssPath = path.join(process.cwd(), "app/globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
assert(globalsCss.includes(":root"), "Globals CSS must define :root");
assert(globalsCss.includes(".dark"), "Globals CSS must define .dark");
assert(globalsCss.includes("--background: #f5f5f7;"), "Globals CSS must define Light Mode --background");
assert(globalsCss.includes("--background: #000000;"), "Globals CSS must define Dark Mode --background");
assert(globalsCss.includes("@variant dark"), "Globals CSS must register dark variant for class selector");

console.log("All UI verification checks passed cleanly!");
