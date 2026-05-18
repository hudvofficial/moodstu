import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const timestamp = Date.now();
const marker = `smoke-contracts-${timestamp}`;

function loadEnvFile(filePath) {
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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isDenied(error, status) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("not found")
  );
}

async function cleanup(client, ids) {
  if (ids.paymentId) await client.from("payments").delete().eq("id", ids.paymentId);
  if (ids.printingOrderId) await client.from("printing_orders").delete().eq("id", ids.printingOrderId);
  if (ids.labId) await client.from("labs").delete().eq("id", ids.labId);
  if (ids.galleryImageBId) await client.from("gallery_images").delete().eq("id", ids.galleryImageBId);
  if (ids.galleryImageAId) await client.from("gallery_images").delete().eq("id", ids.galleryImageAId);
  if (ids.galleryBId) await client.from("galleries").delete().eq("id", ids.galleryBId);
  if (ids.galleryAId) await client.from("galleries").delete().eq("id", ids.galleryAId);
  if (ids.invalidContractId) await client.from("contracts").delete().eq("id", ids.invalidContractId);
  if (ids.contractId) await client.from("contracts").delete().eq("id", ids.contractId);
  if (ids.customerId) await client.from("customers").delete().eq("id", ids.customerId);
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = {};

try {
  console.log("Seeding contracts smoke customer and contract...");
  const today = new Date().toISOString().slice(0, 10);
  const contractCode = `SMK-HD-${timestamp}`;

  const { data: customer, error: customerError } = await serviceClient
    .from("customers")
    .insert({
      customer_code: `SMK-CUS-${timestamp}`,
      full_name: `Contracts Smoke ${marker}`,
      phone: "0901234567",
      bride_name: `Bride ${marker}`,
      groom_name: `Groom ${marker}`,
      status: "active",
      notes: marker,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    throw new Error(`Cannot create smoke customer: ${customerError?.message || "missing row"}`);
  }
  ids.customerId = customer.id;

  const { data: contract, error: contractError } = await serviceClient
    .from("contracts")
    .insert({
      contract_code: contractCode,
      customer_id: ids.customerId,
      contract_date: today,
      work_date: "2026-05-20",
      delivery_date: "2026-05-25",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "cho_xu_ly",
      payment_status: "chua_thanh_toan",
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
      notes: marker,
    })
    .select("id, contract_code")
    .single();
  if (contractError || !contract) {
    throw new Error(`Cannot create smoke contract: ${contractError?.message || "missing row"}`);
  }
  ids.contractId = contract.id;

  const { data: lab, error: labError } = await serviceClient
    .from("labs")
    .insert({
      lab_name: `Contracts Smoke Lab ${timestamp}`,
      phone: "0900000000",
      status: "active",
    })
    .select("id, lab_name")
    .single();
  if (labError || !lab) {
    throw new Error(`Cannot create smoke lab: ${labError?.message || "missing row"}`);
  }
  ids.labId = lab.id;

  const { data: printingOrder, error: printingOrderError } = await serviceClient
    .from("printing_orders")
    .insert({
      contract_id: ids.contractId,
      lab_id: ids.labId,
      order_code: `SMK-PRINT-${timestamp}`,
      status: "cho_xu_ly",
      payment_status: "unpaid",
      order_date: today,
      expected_date: "2026-05-24",
      total_amount: 100000,
      notes: marker,
    })
    .select("id")
    .single();
  if (printingOrderError || !printingOrder) {
    throw new Error(`Cannot create smoke printing order: ${printingOrderError?.message || "missing row"}`);
  }
  ids.printingOrderId = printingOrder.id;

  console.log("Checking contract detail RPC...");
  const { data: detailRpc, error: detailRpcError } = await serviceClient.rpc(
    "get_contract_detail_v2",
    { p_contract_id: ids.contractId },
  );
  if (detailRpcError) {
    throw new Error(`get_contract_detail_v2 failed: ${detailRpcError.message}`);
  }
  assert(detailRpc?.contract?.id === ids.contractId, "Contract detail RPC did not return the smoke contract");
  const rpcLab = detailRpc?.print_orders?.[0]?.labs;
  assert(rpcLab?.name === lab.lab_name, "Contract detail RPC did not return print_orders[].labs.name");

  console.log("Checking date-order guardrail...");
  const { data: invalidContract, error: invalidContractError } = await serviceClient
    .from("contracts")
    .insert({
      contract_code: `${contractCode}-BAD`,
      customer_id: ids.customerId,
      contract_date: today,
      work_date: "2026-05-20",
      delivery_date: "2026-05-19",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "cho_xu_ly",
      payment_status: "chua_thanh_toan",
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
      notes: `${marker}-invalid-date`,
    })
    .select("id")
    .single();
  if (invalidContract?.id) ids.invalidContractId = invalidContract.id;
  assert(
    invalidContractError && invalidContractError.message.includes("contracts_date_order_check"),
    "Invalid contract date order unexpectedly passed the DB guardrail",
  );

  console.log("Checking safe search query shape...");
  const { data: matchedCustomers, error: customerSearchError } = await serviceClient
    .from("customers")
    .select("id")
    .or(
      [
        `full_name.ilike.%${marker}%`,
        `customer_code.ilike.%SMK-CUS-${timestamp}%`,
        "phone.ilike.%0901234567%",
        `bride_name.ilike.%${marker}%`,
        `groom_name.ilike.%${marker}%`,
      ].join(","),
    )
    .is("deleted_at", null)
    .limit(20);
  if (customerSearchError) throw new Error(`Customer search failed: ${customerSearchError.message}`);

  const matchedCustomerIds = (matchedCustomers || []).map((row) => row.id);
  const searchClauses = [`contract_code.ilike.%${contractCode}%`];
  if (matchedCustomerIds.length > 0) {
    searchClauses.push(`customer_id.in.(${matchedCustomerIds.join(",")})`);
  }

  const { data: matchedContracts, error: contractSearchError } = await serviceClient
    .from("contracts")
    .select("id, contract_code, customer_id")
    .or(searchClauses.join(","))
    .is("deleted_at", null)
    .limit(20);
  if (contractSearchError) throw new Error(`Contract search failed: ${contractSearchError.message}`);
  assert(
    (matchedContracts || []).some((row) => row.id === ids.contractId),
    "Safe contract search did not return the smoke contract",
  );

  console.log("Checking gallery password hashing and public write boundary...");
  const futureDeadline = "2026-12-31T23:59:59.000Z";
  const { data: galleryA, error: galleryAError } = await serviceClient
    .from("galleries")
    .insert({
      contract_id: ids.contractId,
      access_url: `${marker}-a`,
      status: "shared",
      selection_deadline: futureDeadline,
      title: "Contracts Smoke A",
    })
    .select("id")
    .single();
  if (galleryAError || !galleryA) {
    throw new Error(`Cannot create gallery A: ${galleryAError?.message || "missing row"}`);
  }
  ids.galleryAId = galleryA.id;

  const { data: galleryB, error: galleryBError } = await serviceClient
    .from("galleries")
    .insert({
      contract_id: ids.contractId,
      access_url: `${marker}-b`,
      status: "shared",
      selection_deadline: futureDeadline,
      title: "Contracts Smoke B",
    })
    .select("id")
    .single();
  if (galleryBError || !galleryB) {
    throw new Error(`Cannot create gallery B: ${galleryBError?.message || "missing row"}`);
  }
  ids.galleryBId = galleryB.id;

  const { data: imageA, error: imageAError } = await serviceClient
    .from("gallery_images")
    .insert({
      gallery_id: ids.galleryAId,
      image_url: "https://example.invalid/contracts-smoke-a.jpg",
      file_name: "contracts-smoke-a.jpg",
      sort_order: 1,
      is_selected: false,
    })
    .select("id")
    .single();
  if (imageAError || !imageA) {
    throw new Error(`Cannot create gallery image A: ${imageAError?.message || "missing row"}`);
  }
  ids.galleryImageAId = imageA.id;

  const { data: imageB, error: imageBError } = await serviceClient
    .from("gallery_images")
    .insert({
      gallery_id: ids.galleryBId,
      image_url: "https://example.invalid/contracts-smoke-b.jpg",
      file_name: "contracts-smoke-b.jpg",
      sort_order: 1,
      is_selected: false,
    })
    .select("id")
    .single();
  if (imageBError || !imageB) {
    throw new Error(`Cannot create gallery image B: ${imageBError?.message || "missing row"}`);
  }
  ids.galleryImageBId = imageB.id;

  const galleryPassword = `ContractsSmoke-${timestamp}!`;
  const { data: passwordResult, error: setPasswordError } = await serviceClient.rpc(
    "set_gallery_password",
    { p_gallery_id: ids.galleryAId, p_password: galleryPassword },
  );
  if (setPasswordError) throw new Error(`set_gallery_password failed: ${setPasswordError.message}`);
  assert(passwordResult?.has_password === true, "set_gallery_password did not report has_password=true");

  const { data: galleryState, error: galleryStateError } = await serviceClient
    .from("galleries")
    .select("password, password_hash, access_version")
    .eq("id", ids.galleryAId)
    .single();
  if (galleryStateError || !galleryState) {
    throw new Error(`Cannot reload gallery password state: ${galleryStateError?.message || "missing row"}`);
  }
  assert(galleryState.password === null, "Gallery plaintext password was not cleared");
  assert(typeof galleryState.password_hash === "string" && galleryState.password_hash.length > 20, "Gallery password_hash is missing");
  assert(Number(galleryState.access_version) >= Number(passwordResult.access_version), "Gallery access_version did not persist");

  const { data: correctPassword, error: correctPasswordError } = await serviceClient.rpc(
    "verify_gallery_password",
    { p_gallery_id: ids.galleryAId, p_password: galleryPassword },
  );
  if (correctPasswordError) throw new Error(`verify_gallery_password correct failed: ${correctPasswordError.message}`);
  assert(correctPassword === true, "Correct gallery password was not accepted");

  const { data: wrongPassword, error: wrongPasswordError } = await serviceClient.rpc(
    "verify_gallery_password",
    { p_gallery_id: ids.galleryAId, p_password: `${galleryPassword}-wrong` },
  );
  if (wrongPasswordError) throw new Error(`verify_gallery_password wrong failed: ${wrongPasswordError.message}`);
  assert(wrongPassword === false, "Wrong gallery password was accepted");

  const { error: anonRpcError, status: anonRpcStatus } = await anonClient.rpc(
    "verify_gallery_password",
    { p_gallery_id: ids.galleryAId, p_password: galleryPassword },
  );
  assert(isDenied(anonRpcError, anonRpcStatus), "Anon verify_gallery_password was not denied");

  const { data: anonWriteRows, error: anonWriteError, status: anonWriteStatus } = await anonClient
    .from("gallery_images")
    .update({ is_selected: true })
    .eq("id", ids.galleryImageAId)
    .select("id");
  assert(
    isDenied(anonWriteError, anonWriteStatus) || (Array.isArray(anonWriteRows) && anonWriteRows.length === 0),
    "Anon direct gallery image update was not denied or filtered",
  );

  const { data: imageState, error: imageStateError } = await serviceClient
    .from("gallery_images")
    .select("is_selected")
    .eq("id", ids.galleryImageAId)
    .single();
  if (imageStateError || !imageState) {
    throw new Error(`Cannot reload gallery image state: ${imageStateError?.message || "missing row"}`);
  }
  assert(imageState.is_selected !== true, "Anon gallery image update mutated data");

  console.log("Checking payments table path used by contract detail realtime...");
  const { data: payment, error: paymentError } = await serviceClient
    .from("payments")
    .insert({
      contract_id: ids.contractId,
      customer_id: ids.customerId,
      amount: 250000,
      payment_date: today,
      payment_method: "tien_mat",
      payment_stage: "deposit",
      notes: marker,
    })
    .select("id")
    .single();
  if (paymentError || !payment) {
    throw new Error(`Cannot create smoke payment: ${paymentError?.message || "missing row"}`);
  }
  ids.paymentId = payment.id;

  const { data: payments, error: paymentsError } = await serviceClient
    .from("payments")
    .select("id, amount")
    .eq("contract_id", ids.contractId)
    .is("deleted_at", null);
  if (paymentsError) throw new Error(`Cannot query smoke payments: ${paymentsError.message}`);
  assert(
    (payments || []).some((row) => row.id === ids.paymentId && Number(row.amount) === 250000),
    "Contract payment query did not return the smoke payment",
  );

  console.log("Contracts seeded smoke passed.");
} finally {
  await cleanup(serviceClient, ids);
}
