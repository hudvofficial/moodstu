import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "interactive" | "icon";
  size?: "sm" | "md" | "lg";
  /** When true, skips SSOT styling (use with SSOT token classes like `tab-pill`, `btn-primary`, ...) */
  unstyled?: boolean;
  /** When true, shows a loading spinner */
  loading?: boolean;
}

const sizeMap = {
  sm: "px-3 py-2 text-xs min-h-[40px]",
  md: "px-5 py-3 text-sm min-h-[44px]",
  lg: "px-8 py-3.5 text-base min-h-[48px]",
};

/* eslint-disable react/forbid-elements -- This IS the <Button> SSOT wrapper */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", unstyled = false, loading = false, disabled, children, type = "button", ...props }, ref) => {
    const baseClassName = unstyled ? "" : variant === "icon" ? "icon-btn" : `btn btn-${variant}`;
    const sizeClassName = unstyled || variant === "icon" ? "" : sizeMap[size];

    return (
      <button
        type={type}
        ref={ref}
        className={cn(
          "cursor-pointer disabled:cursor-not-allowed",
          baseClassName,
          sizeClassName,
          loading && "opacity-70",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);
/* eslint-enable react/forbid-elements */
Button.displayName = "Button";

export { Button };
