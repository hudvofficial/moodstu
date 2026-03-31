/* eslint-disable react/forbid-elements */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1 min-w-0">
        {label && <label className="label-base">{label}</label>}
        <textarea
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
Textarea.displayName = "Textarea";

export { Textarea };
