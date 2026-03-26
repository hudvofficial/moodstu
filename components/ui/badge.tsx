import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "primary" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  solid?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
  neutral: "badge-neutral",
  primary: "badge-primary",
  accent: "badge-accent",
};

const solidVariantClasses: Record<BadgeVariant, string> = {
  success: "badge-solid-success",
  warning: "badge-solid-warning",
  error: "badge-solid-error",
  info: "badge-solid-info",
  neutral: "badge-solid-neutral",
  primary: "badge-solid-primary",
  accent: "badge-solid-accent",
};

export function Badge({ variant = "neutral", children, className, dot, solid }: BadgeProps) {
  const colorClass = solid ? solidVariantClasses[variant] : variantClasses[variant];
  return (
    <span className={cn("badge", colorClass, className)}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Helper: Map ENUM status → Badge variant
 * Dùng cho contract status, payment status, lead status, etc.
 */
export function getStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    // Contract
    draft: "neutral",
    moi: "info",
    dang_thuc_hien: "primary",
    hoan_thanh: "success",
    da_huy: "error",
    // Lead
    moi_lien_he: "info",
    dang_tu_van: "warning",
    da_chot: "success",
    mat_lead: "error",
    // Payment
    chua_thanh_toan: "warning",
    da_thanh_toan: "success",
    qua_han: "error",
    // Inventory
    san_sang: "success",
    da_dat: "accent",
    dang_thue: "primary",
    dang_giat: "warning",
    bao_tri: "error",
    ngung_kinh_doanh: "neutral",
    // Generic
    active: "success",
    inactive: "neutral",
    pending: "warning",
  };
  return map[status] || "neutral";
}
