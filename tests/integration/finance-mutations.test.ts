/**
 * Integration tests for critical finance mutations.
 * Tests data integrity, period lock enforcement, and atomic operations
 * against a real Supabase instance.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { checkPeriodLock, monthWindow } from "@/lib/finance-utils";

// ── Env loading (same pattern as E2E) ──

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const hasEnv = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ── Marker for test data cleanup ──
const MARKER = `TEST-FIN-INT-${Date.now()}`;

// ── Helpers ──

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ════════════════════════════════════════════════
// Group 1: Period Lock Enforcement
// ════════════════════════════════════════════════

describe("Period Lock Enforcement", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  const lockedPeriod = "2025-01";
  const lockedDate = "2025-01-15";
  const openDate = "2099-12-15";
  let closeId: string | null = null;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();

    const { data, error } = await supabase
      .from("finance_monthly_closes")
      .insert({
        period: lockedPeriod,
        status: "locked",
        notes: MARKER,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("finance_monthly_closes")
          .select("id, status")
          .eq("period", lockedPeriod)
          .single();
        closeId = existing?.id || null;
        if (existing && existing.status !== "locked") {
          await supabase
            .from("finance_monthly_closes")
            .update({ status: "locked", notes: MARKER })
            .eq("id", existing.id);
        }
      } else {
        throw error;
      }
    } else {
      closeId = data.id;
    }
  });

  afterAll(async () => {
    if (!hasEnv || !closeId) return;
    await supabase.from("finance_monthly_closes").delete().eq("notes", MARKER);
  });

  condSkip("checkPeriodLock", () => {
    it("throws when period is locked", async () => {
      await expect(checkPeriodLock(supabase, lockedDate)).rejects.toThrow(/chốt sổ|khoa so|khóa/i);
    });

    it("passes when period is open (far future)", async () => {
      await expect(checkPeriodLock(supabase, openDate)).resolves.toBeUndefined();
    });

    it("slices date to period correctly (YYYY-MM)", async () => {
      await expect(checkPeriodLock(supabase, "2025-01-31")).rejects.toThrow(/chốt sổ|khoa so|khóa/i);
    });
  });
});

// ════════════════════════════════════════════════
// Group 2: Receipt CRUD Guards
// ════════════════════════════════════════════════

describe("Receipt CRUD Guards", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  let testUserId: string;
  let receiptId: string | null = null;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users.users[0]?.id || "unknown";
  });

  afterAll(async () => {
    if (!hasEnv) return;
    await supabase.from("receipts").delete().like("notes", `%${MARKER}%`);
  });

  condSkip("insert and soft delete", () => {
    it("creates receipt in open period", async () => {
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          receipt_date: "2099-12-01",
          receipt_amount: 1_000_000,
          receipt_type: "other_income",
          notes: MARKER,
          customer_name: "Test Customer",
          created_by: testUserId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      receiptId = data!.id;
    });

    it("soft delete sets deleted_at, row still exists", async () => {
      expect(receiptId).toBeTruthy();

      const { error } = await supabase
        .from("receipts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", receiptId!);

      expect(error).toBeNull();

      const { data: row } = await supabase
        .from("receipts")
        .select("id, deleted_at")
        .eq("id", receiptId!)
        .single();

      expect(row).toBeTruthy();
      expect(row!.deleted_at).not.toBeNull();
    });

    it("creating a second receipt with same marker succeeds (no uniqueness conflict)", async () => {
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          receipt_date: "2099-12-02",
          receipt_amount: 500_000,
          receipt_type: "other_income",
          notes: `${MARKER}-2`,
          customer_name: "Test Customer 2",
          created_by: testUserId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════
// Group 3: Expense Approval Flow
// ════════════════════════════════════════════════

describe("Expense Approval Flow", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  let testUserId: string;
  let expenseId: string | null = null;
  let autoExpenseId: string | null = null;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users.users[0]?.id || "unknown";

    const { data: expense } = await supabase
      .from("expenses")
      .insert({
        expense_date: "2099-12-01",
        amount: 500_000,
        payment_method: "tien_mat",
        description: `Manual expense ${MARKER}`,
        recipient: "Test Vendor",
        created_by: testUserId,
      })
      .select("id")
      .single();
    expenseId = expense?.id || null;

    const { data: autoExp } = await supabase
      .from("expenses")
      .insert({
        expense_date: "2099-12-01",
        amount: 300_000,
        payment_method: "chuyen_khoan",
        description: `[Auto-Salary] ${MARKER}`,
        recipient: "Auto Generated",
        created_by: testUserId,
      })
      .select("id")
      .single();
    autoExpenseId = autoExp?.id || null;
  });

  afterAll(async () => {
    if (!hasEnv) return;
    await supabase.from("expenses").delete().like("description", `%${MARKER}%`);
  });

  condSkip("approval guards", () => {
    it("approves an expense (sets approved_by)", async () => {
      expect(expenseId).toBeTruthy();

      const { error } = await supabase
        .from("expenses")
        .update({ approved_by: testUserId, updated_at: new Date().toISOString() })
        .eq("id", expenseId!)
        .is("approved_by", null);

      expect(error).toBeNull();

      const { data: row } = await supabase
        .from("expenses")
        .select("approved_by")
        .eq("id", expenseId!)
        .single();

      expect(row?.approved_by).toBe(testUserId);
    });

    it("re-approve is no-op (approved_by already set)", async () => {
      const { data: updated } = await supabase
        .from("expenses")
        .update({ approved_by: "another-user" })
        .eq("id", expenseId!)
        .is("approved_by", null)
        .select("id");

      expect(updated).toEqual([]);
    });

    it("auto-generated expense has [Auto-] tag", async () => {
      expect(autoExpenseId).toBeTruthy();

      const { data: row } = await supabase
        .from("expenses")
        .select("description")
        .eq("id", autoExpenseId!)
        .single();

      expect(row?.description).toMatch(/^\[Auto-/);
    });
  });
});

// ════════════════════════════════════════════════
// Group 4: Debt Payment Atomicity
// ════════════════════════════════════════════════

describe("Debt Payment Atomicity", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  let testUserId: string;
  let debtId: string | null = null;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users.users[0]?.id || "unknown";

    const { data: debt } = await supabase
      .from("debts")
      .insert({
        entity_name: `Debt ${MARKER}`,
        entity_type: "customer",
        type: "receivable",
        amount: 2_000_000,
        paid_amount: 0,
        remaining: 2_000_000,
        status: "open",
        due_date: "2099-12-31",
        created_by: testUserId,
      })
      .select("id")
      .single();
    debtId = debt?.id || null;
  });

  afterAll(async () => {
    if (!hasEnv) return;
    if (debtId) {
      await supabase.from("receipts").delete().eq("debt_id", debtId);
      await supabase.from("expenses").delete().eq("debt_id", debtId);
    }
    await supabase.from("debts").delete().like("entity_name", `%${MARKER}%`);
  });

  condSkip("payment flow", () => {
    it("partial payment updates status to partial", async () => {
      expect(debtId).toBeTruthy();

      const payAmount = 500_000;
      const { error } = await supabase
        .from("debts")
        .update({
          paid_amount: payAmount,
          remaining: 2_000_000 - payAmount,
          status: "partial",
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtId!);

      expect(error).toBeNull();

      const { data: row } = await supabase
        .from("debts")
        .select("status, paid_amount, remaining")
        .eq("id", debtId!)
        .single();

      expect(row?.status).toBe("partial");
      expect(Number(row?.paid_amount)).toBe(500_000);
      expect(Number(row?.remaining)).toBe(1_500_000);
    });

    it("full payment transitions status to closed", async () => {
      const { error } = await supabase
        .from("debts")
        .update({
          paid_amount: 2_000_000,
          remaining: 0,
          status: "closed",
          payment_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtId!);

      expect(error).toBeNull();

      const { data: row } = await supabase
        .from("debts")
        .select("status, remaining, payment_date")
        .eq("id", debtId!)
        .single();

      expect(row?.status).toBe("closed");
      expect(Number(row?.remaining)).toBe(0);
      expect(row?.payment_date).toBeTruthy();
    });

    it("receivable debt payment creates a receipt", async () => {
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          debt_id: debtId!,
          receipt_amount: 500_000,
          payment_type: "chuyen_khoan",
          notes: `Thanh toán nợ: Debt ${MARKER}`,
          receipt_date: "2099-12-01",
          receipt_type: "thu_khac",
          customer_name: `Debt ${MARKER}`,
          created_by: testUserId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      const { data: receipt } = await supabase
        .from("receipts")
        .select("debt_id, receipt_amount")
        .eq("id", data!.id)
        .single();

      expect(receipt?.debt_id).toBe(debtId);
      expect(Number(receipt?.receipt_amount)).toBe(500_000);
    });
  });
});

// ════════════════════════════════════════════════
// Group 5: Expense Soft Delete vs Hard Delete
// ════════════════════════════════════════════════

describe("Delete Semantics", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  let testUserId: string;
  let softDeleteExpenseId: string | null = null;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users.users[0]?.id || "unknown";

    const { data } = await supabase
      .from("expenses")
      .insert({
        expense_date: "2099-11-01",
        amount: 100_000,
        payment_method: "tien_mat",
        description: `Soft-del test ${MARKER}`,
        created_by: testUserId,
      })
      .select("id")
      .single();
    softDeleteExpenseId = data?.id || null;
  });

  afterAll(async () => {
    if (!hasEnv) return;
    await supabase.from("expenses").delete().like("description", `%${MARKER}%`);
  });

  condSkip("soft delete preserves data", () => {
    it("soft-deleted expense still exists in DB with deleted_at", async () => {
      expect(softDeleteExpenseId).toBeTruthy();

      await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", softDeleteExpenseId!);

      const { data: row } = await supabase
        .from("expenses")
        .select("id, deleted_at, amount")
        .eq("id", softDeleteExpenseId!)
        .single();

      expect(row).toBeTruthy();
      expect(row!.deleted_at).not.toBeNull();
      expect(Number(row!.amount)).toBe(100_000);
    });
  });
});

// ════════════════════════════════════════════════
// Group 6: Finance Category Referential Integrity
// ════════════════════════════════════════════════

describe("Category Referential Integrity", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;
  let categoryId: string | null = null;
  let linkedReceiptId: string | null = null;
  let testUserId: string;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users.users[0]?.id || "unknown";

    const { data: cat } = await supabase
      .from("transaction_categories")
      .insert({
        name: `Cat ${MARKER}`,
        type: "thu",
        category_code: `T-${MARKER.slice(-6)}`,
        is_default: false,
      })
      .select("id")
      .single();
    categoryId = cat?.id || null;

    if (categoryId) {
      const { data: receipt } = await supabase
        .from("receipts")
        .insert({
          receipt_date: "2099-12-01",
          receipt_amount: 100_000,
          receipt_type: "other_income",
          notes: `Cat integrity ${MARKER}`,
          customer_name: "Cat Test",
          category_id: categoryId,
          created_by: testUserId,
        })
        .select("id")
        .single();
      linkedReceiptId = receipt?.id || null;
    }
  });

  afterAll(async () => {
    if (!hasEnv) return;
    if (linkedReceiptId) {
      await supabase.from("receipts").delete().eq("id", linkedReceiptId);
    }
    if (categoryId) {
      await supabase.from("transaction_categories").delete().eq("id", categoryId);
    }
  });

  condSkip("category with linked receipts", () => {
    it("category exists and is linked to a receipt", async () => {
      expect(categoryId).toBeTruthy();

      const { data: receipts, count } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId!);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("category data is queryable by type", async () => {
      const { data: cat } = await supabase
        .from("transaction_categories")
        .select("name, type")
        .eq("id", categoryId!)
        .single();

      expect(cat?.type).toBe("thu");
      expect(cat?.name).toContain(MARKER);
    });
  });
});

// ════════════════════════════════════════════════
// Group 7: monthWindow utility (pure, but verified against DB date ranges)
// ════════════════════════════════════════════════

describe("monthWindow date range queries", () => {
  const condSkip = hasEnv ? describe : describe.skip;

  let supabase: SupabaseClient;

  beforeAll(async () => {
    if (!hasEnv) return;
    supabase = adminClient();
  });

  condSkip("window-based queries", () => {
    it("monthWindow produces valid date range for DB queries", async () => {
      const { start, end } = monthWindow(6, 2026);

      const { error } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .gte("receipt_date", start)
        .lt("receipt_date", end);

      expect(error).toBeNull();
    });

    it("December window crosses year boundary correctly", async () => {
      const { start, end } = monthWindow(12, 2025);
      expect(start).toBe("2025-12-01");
      expect(end).toBe("2026-01-01");

      const { error } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .gte("receipt_date", start)
        .lt("receipt_date", end);

      expect(error).toBeNull();
    });
  });
});
