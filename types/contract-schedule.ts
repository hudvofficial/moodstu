import type { EventType, ServiceType, TaskStatus } from "./contract";

export type ContractScheduleEventType = Extract<
  EventType,
  "ngay_chup" | "ngay_to_chuc"
>;

export interface ContractScheduleInput {
  id?: string;
  eventType: ContractScheduleEventType;
  title: string;
  date: string;
  isPrimaryWeddingDate?: boolean;
  sortOrder: number;
}

export interface ExistingContractScheduleEvent {
  id: string;
  eventType: ContractScheduleEventType;
  title: string;
  date: string | null;
  sortOrder: number;
  status: TaskStatus;
  taskCount: number;
}

export interface ContractScheduleReconciliationPlan {
  updates: Array<ContractScheduleInput & { id: string }>;
  inserts: ContractScheduleInput[];
  deletes: ExistingContractScheduleEvent[];
  conflicts: ExistingContractScheduleEvent[];
}

export interface ContractScheduleSummary {
  schedules: ContractScheduleInput[];
  primaryWorkDate: string | null;
  primaryWeddingDate: string | null;
  finalCeremonyDate: string | null;
}

export interface ContractScheduleRequirements {
  serviceType: ServiceType;
  requiresShoot: boolean;
  requiresCeremony: boolean;
}
