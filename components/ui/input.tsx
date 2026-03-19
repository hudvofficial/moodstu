import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1 min-w-0">
        {label && <label className="label-base">{label}</label>}
        <input
          type={type}
          className={cn(
            "input-base",
            error && "input-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
