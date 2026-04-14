/**
 * Seed production-like finance demo data.
 *
 * Usage:
 *   npx tsx scripts/seed-finance-demo.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TODAY = new Date().toISOString().split("T")[0];
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

type DbResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

async function expectOk<T>(label: string, promise: PromiseLike<DbResult<T>>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  if (data === null) throw new Error(`${label}: no data returned`);
  return data;
}

async function cleanupDemoData() {
  const { data: demoItems } = await supabase
    .from("inventory_items")
    .select("id")
    .like("item_code", "DEMO-VT-%");
  const demoItemIds = (demoItems || []).map((item) => item.id);

  await supabase.from("payments").delete().like("notes", "DEMO%");
  await supabase.from("receipts").delete().like("notes", "DEMO%");
  if (demoItemIds.length > 0) {
    await supabase.from("inventory_transactions").delete().in("item_id", demoItemIds);
  }
  await supabase.from("contracts").delete().like("contract_code", "DEMO-%");
  await supabase.from("customers").delete().like("customer_code", "DEMO-%");
  await supabase.from("inventory_items").delete().like("item_code", "DEMO-VT-%");
}

async function seed() {
  console.log("Seeding finance demo data...");
  await cleanupDemoData();

  const customers = await expectOk(
    "customers",
    supabase
      .from("customers")
      .insert([
        { customer_code: "DEMO-KH-001", full_name: "DEMO Nguyen Van A", phone: "0901111111", email: "demo-a@test.com", status: "active" },
        { customer_code: "DEMO-KH-002", full_name: "DEMO Tran Thi B", phone: "0902222222", email: "demo-b@test.com", status: "active" },
        { customer_code: "DEMO-KH-003", full_name: "DEMO Le Van C", phone: "0903333333", email: "demo-c@test.com", status: "active" },
      ])
      .select("id, full_name"),
  );

  const contracts = await expectOk(
    "contracts",
    supabase
      .from("contracts")
      .insert(
        (customers || []).map((customer, index) => {
          const total = (index + 1) * 10_000_000;
          return {
            contract_code: `DEMO-HD-${String(index + 1).padStart(3, "0")}`,
            customer_id: customer.id,
            contract_date: index === 0 ? MONTH_AGO : TODAY,
            work_date: TODAY,
            status: index === 2 ? "hoan_thanh" : "dang_thuc_hien",
            total_amount: total,
            paid_amount: 0,
            remaining_amount: total,
            payment_status: "chua_thanh_toan",
            service_type: "studio",
            transaction_type: "hop_dong",
            notes: "DEMO seed data",
          };
        }),
      )
      .select("id, contract_code, total_amount"),
  );

  for (const contract of contracts || []) {
    const payments = [
      {
        contract_id: contract.id,
        amount: 2_000_000,
        payment_method: "chuyen_khoan",
        payment_date: MONTH_AGO,
        payment_stage: "coc",
        notes: "DEMO coc hop dong",
      },
      {
        contract_id: contract.id,
        amount: 3_000_000,
        payment_method: "tien_mat",
        payment_date: TODAY,
        payment_stage: "thanh_toan",
        notes: "DEMO thanh toan dot 2",
      },
    ];

    await expectOk("payments", supabase.from("payments").insert(payments).select("id"));

    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, (contract.total_amount || 0) - paid);
    await expectOk(
      "contract totals",
      supabase
        .from("contracts")
        .update({
          paid_amount: paid,
          remaining_amount: remaining,
          payment_status: remaining <= 0 ? "da_thanh_toan" : "thanh_toan_mot_phan",
        })
        .eq("id", contract.id)
        .select("id"),
    );
  }

  await expectOk(
    "standalone receipts",
    supabase
      .from("receipts")
      .insert([
        {
          receipt_date: TODAY,
          receipt_type: "other_income",
          payment_type: "tien_mat",
          contract_id: null,
          customer_name: "DEMO Khach vang lai",
          receipt_amount: 500_000,
          previous_paid: 0,
          total_amount: 0,
          remaining_amount: 0,
          status: "confirmed",
          notes: "DEMO thu khac - ban frame anh le",
        },
        {
          receipt_date: TODAY,
          receipt_type: "other_income",
          payment_type: "chuyen_khoan",
          contract_id: null,
          customer_name: "DEMO Khach da xoa",
          receipt_amount: 999_000,
          previous_paid: 0,
          total_amount: 0,
          remaining_amount: 0,
          status: "confirmed",
          notes: "DEMO thu khac - soft deleted",
          deleted_at: new Date().toISOString(),
        },
      ])
      .select("id"),
  );

  const [inventoryItem] = await expectOk(
    "inventory item",
    supabase
      .from("inventory_items")
      .insert({
        item_code: "DEMO-VT-001",
        name: "DEMO Hop anh go",
        category: "Vat tu demo",
        unit: "cai",
        current_stock: 20,
        min_stock: 2,
        average_unit_price: 30_000,
        sale_price: 50_000,
        status: "active",
        notes: "DEMO inventory item",
      })
      .select("id, name"),
  );

  await expectOk(
    "sale receipt rpc",
    supabase.rpc("create_sale_receipt_atomic", {
      p_receipt: {
        receipt_date: TODAY,
        receipt_type: "sale_receipt",
        payment_type: "tien_mat",
        receipt_amount: 100_000,
        category_id: "",
        category_name: "Ban vat tu",
        customer_name: "DEMO Khach mua vat tu",
        customer_phone: "0909999999",
        notes: "DEMO sale receipt - inventory stock out",
        created_by: "",
      },
      p_items: [
        {
          item_id: inventoryItem.id,
          item_name: inventoryItem.name,
          quantity: 2,
          unit_cost: 50_000,
        },
      ],
    }),
  );

  console.log("Finance demo seed complete.");
  console.log("Expected: 6 payments, 2 active standalone receipts, 1 soft-deleted receipt, 1 stock-out transaction.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
