"use server";

import { withAuth } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// ═══════════════════════════════════════════
// Contract Profit Calculator — V2
// Revenue - (Task Costs + Print Costs + Direct Expenses) = Net Profit
// Phase 05: Atomic server-side calc (lesson #8)
// ═══════════════════════════════════════════

export interface ContractProfitData {
  contractId: string;
  contractCode: string;
  // Revenue
  totalAmount: number;         // Giá trị HĐ
  paidAmount: number;          // Đã thu
  remainingAmount: number;     // Còn lại
  // Cost breakdown
  taskCost: number;            // Chi phí nhân công
  printCost: number;           // Chi phí in ấn
  expenseCost: number;         // Chi phí khác (expenses linked)
  totalCost: number;           // Tổng chi phí
  // Profit
  grossProfit: number;         // Lợi nhuận gộp = revenue - costs
  profitMargin: number;        // % margin
  // Details
  taskCount: number;
  printOrderCount: number;
  expenseCount: number;
}

export async function getContractProfit(contractId: string) {
  return withAuth(async (supabase: SupabaseClient<Database>) => {
    // Run ALL queries in parallel for speed
    const [contractRes, tasksRes, printsRes, expensesRes] = await Promise.all([
      // 1. Contract revenue
      supabase
        .from("contracts")
        .select("id, contract_code, total_amount, paid_amount")
        .eq("id", contractId)
        .single(),

      // 2. Task costs (work_tasks)
      supabase
        .from("work_tasks")
        .select("id, cost")
        .eq("contract_id", contractId),

      // 3. Print costs (printing_orders)
      supabase
        .from("printing_orders")
        .select("id, total_amount")
        .eq("contract_id", contractId),

      // 4. Direct expenses (excluding [Auto-Print] to avoid double counting)
      supabase
        .from("expenses")
        .select("id, amount, description")
        .eq("contract_id", contractId)
        .is("deleted_at", null),
    ]);

    if (contractRes.error || !contractRes.data) {
      throw new Error("Không tìm thấy hợp đồng");
    }

    const contract = contractRes.data;
    const totalAmount = Number(contract.total_amount) || 0;
    const paidAmount = Number(contract.paid_amount) || 0;

    // Calculate costs
    const taskCost = (tasksRes.data || []).reduce(
      (sum, t) => sum + (Number(t.cost) || 0),
      0
    );

    const printCost = (printsRes.data || []).reduce(
      (sum, p) => sum + (Number(p.total_amount) || 0),
      0
    );

    // Expenses: exclude [Auto-Print] tagged ones (already counted in printCost)
    const directExpenses = (expensesRes.data || []).filter(
      (e) => !e.description?.startsWith("[Auto-Print]")
    );
    const expenseCost = directExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const totalCost = taskCost + printCost + expenseCost;
    const grossProfit = totalAmount - totalCost;
    const profitMargin =
      totalAmount > 0 ? Math.round((grossProfit / totalAmount) * 100) : 0;

    return {
      contractId,
      contractCode: contract.contract_code,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      taskCost,
      printCost,
      expenseCost,
      totalCost,
      grossProfit,
      profitMargin,
      taskCount: (tasksRes.data || []).length,
      printOrderCount: (printsRes.data || []).length,
      expenseCount: directExpenses.length,
    } as ContractProfitData;
  });
}

// ─── Batch: Multiple contracts profit ────
export async function getContractsProfitBatch(contractIds: string[]) {
  return withAuth(async (supabase: SupabaseClient<Database>) => {
    if (contractIds.length === 0) return [];

    const CHUNK_SIZE = 50;
    const contractIdChunks = [];
    for (let i = 0; i < contractIds.length; i += CHUNK_SIZE) {
      contractIdChunks.push(contractIds.slice(i, i + CHUNK_SIZE));
    }

    const contracts: any[] = [];
    const tasks: any[] = [];
    const prints: any[] = [];
    const expenses: any[] = [];

    for (const chunk of contractIdChunks) {
      const [contractsRes, tasksRes, printsRes, expensesRes] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, contract_code, total_amount, paid_amount")
          .in("id", chunk),
        supabase
          .from("work_tasks")
          .select("id, contract_id, cost")
          .in("contract_id", chunk),
        supabase
          .from("printing_orders")
          .select("id, contract_id, total_amount")
          .in("contract_id", chunk),
        supabase
          .from("expenses")
          .select("id, contract_id, amount, description")
          .in("contract_id", chunk)
          .is("deleted_at", null),
      ]);

      contracts.push(...(contractsRes.data || []));
      tasks.push(...(tasksRes.data || []));
      prints.push(...(printsRes.data || []));
      expenses.push(...(expensesRes.data || []));
    }

    return contracts.map((c) => {
      const totalAmount = Number(c.total_amount) || 0;
      const paidAmount = Number(c.paid_amount) || 0;

      const cTasks = tasks.filter((t) => t.contract_id === c.id);
      const cPrints = prints.filter((p) => p.contract_id === c.id);
      const cExpenses = expenses.filter(
        (e) =>
          e.contract_id === c.id &&
          !e.description?.startsWith("[Auto-Print]")
      );

      const taskCost = cTasks.reduce((s, t) => s + (Number(t.cost) || 0), 0);
      const printCost = cPrints.reduce(
        (s, p) => s + (Number(p.total_amount) || 0),
        0
      );
      const expenseCost = cExpenses.reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0
      );
      const totalCost = taskCost + printCost + expenseCost;
      const grossProfit = totalAmount - totalCost;

      return {
        contractId: c.id,
        contractCode: c.contract_code,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        taskCost,
        printCost,
        expenseCost,
        totalCost,
        grossProfit,
        profitMargin:
          totalAmount > 0
            ? Math.round((grossProfit / totalAmount) * 100)
            : 0,
        taskCount: cTasks.length,
        printOrderCount: cPrints.length,
        expenseCount: cExpenses.length,
      } as ContractProfitData;
    });
  });
}
