import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/* eslint-disable react/forbid-elements -- This IS the <Checkbox> SSOT wrapper */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          // rounded-sm (6px) chứ KHÔNG rounded-md: --radius-md = 8px = đúng nửa cạnh ô 16px
          // → checkbox thành hình tròn, không phân biệt được với <Radio> (rounded-full).
          // shrink-0: trong label flex, ô bị bóp 16px → 12,6px nếu thiếu.
          "peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-border bg-white checked:bg-primary/10 checked:border-primary transition-all focus:outline-none cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
/* eslint-enable react/forbid-elements */

Checkbox.displayName = "Checkbox";

export { Checkbox };
