import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** When true, renders only the <input> (no wrapper/label/error). */
  unstyled?: boolean;
  /** When false, does not apply the SSOT `input-base` class. */
  withBaseStyles?: boolean;
}

/* eslint-disable react/forbid-elements -- This IS the <Input> SSOT wrapper */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, unstyled = false, withBaseStyles = true, ...props }, ref) => {
    const input = (
      <input
        type={type}
        className={cn(
          withBaseStyles && "input-base",
          error && "input-error",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (unstyled) return input;

    return (
      <div className="w-full min-w-0">
        {label && <label className="label-base">{label}</label>}
        {input}
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }
);
/* eslint-enable react/forbid-elements */
Input.displayName = "Input";

export { Input };
