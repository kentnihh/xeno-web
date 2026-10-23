import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "primary" && "apple-btn-primary shadow-sm",
          variant === "secondary" && "apple-btn-secondary",
          variant === "outline" && "border border-border bg-transparent hover:bg-muted text-foreground",
          variant === "ghost" && "hover:bg-muted text-foreground",
          variant === "danger" && "bg-rose-500 hover:bg-rose-600 text-white",
          size === "sm" && "px-2.5 py-1 text-xs rounded-lg",
          size === "md" && "px-3.5 py-2 text-xs rounded-xl",
          size === "lg" && "px-5 py-2.5 text-sm rounded-xl",
          size === "icon" && "p-1.5 rounded-lg text-muted-foreground hover:text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
