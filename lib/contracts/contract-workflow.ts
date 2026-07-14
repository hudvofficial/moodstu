import type { Contract, ContractEvent, ContractStatus, EventType, TaskStatus } from "@/types/contract";
import { CONTRACT_STATUS_ORDER, EVENT_TYPE_MAP } from "@/types/contract-constants";

const TERMINAL_EVENT_STATUSES = new Set<TaskStatus>(["hoan_thanh", "da_huy"]);

export type ContractMilestone = {
  key: string;
  eventType: EventType;
  label: string;
  date: string | null;
  status: TaskStatus;
  sortOrder: number;
  source: "event" | "contract" | "customer" | "missing";
};

function timeValue(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function sortContractEvents(events: ContractEvent[]) {
  return [...events].sort((left, right) => {
    const leftOrder = Number.isFinite(left.sort_order) ? left.sort_order : 999;
    const rightOrder = Number.isFinite(right.sort_order) ? right.sort_order : 999;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const dateDifference = timeValue(left.event_date || left.deadline) - timeValue(right.event_date || right.deadline);
    if (dateDifference !== 0) return dateDifference;

    return (EVENT_TYPE_MAP[left.event_type]?.order ?? 99) - (EVENT_TYPE_MAP[right.event_type]?.order ?? 99);
  });
}

export function getOrderedContractStatuses() {
  return [...CONTRACT_STATUS_ORDER];
}

export function isContractStatusForwardTransition(from: ContractStatus, to: ContractStatus) {
  if (to === "da_huy") return from !== "da_huy";
  if (from === "da_huy") return to === "cho_xu_ly";
  return CONTRACT_STATUS_ORDER.indexOf(to) >= CONTRACT_STATUS_ORDER.indexOf(from);
}

function normalizeDate(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function eventMilestone(event: ContractEvent): ContractMilestone {
  return {
    key: event.id,
    eventType: event.event_type,
    label: event.title || EVENT_TYPE_MAP[event.event_type]?.label || "Sự kiện",
    date: normalizeDate(event.event_date),
    status: event.status,
    sortOrder: event.sort_order,
    source: "event",
  };
}

export function getContractOnSetMilestones(contract: Contract): ContractMilestone[] {
  const events = sortContractEvents((contract.contract_events || []).filter((event) =>
    !event.deleted_at && (event.event_type === "ngay_chup" || event.event_type === "ngay_to_chuc"),
  ));
  const milestones = events.map(eventMilestone);

  if (contract.service_type !== "studio") return milestones;

  const customer = contract.customers as (Contract["customers"] & { wedding_date?: string | null }) | null | undefined;
  if (!milestones.some((item) => item.eventType === "ngay_chup")) {
    milestones.push({
      key: `${contract.id}:studio-shoot`,
      eventType: "ngay_chup",
      label: "Chụp cổng tại Studio",
      date: normalizeDate(contract.work_date),
      status: "chua_lam",
      sortOrder: 1,
      source: contract.work_date ? "contract" : "missing",
    });
  }

  if (!milestones.some((item) => item.eventType === "ngay_to_chuc")) {
    const weddingDate = normalizeDate(customer?.wedding_date);
    milestones.push({
      key: `${contract.id}:wedding-day`,
      eventType: "ngay_to_chuc",
      label: "Ngày cưới",
      date: weddingDate,
      status: "chua_lam",
      sortOrder: 2,
      source: weddingDate ? "customer" : "missing",
    });
  }

  return milestones.sort((left, right) => left.sortOrder - right.sortOrder || timeValue(left.date) - timeValue(right.date));
}

export function isUpcomingMilestone(milestone: ContractMilestone, today = new Date()) {
  if (!milestone.date || TERMINAL_EVENT_STATUSES.has(milestone.status)) return false;
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const eventDate = new Date(milestone.date);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate.getTime() >= startOfToday.getTime();
}
