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
  }).format(date);
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
  const marker = "/event-documents/";
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(fileUrl.substring(idx + marker.length).split("?")[0]);
  }
  return fileUrl;
}

