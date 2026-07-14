import { describe, expect, it } from "@jest/globals";
import {
  getContractOnSetMilestones,
  getOrderedContractStatuses,
  isUpcomingMilestone,
  sortContractEvents,
} from "@/lib/contracts/contract-workflow";
import type { Contract, ContractEvent } from "@/types/contract";

function event(overrides: Partial<ContractEvent>): ContractEvent {
  return {
    id: "event",
    contract_id: "contract",
    event_type: "ngay_chup",
    title: null,
    event_date: null,
    end_date: null,
    location: null,
    status: "chua_lam",
    notes: null,
    sort_order: 1,
    deadline: null,
    deleted_at: null,
    start_time: null,
    end_time: null,
    is_manual_date: false,
    phase: null,
    sync_to_google: false,
    google_event_id: null,
    google_sync_status: "not_required",
    google_sync_error: null,
    google_synced_at: null,
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

function studioContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract",
    contract_code: "HD-1",
    customer_id: "customer",
    service_type: "studio",
    contract_date: "2026-07-14",
    work_date: "2026-07-20",
    delivery_date: null,
    status: "cho_xu_ly",
    payment_status: "chua_thanh_toan",
    total_amount: 0,
    discount_amount: 0,
    paid_amount: 0,
    remaining_amount: 0,
    description: null,
    notes: null,
    bride_name: null,
    groom_name: null,
    bride_phone: null,
    groom_phone: null,
    cancel_reason: null,
    cancelled_at: null,
    cancelled_by: null,
    created_by: null,
    assigned_to: null,
    updated_by: null,
    deleted_at: null,
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    customers: { wedding_date: "2026-08-01" } as Contract["customers"],
    ...overrides,
  };
}

describe("contract workflow", () => {
  it("orders contract statuses by the real lifecycle", () => {
    expect(getOrderedContractStatuses()).toEqual([
      "cho_xu_ly",
      "dang_thuc_hien",
      "hoan_thanh",
      "da_huy",
    ]);
  });

  it("uses persisted sort_order before dates", () => {
    const sorted = sortContractEvents([
      event({ id: "wedding", event_type: "ngay_to_chuc", event_date: "2026-07-10", sort_order: 2 }),
      event({ id: "shoot", event_type: "ngay_chup", event_date: "2026-07-20", sort_order: 1 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["shoot", "wedding"]);
  });

  it("always exposes Studio shoot and wedding milestones without inventing a date", () => {
    const milestones = getContractOnSetMilestones(studioContract({ customers: { wedding_date: null } as Contract["customers"] }));
    expect(milestones.map((item) => item.eventType)).toEqual(["ngay_chup", "ngay_to_chuc"]);
    expect(milestones[1]).toMatchObject({ label: "Ngày cưới", date: null, source: "missing" });
  });

  it("does not treat completed events as upcoming", () => {
    const milestone = getContractOnSetMilestones(studioContract({
      contract_events: [event({ event_date: "2026-07-20", status: "hoan_thanh" })],
    }))[0];
    expect(isUpcomingMilestone(milestone, new Date("2026-07-14T00:00:00Z"))).toBe(false);
  });
});
