import { describe, expect, it } from "@jest/globals";
import {
  ContractScheduleValidationError,
  planContractScheduleReconciliation,
  summarizeContractSchedules,
} from "@/lib/contracts/contract-schedule";
import type { ContractScheduleInput } from "@/types/contract-schedule";

const schedule = (
  overrides: Partial<ContractScheduleInput>,
): ContractScheduleInput => ({
  eventType: "ngay_chup",
  title: "Studio",
  date: "2026-07-14",
  sortOrder: 1,
  ...overrides,
});

describe("contract schedule domain", () => {
  it("models a Studio contract with two independent wedding ceremonies", () => {
    const result = summarizeContractSchedules("studio", [
      schedule({}),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ăn hỏi",
        date: "2026-08-01",
        sortOrder: 2,
      }),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ngày cưới",
        date: "2026-08-02",
        isPrimaryWeddingDate: true,
        sortOrder: 3,
      }),
    ]);

    expect(result.primaryWorkDate).toBe("2026-07-14");
    expect(result.primaryWeddingDate).toBe("2026-08-02");
    expect(result.finalCeremonyDate).toBe("2026-08-02");
    expect(result.schedules).toHaveLength(3);
  });

  it("supports a ceremony-only wedding contract", () => {
    const result = summarizeContractSchedules("ngay_cuoi", [
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ngày cưới",
        isPrimaryWeddingDate: true,
      }),
    ]);

    expect(result.primaryWorkDate).toBeNull();
    expect(result.primaryWeddingDate).toBe("2026-07-14");
  });

  it("rejects duplicate event type and date", () => {
    expect(() => summarizeContractSchedules("studio", [
      schedule({}),
      schedule({ title: "Chụp ngoại cảnh", sortOrder: 2 }),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ngày cưới",
        date: "2026-08-01",
        isPrimaryWeddingDate: true,
        sortOrder: 3,
      }),
    ])).toThrow(ContractScheduleValidationError);
  });

  it("requires exactly one primary wedding date", () => {
    expect(() => summarizeContractSchedules("combo", [
      schedule({}),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ăn hỏi",
        date: "2026-08-01",
        sortOrder: 2,
      }),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Ngày cưới",
        date: "2026-08-02",
        sortOrder: 3,
      }),
    ])).toThrow("Cần chọn đúng một ngày cưới chính");
  });

  it("preserves IDs and protects completed or task-linked removals", () => {
    const result = planContractScheduleReconciliation([
      {
        id: "shoot",
        eventType: "ngay_chup",
        title: "Studio",
        date: "2026-07-14",
        sortOrder: 1,
        status: "chua_lam",
        taskCount: 0,
      },
      {
        id: "engagement",
        eventType: "ngay_to_chuc",
        title: "Ăn hỏi",
        date: "2026-08-01",
        sortOrder: 2,
        status: "hoan_thanh",
        taskCount: 0,
      },
      {
        id: "wedding",
        eventType: "ngay_to_chuc",
        title: "Ngày cưới",
        date: "2026-08-02",
        sortOrder: 3,
        status: "chua_lam",
        taskCount: 0,
      },
    ], [
      schedule({ id: "shoot" }),
      schedule({
        id: "wedding",
        eventType: "ngay_to_chuc",
        title: "Lễ cưới",
        date: "2026-08-03",
        isPrimaryWeddingDate: true,
        sortOrder: 2,
      }),
      schedule({
        eventType: "ngay_to_chuc",
        title: "Báo hỷ",
        date: "2026-08-04",
        sortOrder: 3,
      }),
    ]);

    expect(result.updates.map((item) => item.id)).toEqual(["shoot", "wedding"]);
    expect(result.inserts).toHaveLength(1);
    expect(result.conflicts.map((item) => item.id)).toEqual(["engagement"]);
    expect(result.deletes).toHaveLength(0);
  });
});
