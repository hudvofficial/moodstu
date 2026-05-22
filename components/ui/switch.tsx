"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";
import { haptic } from "@/lib/haptic";

/* ═══════════════════════════════════════════
   Switch — SSOT Toggle Component
   Wraps @radix-ui/react-switch with design tokens
   CSS: .switch-root + .switch-thumb (forms.css)
   ═══════════════════════════════════════════ */

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, id, className, ...props }, ref) => {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        checked={checked}
        onCheckedChange={(value) => {
          haptic("light");
          onCheckedChange(value);
        }}
        disabled={disabled}
        id={id}
        data-focus-ring="custom"
        className={`switch-root${className ? ` ${className}` : ""}`}
        {...props}
      >
        <SwitchPrimitive.Thumb className="switch-thumb" />
      </SwitchPrimitive.Root>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
