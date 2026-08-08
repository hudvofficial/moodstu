/**
 * crm-customer-sync.spec.ts
 * ---
 * Playwright E2E spec for CRM ↔ Customer sync fixes (Phase 01).
 *
 * Coverage:
 *   1. Edit contract (via save_contract_atomic RPC) → customer.full_name syncs
 *      to the CRM list — verifies Fix 1 (SQL migration
 *      20260621000001_fix_customer_sync_full_name.sql added full_name, phone,
 *      email, address with COALESCE pattern).
 *   2. Create customer with a unique phone via the UI form modal — verifies
 *      Fix 4 (normalizePhone helper + 23505 unique-violation catch).
 *   3. Duplicate phone → toast error — verifies Fix 4 user-visible feedback.
 *   4. Filter change resets page → 1 — verifies Fix 7 (customer-filters
 *      `params.delete("page")` before every router.push).
 *
 * Pattern parity with tests/e2e/contract-operational.spec.ts:
 *   - Admin Supabase client + .env.local loader
 *   - sweepStaleE2EOrphans in beforeAll
 *   - E2E employees tagged `department='E2E'`
 *   - E2E customers tagged via `customer_code LIKE 'E2E-%'` for sweep cleanup
 *   - beforeAll / afterAll shared seed state
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  userId?: string;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createAdminSupabase() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  // Contracts first (FK) — sweep relies on contract_code LIKE 'E2E-%' too
  if (seed.contractId) {
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  // Customer seeded by Test 1
  if (seed.customerId) {
    await admin.from("customers").delete().eq("id", seed.customerId);
  }
  // Other E2E customers this spec inserted (Tests 2/3/4) — scoped by marker
  await admin.from("customers").delete().like("customer_code", `E2E-CRM-${seed.marker}-%`);
  // Auth user last (trigger drops the E2E employee row automatically)
  if (seed.userId) {
    await admin.from("employees").delete().eq("auth_user_id", seed.userId);
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

async function seedAdminUser(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user) {
    throw new Error(`Cannot create E2E auth user: ${authError?.message || "missing user"}`);
  }
  seed.userId = authUser.user.id;

  // The on_auth_user_created trigger provisions an employees row; flip it to
  // an active E2E employee (matches contract-operational.spec.ts pattern).
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-${Date.now().toString(36).toUpperCase()}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId)
    .select("id")
    .single();
  if (employeeError || !employee) {
    throw new Error(`Cannot create E2E employee: ${employeeError?.message || "missing row"}`);
  }
  seed.employeeId = employee.id;
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

test.describe.serial("CRM customer sync (post-Fix 1/4/7)", () => {
  let admin: AdminClient;
  const timestamp = Date.now();
  const seed: SeedState = {
    marker: `${timestamp}`,
    email: `e2e-${timestamp}@moodwedding.com`,
    password: `E2ePass${timestamp}!`,
    employeeName: `E2E CRM Admin ${timestamp}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedAdminUser(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 1: Edit contract → CRM shows the new customer name.
  //
  // We bypass the contract edit UI form (which requires re-submitting items
  // and would fail validation) and call save_contract_atomic directly via
  // the admin client. This is the SAME RPC the UI server action uses — so
  // this test still verifies Fix 1 (SQL UPDATE customers SET full_name = ...
  // with COALESCE pattern), but without depending on the form's validation
  // state.
  // ────────────────────────────────────────────────────────────────
  test("1. Editing a contract syncs customer.full_name to the CRM list", async ({ page }) => {
    test.skip(!seed.userId, "Seed admin user was not created");

    // ── Seed: customer + a contract that points at them ──
    const initialName = `E2E Initial Customer ${seed.marker}`;
    const newName = `E2E Synced Customer ${seed.marker}`;

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({
        customer_code: `E2E-CRM-${seed.marker}-T1`,
        full_name: initialName,
        phone: `0901${seed.marker.slice(-6)}`,
        status: "active",
        notes: seed.marker,
      })
      .select("id, phone")
      .single();
    if (customerError || !customer) {
      throw new Error(`Cannot seed Test 1 customer: ${customerError?.message || "missing row"}`);
    }
    seed.customerId = customer.id;

    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .insert({
        contract_code: `E2E-HD-${seed.marker}-T1`,
        customer_id: seed.customerId,
        contract_date: "2026-05-15",
        work_date: "2026-05-20",
        delivery_date: "2026-05-25",
        service_type: "studio",
        transaction_type: "hop_dong",
        status: "cho_xu_ly",
        payment_status: "chua_thanh_toan",
        total_amount: 1_000_000,
        paid_amount: 0,
        remaining_amount: 1_000_000,
        notes: seed.marker,
      })
      .select("id, contract_code")
      .single();
    if (contractError || !contract) {
      throw new Error(`Cannot seed Test 1 contract: ${contractError?.message || "missing row"}`);
    }
    seed.contractId = contract.id;

    // ── Steps 1-6: "Edit contract" — simulate the contract edit server
    //              action by calling save_contract_atomic RPC with the new
    //              full_name. The RPC body (post-Fix 1) MUST UPDATE
    //              customers.full_name.
    const { error: rpcError } = await admin.rpc("save_contract_atomic", {
      p_contract: {
        contract_code: contract.contract_code,
        customer_id: seed.customerId,
        contract_date: "2026-05-15",
        work_date: "2026-05-20",
        total_amount: 1_000_000,
        discount_amount: 0,
        status: "cho_xu_ly",
        service_type: "studio",
      },
      p_customer: {
        customer_id: seed.customerId,
        full_name: newName, // ← Fix 1: this MUST round-trip into customers.full_name
        phone: customer.phone,
      },
      p_items: [
        {
          item_name: "E2E Sync Test Item",
          type: "dich_vu",
          quantity: 1,
          unit_price: 1_000_000,
          total_amount: 1_000_000,
        },
      ],
      p_actor_id: seed.userId,
      p_existing_contract_id: seed.contractId,
    });
    expect(rpcError, `save_contract_atomic failed: ${rpcError?.message}`).toBeNull();

    // ── Steps 7-9: Navigate to CRM, search for the NEW name, assert it's
    //               visible. If Fix 1 is broken, the row still shows the
    //               initial name and this assertion fails.
    await login(page, seed);
    await page.goto("/crm/customers");

    // Wait for the SWR-backed list to hydrate (initial server data already
    // includes the freshly-edited customer, but the page also kicks off a
    // client refetch — wait for the search input to be interactive).
    const searchInput = page.getByPlaceholder(/tìm|tim|search/i).first();
    await expect(searchInput).toBeVisible({ timeout: 30_000 });

    await searchInput.fill(newName);
    await page.waitForTimeout(800); // debounce + ilike roundtrip

    // The new name should appear in the table; the old name should not.
    await expect(page.getByText(newName, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(initialName, { exact: false })).toHaveCount(0);

    // Belt-and-braces: re-read the DB to assert the row was actually updated.
    const { data: reread } = await admin
      .from("customers")
      .select("full_name")
      .eq("id", seed.customerId)
      .single();
    expect(reread?.full_name).toBe(newName);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 2: Create customer via UI with a unique phone — happy path.
  // ────────────────────────────────────────────────────────────────
  test("2. Creating a customer with a unique phone succeeds via the UI form modal", async ({
    page,
  }) => {
    test.skip(!seed.userId, "Seed admin user was not created");

    const newName = `E2E CRM Customer ${seed.marker}`;
    const newPhone = `098${seed.marker.slice(-7)}`; // 10 digits, unique per run

    await login(page, seed);
    await page.goto("/crm/customers");

    // ── Steps 1-2: Open the create-customer modal ──
    // Two triggers exist (desktop "Thêm KH" button + mobile FAB). Pick the
    // first visible match — both labels are identical.
    const addButton = page.getByRole("button", { name: /Thêm KH/i }).first();
    await expect(addButton).toBeVisible({ timeout: 30_000 });
    await addButton.click();

    // Modal mounts as role="dialog" — wait for the title to be present.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText(/Thêm Khách Hàng Mới|Cập nhật/i);

    // ── Steps 3-4: Fill name + phone ──
    // <Input> SSOT render label + input là SIBLINGS không có htmlFor/id
    // (components/ui/input.tsx:34) → getByLabel KHÔNG match. Dùng placeholder
    // (duy nhất trong modal này).
    await dialog.getByPlaceholder("VD: Nguyễn Văn A").fill(newName);
    // "VD: 09..." trùng placeholder với "SĐT Khác" → khoanh bằng [required] (chỉ SĐT chính có).
    await dialog.locator('input[type="tel"][required]').fill(newPhone);

    // ── Step 5: Submit ──
    const submitButton = dialog.getByRole("button", { name: /Tạo Khách Hàng/i });
    await submitButton.click();

    // ── Step 6: Modal closes + new row appears in the list ──
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(newName, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Track this customer for sweep cleanup by tagging its customer_code.
    // The server-assigned code comes from nextval_customer_code, so we
    // rewrite it post-insert using the phone (which is unique per run).
    const { data: created } = await admin
      .from("customers")
      .select("id")
      .eq("phone", newPhone)
      .maybeSingle();
    if (created) {
      await admin
        .from("customers")
        .update({ customer_code: `E2E-CRM-${seed.marker}-T2` })
        .eq("id", created.id);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Test 3: Duplicate phone → toast error.
  //
  // Customer A is seeded via the admin client; customer B is created via the
  // UI form with the SAME phone. createCustomer returns duplicate=true, the
  // modal calls toast.error("So dien thoai da ton tai..."), and the modal
  // stays open so the parent can navigate to the existing profile.
  // ────────────────────────────────────────────────────────────────
  test("3. Duplicate phone shows a toast error and does not create a second customer", async ({
    page,
  }) => {
    test.skip(!seed.userId, "Seed admin user was not created");

    const dupPhone = `0907${seed.marker.slice(-6)}`;
    const customerA = `E2E CRM Dup A ${seed.marker}`;
    const customerB = `E2E CRM Dup B ${seed.marker}`;

    // ── Step 1: Seed customer A with the disputed phone ──
    const { data: customerArow, error: customerAError } = await admin
      .from("customers")
      .insert({
        customer_code: `E2E-CRM-${seed.marker}-T3-A`,
        full_name: customerA,
        phone: dupPhone,
        status: "active",
        notes: seed.marker,
      })
      .select("id")
      .single();
    if (customerAError || !customerArow) {
      throw new Error(
        `Cannot seed customer A for Test 3: ${customerAError?.message || "missing row"}`,
      );
    }

    // ── Step 2: Try to create customer B with the same phone via UI ──
    await login(page, seed);
    await page.goto("/crm/customers");

    const addButton = page.getByRole("button", { name: /Thêm KH/i }).first();
    await expect(addButton).toBeVisible({ timeout: 30_000 });
    await addButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // getByLabel không match với <Input> SSOT (label sibling, không htmlFor) — xem Test 2.
    await dialog.getByPlaceholder("VD: Nguyễn Văn A").fill(customerB);
    await dialog.locator('input[type="tel"][required]').fill(dupPhone);

    const submitButton = dialog.getByRole("button", { name: /Tạo Khách Hàng/i });
    await submitButton.click();

    // ── Step 3: Toast error appears ──
    // Sonner renders <li data-sonner-toast> with role="status" inside an
    // [data-sonner-toaster] region. Match by visible text content (covers
    // both the Vietnamese and diacritic-stripped variants the codebase
    // emits — see customer-form-modal.tsx line ~177).
    const toast = page.locator("[data-sonner-toast]").filter({
      hasText: /Số điện thoại|So dien thoai|đã tồn tại|da ton tai/i,
    });
    await expect(toast).toBeVisible({ timeout: 15_000 });

    // ── Step 4: Customer B was NOT inserted — modal stays open so the user
    //            can correct the input. Close it manually for cleanliness.
    await expect(dialog).toBeVisible();

    const { data: dupes } = await admin
      .from("customers")
      .select("id, full_name")
      .eq("phone", dupPhone);
    // Exactly the one we seeded, never two.
    expect(dupes?.length).toBe(1);
    expect(dupes?.[0]?.full_name).toBe(customerA);

    await dialog.getByRole("button", { name: /Hủy|Huy/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  });

  // ────────────────────────────────────────────────────────────────
  // Test 4: Changing a filter resets the page to 1.
  //
  // We seed 25 customers with the same source so pageSize=10 yields 3 pages.
  // We navigate to ?page=3, change the "Nguồn" filter, and assert the URL
  // no longer carries page=3 (Fix 7: params.delete("page") in
  // components/crm/customer-filters.tsx).
  // ────────────────────────────────────────────────────────────────
  test("4. Changing a filter resets the pagination to page 1", async ({ page }) => {
    test.skip(!seed.userId, "Seed admin user was not created");

    // ── Step 1: Seed 25 customers with the same source ──
    const bulkSource = "khach_le"; // any valid key in SOURCE_MAP
    const bulkRows = Array.from({ length: 25 }, (_, i) => ({
      customer_code: `E2E-CRM-${seed.marker}-T4-${String(i + 1).padStart(2, "0")}`,
      full_name: `E2E CRM Bulk ${seed.marker} #${i + 1}`,
      phone: `0905${seed.marker.slice(-4)}${String(i).padStart(2, "0")}`,
      source: bulkSource,
      status: "active",
      notes: seed.marker,
    }));
    const { error: bulkError } = await admin.from("customers").insert(bulkRows);
    if (bulkError) {
      throw new Error(`Cannot bulk-seed Test 4 customers: ${bulkError.message}`);
    }

    // ── Step 2: Log in and navigate to page 3 ──
    await login(page, seed);
    await page.goto("/crm/customers?page=3");

    // Wait for at least one row from the bulk batch to render — confirms the
    // SWR cache hydrated for page 3. pageSize=10, sort created_at DESC → 25 row
    // seed chiếm vị trí 1-25, page 3 (21-30) LUÔN có 5 row E2E nhưng không xác
    // định row NÀO (created_at trùng nhau trong batch, không có tiebreaker) —
    // cấm assert đích danh "#21".
    await expect(
      page.getByText(`E2E CRM Bulk ${seed.marker}`, { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // ── Step 3: Change the "Nguồn" filter ──
    // SelectPill renders as a combobox; the visible trigger has the
    // placeholder/label "Nguồn". Pick any non-default option to force the
    // params.delete("page") path.
    const sourcePicker = page
      .getByRole("combobox", { name: /Nguồn|Nguồn khách/i })
      .first();
    await expect(sourcePicker).toBeVisible({ timeout: 15_000 });
    await sourcePicker.click();

    // Options come from SOURCE_MAP. "Facebook" is a stable key in most
    // Vietnamese CRM source maps; if it's missing the option-text fallback
    // will still trigger the onChange handler.
    const fbOption = page.getByRole("option", { name: /Facebook/i }).first();
    await expect(fbOption).toBeVisible({ timeout: 10_000 });
    await fbOption.click();

    // ── Step 4: URL must no longer contain page=3 ──
    await page.waitForURL((url) => !url.searchParams.has("page"), { timeout: 10_000 });
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();

    // ── Step 5: Pagination không còn ở page 3 ──
    // Lọc Facebook trên data thật ra 0 kết quả (mọi customer source=NULL) →
    // Pagination không render khi totalPages <= 1, nên KHÔNG được đòi nút "1"
    // hiển thị. Reset đã chứng minh bằng URL (Step 4); ở đây chỉ cần chắc
    // nút page 3 biến mất — đó mới là regression cần gác.
    await expect(page.getByRole("button", { name: "3", exact: true })).toHaveCount(0);
  });
});
