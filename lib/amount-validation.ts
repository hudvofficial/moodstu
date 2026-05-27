/**
 * ⚡ P0-3 FIX: Amount validation utility
 * Prevents negative amounts and overflow bugs
 */

export const AMOUNT_LIMITS = {
  MIN: 0,
  MAX: 10_000_000_000, // 10 billion VND
} as const;

export interface AmountValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: number;
}

/**
 * Validate and sanitize amount value
 * @param value - Amount to validate (can be unknown type from DB)
 * @param fieldName - Field name for error messages
 * @returns Validation result with sanitized value
 */
export function validateAmount(
  value: unknown,
  fieldName = "Số tiền"
): AmountValidationResult {
  // Coerce to number
  const num = Number(value);

  // Check if valid number
  if (Number.isNaN(num)) {
    return {
      isValid: false,
      error: `${fieldName} không hợp lệ`,
    };
  }

  // Check for infinity
  if (!Number.isFinite(num)) {
    return {
      isValid: false,
      error: `${fieldName} vượt quá giới hạn`,
    };
  }

  // Check minimum
  if (num < AMOUNT_LIMITS.MIN) {
    return {
      isValid: false,
      error: `${fieldName} phải lớn hơn hoặc bằng 0`,
    };
  }

  // Check maximum
  if (num > AMOUNT_LIMITS.MAX) {
    return {
      isValid: false,
      error: `${fieldName} vượt quá giới hạn cho phép (${AMOUNT_LIMITS.MAX.toLocaleString("vi-VN")} VND)`,
    };
  }

  return {
    isValid: true,
    sanitized: num,
  };
}

/**
 * Safe number coercion with validation
 * @param value - Value to convert
 * @param defaultValue - Default if invalid (default: 0)
 * @returns Sanitized number within valid range
 */
export function asValidAmount(value: unknown, defaultValue = 0): number {
  const result = validateAmount(value);
  return result.isValid ? (result.sanitized ?? defaultValue) : defaultValue;
}

/**
 * Throw error if amount is invalid
 * Use in server actions where we want to fail fast
 */
export function assertValidAmount(value: unknown, fieldName = "Số tiền"): number {
  const result = validateAmount(value, fieldName);
  if (!result.isValid) {
    throw new Error(result.error);
  }
  return result.sanitized!;
}
