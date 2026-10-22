"use client";

import React from "react";
import { Crown, ShieldCheck, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoleBadgeProps {
  role?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

/**
 * Standard visual role badge for the XENO Operations platform.
 * Features an exclusive golden/amber gradient & crown icon for SUPER_ADMIN.
 */
export function RoleBadge({
  role = "staff",
  size = "sm",
  className = "",
  showIcon = true,
}: RoleBadgeProps) {
  const norm = (role || "staff").toString().trim().toLowerCase();
  const isSuperAdmin = norm === "super_admin" || norm === "superadmin";
  const isAdmin = norm === "admin";
  const isManager = norm === "manager";

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[9px] gap-1",
    sm: "px-2.5 py-0.5 text-[10px] gap-1.5",
    md: "px-3 py-1 text-xs gap-1.5",
  }[size];

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  }[size];

  if (isSuperAdmin) {
    return (
      <span
        data-role="super_admin"
        className={cn(
          "inline-flex items-center font-extrabold tracking-wider uppercase rounded-full select-none transition-all",
          "bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-purple-500/20",
          "text-amber-700 dark:text-amber-300 border border-amber-400/40 dark:border-amber-500/40",
          "shadow-[0_1px_8px_rgba(245,158,11,0.22)]",
          sizeClasses,
          className
        )}
      >
        {showIcon && (
          <Crown
            className={cn(
              iconSizes,
              "text-amber-500 dark:text-amber-400 fill-amber-500/20 stroke-[2.4] shrink-0"
            )}
          />
        )}
        <span>SUPER ADMIN</span>
      </span>
    );
  }

  if (isAdmin) {
    return (
      <span
        data-role="admin"
        className={cn(
          "inline-flex items-center font-bold tracking-wider uppercase rounded-full border select-none transition-all",
          "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          sizeClasses,
          className
        )}
      >
        {showIcon && <ShieldCheck className={cn(iconSizes, "text-blue-500 shrink-0")} />}
        <span>ADMIN</span>
      </span>
    );
  }

  if (isManager) {
    return (
      <span
        data-role="manager"
        className={cn(
          "inline-flex items-center font-bold tracking-wider uppercase rounded-full border select-none transition-all",
          "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
          sizeClasses,
          className
        )}
      >
        {showIcon && <Shield className={cn(iconSizes, "text-purple-500 shrink-0")} />}
        <span>MANAGER</span>
      </span>
    );
  }

  // Staff
  return (
    <span
      data-role="staff"
      className={cn(
        "inline-flex items-center font-semibold tracking-wider uppercase rounded-full border select-none transition-all",
        "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        sizeClasses,
        className
      )}
    >
      {showIcon && <User className={cn(iconSizes, "text-slate-500 shrink-0")} />}
      <span>STAFF</span>
    </span>
  );
}
