import type { ServiceType } from "@/types/contract";
import type {
  ContractScheduleInput,
  ContractScheduleReconciliationPlan,
  ContractScheduleSummary,
  ExistingContractScheduleEvent,
} from "@/types/contract-schedule";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ContractScheduleValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join("; "));
    this.name = "ContractScheduleValidationError";
  }
}

export function serviceScheduleRequirements(serviceType: ServiceType) {
  return {
    requiresShoot: serviceType !== "ngay_cuoi" && serviceType !== "outsource",
    requiresCeremony:
      serviceType === "studio" ||
      serviceType === "combo" ||
      serviceType === "ngay_cuoi",
  };
}

function isRealIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function normalizeContractSchedules(
  schedules: ContractScheduleInput[],
): ContractScheduleInput[] {
  return schedules
    .map((schedule) => ({
      ...schedule,
      id: schedule.id?.trim() || undefined,
      title: schedule.title.trim(),
      date: schedule.date.trim(),
      isPrimaryWeddingDate:
        schedule.eventType === "ngay_to_chuc"
          ? Boolean(schedule.isPrimaryWeddingDate)
          : undefined,
    }))
    .sort((left, right) =>
      left.sortOrder - right.sortOrder ||
      left.date.localeCompare(right.date) ||
      left.title.localeCompare(right.title),
    )
    .map((schedule, index) => ({ ...schedule, sortOrder: index + 1 }));
}

export function summarizeContractSchedules(
  serviceType: ServiceType,
  input: ContractScheduleInput[],
): ContractScheduleSummary {
  const schedules = normalizeContractSchedules(input);
  const issues: string[] = [];
  const requirements = serviceScheduleRequirements(serviceType);

  schedules.forEach((schedule, index) => {
    if (!schedule.title) issues.push(`Sự kiện ${index + 1} chưa có tên`);
    if (!isRealIsoDate(schedule.date)) {
      issues.push(`Sự kiện ${index + 1} có ngày không hợp lệ`);
    }
  });

  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  for (const schedule of schedules) {
    const key = `${schedule.eventType}:${schedule.date}`;
    if (seenKeys.has(key)) duplicateKeys.add(key);
    seenKeys.add(key);
  }
  if (duplicateKeys.size > 0) {
    issues.push("Không thể tạo hai sự kiện cùng loại trong cùng một ngày");
  }

  const shoots = schedules.filter((item) => item.eventType === "ngay_chup");
  const ceremonies = schedules.filter(
    (item) => item.eventType === "ngay_to_chuc",
  );
  const primaryCeremonies = ceremonies.filter(
    (item) => item.isPrimaryWeddingDate,
  );

  if (requirements.requiresShoot && shoots.length === 0) {
    issues.push("Hợp đồng cần ít nhất một ngày chụp");
  }
  if (requirements.requiresCeremony && ceremonies.length === 0) {
    issues.push("Hợp đồng cần ít nhất một ngày tổ chức");
  }
  if (ceremonies.length > 0 && primaryCeremonies.length !== 1) {
    issues.push("Cần chọn đúng một ngày cưới chính");
  }

  if (issues.length > 0) throw new ContractScheduleValidationError(issues);

  return {
    schedules,
    primaryWorkDate: shoots[0]?.date ?? null,
    primaryWeddingDate: primaryCeremonies[0]?.date ?? null,
    finalCeremonyDate: ceremonies.length
      ? ceremonies.reduce((latest, item) =>
          item.date > latest ? item.date : latest,
        ceremonies[0].date)
      : null,
  };
}

export function planContractScheduleReconciliation(
  existing: ExistingContractScheduleEvent[],
  desiredInput: ContractScheduleInput[],
): ContractScheduleReconciliationPlan {
  const desired = normalizeContractSchedules(desiredInput);
  const existingById = new Map(existing.map((event) => [event.id, event]));
  const claimedIds = new Set<string>();
  const updates: ContractScheduleReconciliationPlan["updates"] = [];
  const inserts: ContractScheduleReconciliationPlan["inserts"] = [];

  for (const schedule of desired) {
    if (!schedule.id) {
      inserts.push(schedule);
      continue;
    }
    const matched = existingById.get(schedule.id);
    if (!matched || claimedIds.has(schedule.id)) {
      throw new ContractScheduleValidationError([
        "Lịch trình chứa mã sự kiện không hợp lệ hoặc bị trùng",
      ]);
    }
    claimedIds.add(schedule.id);
    updates.push({ ...schedule, id: schedule.id });
  }

  const removed = existing.filter((event) => !claimedIds.has(event.id));
  const conflicts = removed.filter(
    (event) => event.status === "hoan_thanh" || event.taskCount > 0,
  );
  const conflictIds = new Set(conflicts.map((event) => event.id));

  return {
    updates,
    inserts,
    deletes: removed.filter((event) => !conflictIds.has(event.id)),
    conflicts,
  };
}
