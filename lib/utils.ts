import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes with clsx conditionals and twMerge deduplication.
 * @param inputs - Array or vararg of class values, objects, or arrays
 * @returns Deduplicated className string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric value or numeric string into Indonesian Rupiah (IDR) currency format.
 * Example: 250000000 -> "Rp 250.000.000"
 * @param amount - Value in IDR
 * @returns Formatted currency string
 */
export function formatIDR(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats an ISO date string into readable Indonesian date and time.
 * Example: "2026-10-15T09:00:00Z" -> "15 Okt 2026, 16.00"
 * @param dateStr - ISO string or date parseable string
 * @returns Formatted date string, or "-" if empty
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export const APP_TIME_ZONE = "Asia/Jakarta";

/**
 * Safely parses any date string into a Date object without timezone shift.
 * If the string lacks timezone offset (e.g., from <input type="datetime-local"> like "2026-10-25T09:00"),
 * it anchors to Asia/Jakarta (WIB, UTC+7), preventing server-environment UTC day/hour shifts.
 */
export function parseWIBDate(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  const str = String(input).trim();
  if (!str) return new Date();

  // If string has an explicit timezone (e.g., ends with "Z" or has "+07:00" / "-05:00")
  if (/(?:Z|[+-]\d{2}:\d{2}|[+-]\d{4})$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss -> explicitly attach +07:00 (WIB)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(str)) {
    const clean = str.length === 16 ? `${str}:00` : str;
    const d = new Date(`${clean}+07:00`);
    return isNaN(d.getTime()) ? new Date(str) : d;
  }

  // Format: YYYY-MM-DD -> treat as Jakarta midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+07:00`);
    return isNaN(d.getTime()) ? new Date(str) : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Kunci tanggal "YYYY-MM-DD" di zona Asia/Jakarta (sama di server & browser). */
export function toDateKey(input: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(input));
}

/** Contoh: "23 Okt 2026, 09.00 – 17.00" atau "23 Okt 2026, 09.00 – 25 Okt 2026, 17.00" */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start) return "-";
  if (!end || toDateKey(start) === toDateKey(end)) {
    const endTime = end
      ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: APP_TIME_ZONE,
      }).format(new Date(end))
      : "";
    return endTime ? `${formatDate(start)} – ${endTime}` : formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Formats byte size into human readable file size string (B, KB, MB, GB).
 * Example: 2450000 -> "2.3 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Extracts relative storage path from a full Supabase URL or returns the path as-is.
 */
export function getStoragePathFromUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  if (!fileUrl.startsWith("http")) return fileUrl;
  for (const bucket of ["bucket-files", "event-documents", "documents"]) {
    const marker = `/${bucket}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(fileUrl.substring(idx + marker.length).split("?")[0]);
    }
  }
  return fileUrl;
}

export type CountdownTone = "today" | "tomorrow" | "upcoming" | "past";

export interface CountdownInfo {
  label: string;
  tone: CountdownTone;
  diffDays: number;
}

/**
 * Computes countdown label relative to today (e.g., "Hari Ini", "Besok", "H-3", "Lewat 2h").
 * @param dateStr - ISO string or date parseable string
 * @param refDate - Optional reference date (default: now) for testing determinism
 */
export function getEventCountdown(
  dateStr: string | null | undefined,
  refDate?: Date
): CountdownInfo {
  if (!dateStr) return { label: "-", tone: "past", diffDays: -9999 };
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return { label: "-", tone: "past", diffDays: -9999 };

  const now = refDate || new Date();
  const keyToUtc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (keyToUtc(toDateKey(target)) - keyToUtc(toDateKey(now))) / oneDayMs
  );

  if (diffDays === 0) return { label: "Hari Ini", tone: "today", diffDays: 0 };
  if (diffDays === 1) return { label: "Besok", tone: "tomorrow", diffDays: 1 };
  if (diffDays > 1) return { label: `H-${diffDays}`, tone: "upcoming", diffDays };
  if (diffDays === -1) return { label: "Kemarin", tone: "past", diffDays: -1 };
  return { label: `Lewat ${Math.abs(diffDays)}h`, tone: "past", diffDays };
}

/**
 * Sorts events so that closest upcoming dates appear first (today, tomorrow, H-3...),
 * followed by past events (most recent past first).
 */
export function sortEventsUpcomingFirst<T extends { start_date: string }>(
  events: T[],
  refDate?: Date
): T[] {
  const now = refDate || new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return [...events].sort((a, b) => {
    const timeA = new Date(a.start_date).getTime();
    const timeB = new Date(b.start_date).getTime();
    const isUpcomingA = timeA >= todayStart;
    const isUpcomingB = timeB >= todayStart;

    if (isUpcomingA && isUpcomingB) {
      return timeA - timeB; // Closest upcoming first
    }
    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;
    return timeB - timeA; // Most recent past first
  });
}

export const TASK_PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

/**
 * Sorts tasks strictly by priority: Urgent -> High -> Medium -> Low.
 * Equal priority falls back to earliest due date.
 */
export function sortTasksByPriority<T extends { priority?: string | null; due_date?: string | null }>(
  tasks: T[]
): T[] {
  return [...tasks].sort((a, b) => {
    const keyA = (a.priority || "").toLowerCase();
    const keyB = (b.priority || "").toLowerCase();
    const wA = TASK_PRIORITY_WEIGHT[keyA] ?? 99;
    const wB = TASK_PRIORITY_WEIGHT[keyB] ?? 99;
    if (wA !== wB) return wA - wB;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return 0;
  });
}

/**
 * Normalizes any text string into a clean, safe snake_case identifier key.
 * Example: "Nama Lengkap" -> "nama_lengkap", "No. WhatsApp / HP" -> "no_whatsapp_hp"
 */
export function toSnakeCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
