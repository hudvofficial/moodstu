/* eslint-disable react/forbid-elements */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** When true, renders only the <textarea> (no wrapper/label/error). */
  unstyled?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, unstyled = false, ...props }, ref) => {
    const textarea = (
      <textarea
        className={cn(
          "input-base",
          error && "input-error",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (unstyled) return textarea;

    return (
      <div className="w-full space-y-1 min-w-0">
        {label && <label className="label-base">{label}</label>}
        {textarea}
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
