"use client";

import { CheckCircle2 } from "lucide-react";
import type { Contract, ContractEvent, EventType } from "@/types/contract";

// ═══════════════════════════════════════════
// WorkflowStepper — Pure Event-Driven
// Reads contract_events → auto-generates steps
// 0 code change when adding new package types
// ═══════════════════════════════════════════

// Sort priority for events on the same date
const EVENT_TYPE_PRIORITY: Record<EventType, number> = {
  chuan_bi: 1,
  ngay_chup: 2,
  ngay_to_chuc: 3,
  hau_ky: 4,
  giao_san_pham: 5,
};

// Fallback labels when event.title is null
const FALLBACK_LABELS: Record<EventType, string> = {
  chuan_bi: "Chuẩn bị",
  ngay_chup: "Chụp / Quay",
  ngay_to_chuc: "Ngày cưới",
  hau_ky: "Hậu kỳ",
  giao_san_pham: "Giao SP",
};

interface StepData {
  label: string;
  status: "completed" | "current" | "pending";
}

function buildSteps(contract: Contract, events: ContractEvent[]): StepData[] {
  // Step 1: Ký HĐ — always present, always completed
  const steps: StepData[] = [{ label: "Ký HĐ", status: "completed" }];

  if (events.length === 0) return steps;

  // Sort events by date, then by type priority
  const sorted = [...events].sort((a, b) => {
    const dateA = new Date(a.event_date).getTime();
    const dateB = new Date(b.event_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (EVENT_TYPE_PRIORITY[a.event_type] ?? 99) - (EVENT_TYPE_PRIORITY[b.event_type] ?? 99);
  });

  let foundCurrent = false;

  for (const event of sorted) {
    const label = event.title || FALLBACK_LABELS[event.event_type] || "Sự kiện";

    let status: StepData["status"];
    if (event.status === "hoan_thanh") {
      status = "completed";
    } else if (!foundCurrent) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "pending";
    }

    steps.push({ label, status });
  }

  return steps;
}

interface Props {
  contract: Contract;
  events: ContractEvent[];
}

export default function WorkflowStepper({ contract, events }: Props) {
  const isCancelled = contract.status === "da_huy";
  const steps = buildSteps(contract, events);

  // Find current step index for progress calculations
  const currentIdx = isCancelled
    ? -1
    : steps.findIndex((s) => s.status === "current");
  const activeIdx = currentIdx === -1 && !isCancelled ? steps.length - 1 : currentIdx;
  const manySteps = steps.length > 7;

  return (
    <div className="card-base p-4 lg:p-5">
      {/* Desktop: Horizontal stepper */}
      <div className="max-lg:hidden">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const isCompleted = !isCancelled && step.status === "completed";
            const isCurrent = !isCancelled && step.status === "current";

            return (
              <div key={`d-${i}`} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`${manySteps ? "w-7 h-7" : "w-8 h-8"} rounded-full flex items-center justify-center text-xs font-bold
                      transition-colors duration-300
                      ${isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCancelled
                          ? "bg-bg-hover text-text-muted"
                          : "bg-bg-hover text-text-secondary"
                      }
                      ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={manySteps ? 14 : 16} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-caption font-medium text-center max-w-[80px] leading-tight line-clamp-2
                      ${isCompleted ? "text-emerald-700" : "text-text-muted"}`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line (not on last item) */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-2 mb-5">
                    <div
                      className={`h-0.5 rounded-full transition-colors duration-300
                        ${!isCancelled && step.status === "completed"
                          ? "bg-emerald-400"
                          : "bg-bg-hover"
                        }
                      `}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Dots stepper */}
      <div className="lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-caption font-bold uppercase tracking-widest">
            Tiến độ thực hiện
          </span>
          <span className="text-caption font-bold text-interactive">
            {isCancelled
              ? "Đã hủy"
              : `Bước ${Math.min(activeIdx + 1, steps.length)}/${steps.length}`}
          </span>
        </div>

        {/* Dots with connecting line */}
        <div className="relative flex items-start justify-between px-1">
          {/* Background line */}
          <div className="absolute top-[7px] left-4 right-4 h-[2px] bg-bg-hover" />
          {/* Filled progress line */}
          <div
            className="absolute top-[7px] left-4 h-[2px] bg-interactive transition-all duration-500"
            style={{
              width: isCancelled
                ? "0%"
                : `${Math.max(0, (activeIdx / (steps.length - 1)) * 100)}%`,
              maxWidth: "calc(100% - 2rem)",
            }}
          />

          {steps.map((step, i) => {
            const isCompleted = !isCancelled && step.status === "completed";
            const isCurrent = !isCancelled && step.status === "current";
            const isPending = isCancelled || step.status === "pending";

            return (
              <div
                key={`m-${i}`}
                className="relative z-10 flex flex-col items-center gap-1.5"
                style={{ width: manySteps ? "2rem" : "3rem" }}
              >
                <div
                  className={`${manySteps ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} rounded-full transition-all duration-300
                    ${isCompleted
                      ? "bg-interactive"
                      : isCurrent
                        ? "bg-interactive ring-4 ring-interactive/20"
                        : isPending
                          ? "bg-slate-200"
                          : "bg-slate-200"
                    }`}
                />
                {/* Show label: always for ≤7 steps, only current for 8+ steps */}
                {(!manySteps || isCurrent) && (
                  <span
                    className={`text-tiny text-center leading-tight transition-colors
                      ${isCompleted
                        ? "text-interactive font-bold"
                        : isCurrent
                          ? "text-interactive font-bold"
                          : "text-text-muted font-medium"
                      }`}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
