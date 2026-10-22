"use client";

import React from "react";
import { Shield, NotebookPen, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface UserAvatarProps {
  /** User object with role and avatar_color */
  user?: {
    role?: string | null;
    avatar_color?: string | null;
    avatarColor?: string | null;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  /** Explicit role override: 'admin' | 'manager' | 'staff' */
  role?: string | null;
  /** Explicit custom color override (primarily for ADMIN) */
  avatarColor?: string | null;
  /** Display name for tooltips / aria-label */
  name?: string | null;
  /** Avatar dimension presets */
  size?: AvatarSize;
  /** Additional CSS class names */
  className?: string;
  /** Whether to render a tooltip with user name & role */
  showTooltip?: boolean;
}

const SIZE_CONFIG: Record<
  AvatarSize,
  { container: string; icon: string; strokeWidth: number }
> = {
  xs: {
    container: "w-5 h-5 min-w-5 min-h-5",
    icon: "w-3 h-3",
    strokeWidth: 2.4,
  },
  sm: {
    container: "w-7 h-7 min-w-7 min-h-7",
    icon: "w-3.5 h-3.5",
    strokeWidth: 2.2,
  },
  md: {
    container: "w-8 h-8 min-w-8 min-h-8",
    icon: "w-4 h-4",
    strokeWidth: 2.0,
  },
  lg: {
    container: "w-10 h-10 min-w-10 min-h-10",
    icon: "w-5 h-5",
    strokeWidth: 2.0,
  },
  xl: {
    container: "w-14 h-14 min-w-14 min-h-14",
    icon: "w-7 h-7",
    strokeWidth: 2.0,
  },
};

/** Standard colors for Manager and Staff */
const SUPER_ADMIN_DEFAULT_COLOR = "#f59e0b"; // Golden Amber Accent
const MANAGER_DEFAULT_COLOR = "#af52de"; // Apple Purple
const STAFF_DEFAULT_COLOR = "#64748b"; // Professional Slate
const ADMIN_DEFAULT_COLOR = "#007aff"; // Apple Classic Blue

/**
 * Validates and ensures a clean hex string with '#' prefix
 */
function normalizeColor(color?: string | null, fallback = "#007aff"): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return fallback;
}

/**
 * Smart User Avatar component:
 * - ADMIN: Renders Shield icon with user's customized avatar_color (fallback to #007aff)
 * - MANAGER: Renders NotebookPen icon with standard manager violet tone
 * - STAFF: Renders User icon with standard staff slate tone
 */
export function UserAvatar({
  user,
  role: propRole,
  avatarColor: propColor,
  name: propName,
  size = "md",
  className = "",
  showTooltip = true,
}: UserAvatarProps) {
  // Resolve effective role
  const rawRole = (propRole || user?.role || "staff").toString().trim().toLowerCase();
  const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin";
  const isAdmin = rawRole === "admin" || isSuperAdmin;
  const isManager = rawRole === "manager";
  const isStaff = !isAdmin && !isManager;

  // Resolve user display name
  const displayName = propName || user?.full_name || user?.name || user?.email || (
    isSuperAdmin ? "Super Administrator" : isAdmin ? "Administrator" : isManager ? "Event Manager" : "Kru Operasional"
  );

  const roleLabel = isSuperAdmin
    ? "Super Administrator"
    : rawRole === "admin"
      ? "Administrator"
      : isManager
        ? "Event Manager"
        : "Staff";
  const tooltipText = showTooltip ? `${displayName} • ${roleLabel}` : undefined;

  const sizeCfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  if (isAdmin) {
    const adminColor = normalizeColor(
      propColor || user?.avatar_color || user?.avatarColor,
      isSuperAdmin ? SUPER_ADMIN_DEFAULT_COLOR : ADMIN_DEFAULT_COLOR
    );

    return (
      <div
        title={tooltipText}
        aria-label={tooltipText}
        data-role="admin"
        data-avatar-color={adminColor}
        className={cn(
          "relative rounded-full flex items-center justify-center shrink-0 transition-transform select-none shadow-xs",
          sizeCfg.container,
          className
        )}
        style={{
          backgroundColor: `${adminColor}18`,
          border: `1.5px solid ${adminColor}38`,
          color: adminColor,
        }}
      >
        <Shield
          className={cn(sizeCfg.icon, "shrink-0 fill-current/10")}
          style={{ color: adminColor }}
          strokeWidth={sizeCfg.strokeWidth}
        />
      </div>
    );
  }

  if (isManager) {
    const managerColor = MANAGER_DEFAULT_COLOR;
    return (
      <div
        title={tooltipText}
        aria-label={tooltipText}
        data-role="manager"
        className={cn(
          "relative rounded-full flex items-center justify-center shrink-0 transition-transform select-none shadow-xs",
          sizeCfg.container,
          className
        )}
        style={{
          backgroundColor: `${managerColor}18`,
          border: `1.5px solid ${managerColor}38`,
          color: managerColor,
        }}
      >
        <NotebookPen
          className={cn(sizeCfg.icon, "shrink-0 fill-current/10")}
          style={{ color: managerColor }}
          strokeWidth={sizeCfg.strokeWidth}
        />
      </div>
    );
  }

  // Staff (Default)
  const staffColor = STAFF_DEFAULT_COLOR;
  return (
    <div
      title={tooltipText}
      aria-label={tooltipText}
      data-role="staff"
      className={cn(
        "relative rounded-full flex items-center justify-center shrink-0 transition-transform select-none shadow-xs bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-300",
        sizeCfg.container,
        className
      )}
      style={{
        backgroundColor: `${staffColor}18`,
        border: `1.5px solid ${staffColor}38`,
        color: staffColor,
      }}
    >
      <User
        className={cn(sizeCfg.icon, "shrink-0 fill-current/10")}
        style={{ color: staffColor }}
        strokeWidth={sizeCfg.strokeWidth}
      />
    </div>
  );
}

export default UserAvatar;
