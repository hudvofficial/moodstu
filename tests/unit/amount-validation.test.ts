/**
 * Unit tests for amount validation (P0-3 fix)
 * Tests the new amount-validation.ts utility
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateAmount,
  asValidAmount,
  assertValidAmount,
  AMOUNT_LIMITS,
} from '@/lib/amount-validation';

describe('Amount Validation (P0-3 Fix)', () => {
  describe('validateAmount', () => {
    it('should accept valid positive amounts', () => {
      const result = validateAmount(1000);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(1000);
      expect(result.error).toBeUndefined();
    });

    it('should accept zero', () => {
      const result = validateAmount(0);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(0);
    });

    it('should accept maximum valid amount (10B VND)', () => {
      const result = validateAmount(AMOUNT_LIMITS.MAX);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(10_000_000_000);
    });

    it('should reject negative amounts', () => {
      const result = validateAmount(-1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lớn hơn hoặc bằng 0');
    });

    it('should reject amounts exceeding maximum', () => {
      const result = validateAmount(10_000_000_001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('vượt quá giới hạn');
    });

    it('should reject absurdly large amounts', () => {
      const result = validateAmount(999_999_999_999_999);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject NaN', () => {
      const result = validateAmount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('không hợp lệ');
    });

    it('should reject Infinity', () => {
      const result = validateAmount(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('vượt quá giới hạn');
    });

    it('should reject -Infinity', () => {
      const result = validateAmount(-Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle string numbers', () => {
      const result = validateAmount('1000');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(1000);
    });

    it('should reject non-numeric strings', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use custom field name in error messages', () => {
      const result = validateAmount(-100, 'Tiền cọc');
      expect(result.error).toContain('Tiền cọc');
    });
  });

  describe('asValidAmount', () => {
    it('should return sanitized value for valid amounts', () => {
      expect(asValidAmount(1000)).toBe(1000);
      expect(asValidAmount('5000')).toBe(5000);
    });

    it('should return default (0) for invalid amounts', () => {
      expect(asValidAmount(-1000)).toBe(0);
      expect(asValidAmount(NaN)).toBe(0);
      expect(asValidAmount('invalid')).toBe(0);
    });

    it('should return custom default for invalid amounts', () => {
      expect(asValidAmount(-1000, 100)).toBe(100);
      expect(asValidAmount(NaN, 999)).toBe(999);
    });

    it('should clamp amounts exceeding maximum to default', () => {
      expect(asValidAmount(10_000_000_001)).toBe(0);
      expect(asValidAmount(10_000_000_001, 1000)).toBe(1000);
    });
  });

  describe('assertValidAmount', () => {
    it('should return sanitized value for valid amounts', () => {
      expect(assertValidAmount(1000)).toBe(1000);
      expect(assertValidAmount('5000')).toBe(5000);
    });

    it('should throw error for negative amounts', () => {
      expect(() => assertValidAmount(-1000)).toThrow('lớn hơn hoặc bằng 0');
    });

    it('should throw error for amounts exceeding maximum', () => {
      expect(() => assertValidAmount(10_000_000_001)).toThrow('vượt quá giới hạn');
    });

    it('should throw error for NaN', () => {
      expect(() => assertValidAmount(NaN)).toThrow('không hợp lệ');
    });

    it('should throw error for Infinity', () => {
      expect(() => assertValidAmount(Infinity)).toThrow();
    });

    it('should use custom field name in error', () => {
      expect(() => assertValidAmount(-100, 'Phí dịch vụ')).toThrow('Phí dịch vụ');
    });
  });

  describe('Edge cases', () => {
    it('should handle very small positive amounts', () => {
      const result = validateAmount(0.01);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(0.01);
    });

    it('should handle amounts just below maximum', () => {
      const result = validateAmount(9_999_999_999);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(9_999_999_999);
    });

    it('should handle null/undefined gracefully', () => {
      expect(validateAmount(null).isValid).toBe(true); // Number(null) = 0
      expect(validateAmount(undefined).isValid).toBe(false); // Number(undefined) = NaN
    });

    it('should handle boolean values', () => {
      expect(validateAmount(true).sanitized).toBe(1); // Number(true) = 1
      expect(validateAmount(false).sanitized).toBe(0); // Number(false) = 0
    });
  });

  describe('Real-world scenarios (P0-3 bug prevention)', () => {
    it('should prevent the negative amount bug', () => {
      // Before fix: Number(-1000000) || 0 = -1000000 (accepted!)
      // After fix: validateAmount rejects it
      const maliciousInput = -1_000_000;
      const result = validateAmount(maliciousInput);
      expect(result.isValid).toBe(false);
    });

    it('should prevent the overflow bug', () => {
      // Before fix: Number(999999999999999) || 0 = overflow (accepted!)
      // After fix: validateAmount rejects it
      const overflowInput = 999_999_999_999_999;
      const result = validateAmount(overflowInput);
      expect(result.isValid).toBe(false);
    });

    it('should prevent the NaN injection bug', () => {
      // Before fix: Number('abc') || 0 = 0 (silent failure)
      // After fix: validateAmount rejects with clear error
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle typical payment amounts (1M-100M VND)', () => {
      const amounts = [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];
      amounts.forEach(amount => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(amount);
      });
    });
  });
});
