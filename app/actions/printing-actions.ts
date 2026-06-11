"use server";

import { getLabOptions as getLabOptionsImpl, getLabServices as getLabServicesImpl } from "./lab-queries";
import {
  createPrintingOrder as createPrintingOrderImpl,
  updatePrintingOrderStatus as updatePrintingOrderStatusImpl,
} from "./printing-mutations";

export async function getLabs() {
  return getLabOptionsImpl();
}

export async function fetchLabServices(labId: string) {
  return getLabServicesImpl(labId);
}

export async function createPrintingOrder(rawData: unknown) {
  return createPrintingOrderImpl(rawData);
}

export async function updatePrintOrderStatus(
  orderId: string,
  status: string,
  contractId: string,
  reason?: string | null,
) {
  return updatePrintingOrderStatusImpl(orderId, status, contractId, reason);
}
