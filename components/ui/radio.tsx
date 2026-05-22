import * as React from "react";
import { cn } from "@/lib/utils";

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/* eslint-disable react/forbid-elements -- This IS the <Radio> SSOT wrapper */
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="radio"
        className={cn(
          "peer h-4 w-4 appearance-none rounded-full border border-border bg-white checked:bg-primary checked:border-primary transition-all focus:outline-none cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
/* eslint-enable react/forbid-elements */

Radio.displayName = "Radio";

export { Radio };
