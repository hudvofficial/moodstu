/**
 * Unit tests for finance-utils.ts (P0-3 fix)
 * Tests the updated asNumber() function with clamping
 */

import { describe, it, expect } from '@jest/globals';
import { asNumber } from '@/lib/finance-utils';

describe('finance-utils asNumber (P0-3 Fix)', () => {
  describe('Valid amounts', () => {
    it('should convert valid numbers correctly', () => {
      expect(asNumber(1000)).toBe(1000);
      expect(asNumber(0)).toBe(0);
      expect(asNumber(123.45)).toBe(123.45);
    });

    it('should convert string numbers correctly', () => {
      expect(asNumber('1000')).toBe(1000);
      expect(asNumber('0')).toBe(0);
      expect(asNumber('123.45')).toBe(123.45);
    });

    it('should handle maximum valid amount', () => {
      expect(asNumber(10_000_000_000)).toBe(10_000_000_000);
      expect(asNumber('10000000000')).toBe(10_000_000_000);
    });
  });

  describe('Clamping (P0-3 Fix)', () => {
    it('should clamp negative amounts to 0', () => {
      expect(asNumber(-1000)).toBe(0);
      expect(asNumber(-999999)).toBe(0);
      expect(asNumber('-5000')).toBe(0);
    });

    it('should clamp amounts exceeding maximum', () => {
      expect(asNumber(10_000_000_001)).toBe(10_000_000_000);
      expect(asNumber(999_999_999_999)).toBe(10_000_000_000);
      expect(asNumber('99999999999999')).toBe(10_000_000_000);
    });

    it('should clamp Infinity to maximum', () => {
      expect(asNumber(Infinity)).toBe(10_000_000_000);
      expect(asNumber(-Infinity)).toBe(0);
    });
  });

  describe('Fallback to 0', () => {
    it('should return 0 for NaN', () => {
      expect(asNumber(NaN)).toBe(0);
      expect(asNumber('abc')).toBe(0);
      expect(asNumber(undefined)).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(asNumber(null)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(asNumber('')).toBe(0);
    });
  });

  describe('Type coercion', () => {
    it('should handle boolean values', () => {
      expect(asNumber(true)).toBe(1);
      expect(asNumber(false)).toBe(0);
    });

    it('should handle objects with valueOf', () => {
      const obj = { valueOf: () => 1000 };
      expect(asNumber(obj)).toBe(1000);
    });
  });

  describe('Real-world database scenarios', () => {
    it('should safely handle database nulls', () => {
      // Simulating: SELECT COALESCE(amount, null) FROM payments
      expect(asNumber(null)).toBe(0);
    });

    it('should safely handle missing fields', () => {
      // Simulating: const amount = row.amount; // undefined
      expect(asNumber(undefined)).toBe(0);
    });

    it('should clamp corrupted database values', () => {
      // If database somehow has negative value (data corruption)
      expect(asNumber(-9999)).toBe(0);
    });

    it('should handle typical payment amounts from DB', () => {
      // Simulating real query results
      const dbRows = [
        { amount: '1000000' },
        { amount: 5000000 },
        { amount: null },
        { amount: '0' },
      ];

      const amounts = dbRows.map(row => asNumber(row.amount));
      expect(amounts).toEqual([1_000_000, 5_000_000, 0, 0]);
    });
  });

  describe('Regression: P0-3 bugs prevented', () => {
    it('prevents negative amount bug in dashboard metrics', () => {
      // Line 132 in finance-dashboard-queries.ts:
      // totalInflow = sumRows(payments.data, "amount")
      // Before: would accept negative amounts
      const corruptedPayments = [
        { amount: 1_000_000 },
        { amount: -500_000 }, // Malicious/corrupted
        { amount: 2_000_000 },
      ];

      const total = corruptedPayments.reduce((sum, p) => sum + asNumber(p.amount), 0);
      // After fix: negative clamped to 0
      expect(total).toBe(3_000_000); // Not 2_500_000
    });

    it('prevents overflow in revenue calculation', () => {
      // Line 159-160 in finance-dashboard-queries.ts
      const overflowValue = 999_999_999_999_999;
      expect(asNumber(overflowValue)).toBe(10_000_000_000);
    });
  });
});
