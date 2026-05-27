/**
 * Finance Module Constants
 *
 * Centralized constants for finance operations to eliminate magic numbers
 * and improve code maintainability.
 */

// ─── Query Limits ───────────────────────────────────────────
/** Maximum items per page for ledger queries */
export const MAX_LEDGER_PAGE_SIZE = 50;

/** Maximum items per page for finance operations queries */
export const MAX_FINANCE_PAGE_SIZE = 50;

/** Maximum items for autocomplete/search results */
export const MAX_SEARCH_LIMIT = 100;

/** Maximum items for bulk queries (receipts, expenses, etc.) */
export const MAX_BULK_QUERY_LIMIT = 1000;

/** Chunk size for batch processing */
export const BATCH_CHUNK_SIZE = 50;

// ─── Text & Validation ──────────────────────────────────────
/** Maximum length for search query strings */
export const MAX_SEARCH_STRING_LENGTH = 100;

// ─── Calculations ───────────────────────────────────────────
/** Maximum percentage value (100%) */
export const MAX_PERCENTAGE = 100;

/** Multiplier for percentage calculation with 1 decimal precision */
export const PERCENTAGE_PRECISION_MULTIPLIER = 1000;

/** Divisor for percentage calculation with 1 decimal precision */
export const PERCENTAGE_PRECISION_DIVISOR = 10;

/**
 * Calculate percentage with 1 decimal precision
 * @param value - Numerator value
 * @param total - Denominator value
 * @returns Percentage with 1 decimal place (e.g., 45.6)
 *
 * @example
 * ```ts
 * calculatePercentage(456, 1000) // returns 45.6
 * calculatePercentage(0, 1000)   // returns 0
 * calculatePercentage(100, 0)    // returns 0 (safe division by zero)
 * ```
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * PERCENTAGE_PRECISION_MULTIPLIER) / PERCENTAGE_PRECISION_DIVISOR;
}

/**
 * Calculate progress percentage capped at 100%
 * @param current - Current progress value
 * @param target - Target value
 * @returns Percentage from 0 to 100
 *
 * @example
 * ```ts
 * calculateProgress(50, 100)  // returns 50
 * calculateProgress(150, 100) // returns 100 (capped)
 * calculateProgress(0, 100)   // returns 0
 * calculateProgress(50, 0)    // returns 0 (safe division by zero)
 * ```
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(MAX_PERCENTAGE, Math.round((current / target) * MAX_PERCENTAGE));
}
