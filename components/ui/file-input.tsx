import * as React from "react";
import { cn } from "@/lib/utils";

export type FileInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/* eslint-disable react/forbid-elements -- This IS the <FileInput> SSOT wrapper */
const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="file"
        className={cn(
          "file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20",
          className,
        )}
        {...props}
      />
    );
  },
);
/* eslint-enable react/forbid-elements */

FileInput.displayName = "FileInput";

export { FileInput };
