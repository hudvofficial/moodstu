// ═══════════════════════════════════════════
// Variant Colors — SSOT for badge/status styling
// Used by: employee-table, employee-card, + future modules
// ═══════════════════════════════════════════

/** Background + text classes for semantic badge variants */
export const VARIANT_COLORS: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error:   "bg-error/10 text-error",
  info:    "bg-info/10 text-info",
  neutral: "bg-surface text-text-muted",
  primary: "bg-primary/10 text-primary",
};

/** Dot color classes for status indicators */
export const VARIANT_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error:   "bg-error",
  info:    "bg-info",
  neutral: "bg-text-muted",
  primary: "bg-primary",
};
