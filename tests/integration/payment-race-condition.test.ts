/**
 * Integration test for payment race condition (P0-2 fix)
 * Tests concurrent payment processing
 *
 * NOTE: This test requires:
 * - Database connection
 * - Migration 20260527120000_fix_payment_race_condition.sql applied
 * - Test contract with known remaining amount
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Payment Race Condition (P0-2 Fix)', () => {
  let supabase: ReturnType<typeof createClient>;
  let testContractId: string;
  let testUserId: string;

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn('Skipping integration tests - missing Supabase env vars');
      return;
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test contract with known remaining amount
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        contract_code: `TEST-RACE-${Date.now()}`,
        total_amount: 10_000_000,
        paid_amount: 0,
        remaining_amount: 10_000_000,
        status: 'cho_xu_ly',
        payment_status: 'chua_thanh_toan',
      })
      .select('id')
      .single();

    if (contractError) throw contractError;
    testContractId = contract.id;

    // Get a test user ID (or create one)
    const { data: user } = await supabase.auth.admin.listUsers();
    testUserId = user.users[0]?.id || 'test-user-id';
  });

  afterAll(async () => {
    // Cleanup: soft delete test contract
    if (testContractId) {
      await supabase
        .from('contracts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', testContractId);
    }
  });

  describe('Concurrent payment processing', () => {
    it('should prevent overpayment when 2 users pay simultaneously', async () => {
      if (!supabase) {
        console.warn('Skipping test - no DB connection');
        return;
      }

      // Scenario: Contract has 5M remaining
      // User A tries to pay 5M
      // User B tries to pay 5M at the same time
      // Expected: Only ONE should succeed

      const { data: setupContract } = await supabase
        .from('contracts')
        .update({ remaining_amount: 5_000_000, paid_amount: 5_000_000 })
        .eq('id', testContractId)
        .select()
        .single();

      expect(setupContract?.remaining_amount).toBe(5_000_000);

      // Fire both payments concurrently
      const payment1Promise = supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 5_000_000,
        p_payment_method: 'tien_mat',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      const payment2Promise = supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 5_000_000,
        p_payment_method: 'chuyen_khoan',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      const [result1, result2] = await Promise.allSettled([
        payment1Promise,
        payment2Promise,
      ]);

      // One should succeed, one should fail
      const successCount = [result1, result2].filter(
        r => r.status === 'fulfilled' && !r.value.error
      ).length;

      const failedCount = [result1, result2].filter(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
      ).length;

      expect(successCount).toBe(1);
      expect(failedCount).toBe(1);

      // Verify final contract state
      const { data: finalContract } = await supabase
        .from('contracts')
        .select('paid_amount, remaining_amount')
        .eq('id', testContractId)
        .single();

      // Should have paid exactly 10M total (not 15M)
      expect(finalContract?.paid_amount).toBe(10_000_000);
      expect(finalContract?.remaining_amount).toBe(0);
    });

    it('should reject payment exceeding remaining amount', async () => {
      if (!supabase) return;

      // Setup: 3M remaining
      await supabase
        .from('contracts')
        .update({ remaining_amount: 3_000_000, paid_amount: 7_000_000 })
        .eq('id', testContractId);

      // Try to pay 5M (more than remaining)
      const { error } = await supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 5_000_000,
        p_payment_method: 'tien_mat',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('vuot qua so tien con lai');
    });

    it('should reject payment exceeding maximum (10B VND)', async () => {
      if (!supabase) return;

      const { error } = await supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 10_000_000_001, // Over 10B
        p_payment_method: 'tien_mat',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('exceeds maximum limit');
    });
  });

  describe('Payment status calculation (float precision fix)', () => {
    it('should correctly calculate "da_coc" status', async () => {
      if (!supabase) return;

      // Reset contract
      await supabase
        .from('contracts')
        .update({
          total_amount: 10_000_000,
          paid_amount: 0,
          remaining_amount: 10_000_000,
        })
        .eq('id', testContractId);

      // Pay 4.9M (less than half of 10M)
      const { data } = await supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 4_900_000,
        p_payment_method: 'tien_mat',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      // With fixed formula: v_paid * 2 < v_total
      // 4_900_000 * 2 = 9_800_000 < 10_000_000 → da_coc
      expect(data?.payment_status).toBe('da_coc');
    });

    it('should correctly calculate "thanh_toan_mot_phan" status', async () => {
      if (!supabase) return;

      // Reset and pay 6M (more than half)
      await supabase
        .from('contracts')
        .update({
          total_amount: 10_000_000,
          paid_amount: 0,
          remaining_amount: 10_000_000,
        })
        .eq('id', testContractId);

      const { data } = await supabase.rpc('process_contract_payment_v2', {
        p_contract_id: testContractId,
        p_amount: 6_000_000,
        p_payment_method: 'tien_mat',
        p_payment_date: new Date().toISOString().split('T')[0],
        p_created_by: testUserId,
      });

      // 6_000_000 * 2 = 12_000_000 > 10_000_000 → thanh_toan_mot_phan
      expect(data?.payment_status).toBe('thanh_toan_mot_phan');
    });
  });

  describe('Performance under concurrent load', () => {
    it('should handle 10 concurrent small payments without deadlock', async () => {
      if (!supabase) return;

      // Setup: 10M remaining
      await supabase
        .from('contracts')
        .update({
          total_amount: 10_000_000,
          paid_amount: 0,
          remaining_amount: 10_000_000,
        })
        .eq('id', testContractId);

      // 10 users each pay 500K
      const promises = Array.from({ length: 10 }, () =>
        supabase.rpc('process_contract_payment_v2', {
          p_contract_id: testContractId,
          p_amount: 500_000,
          p_payment_method: 'tien_mat',
          p_payment_date: new Date().toISOString().split('T')[0],
          p_created_by: testUserId,
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // All 10 should succeed (total 5M paid)
      const successCount = results.filter(
        r => r.status === 'fulfilled' && !r.value.error
      ).length;

      expect(successCount).toBe(10);

      // Should complete within reasonable time (not deadlocked)
      expect(duration).toBeLessThan(10000); // 10 seconds max

      // Verify final state
      const { data: final } = await supabase
        .from('contracts')
        .select('paid_amount')
        .eq('id', testContractId)
        .single();

      expect(final?.paid_amount).toBe(5_000_000);
    }, 15000); // 15s timeout for this test
  });
});
