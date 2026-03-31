import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "interactive";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

/* eslint-disable react/forbid-elements -- This IS the <Button> SSOT wrapper */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          `btn btn-${variant}`,
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);
/* eslint-enable react/forbid-elements */
Button.displayName = "Button";

export { Button };
