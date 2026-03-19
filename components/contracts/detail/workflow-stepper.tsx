"use client";

import { CheckCircle2 } from "lucide-react";
import type { Contract, ContractEvent } from "@/types/contract";

// ═══════════════════════════════════════════
// WorkflowStepper — 6-step horizontal progress
// Phase 04d: Stitch design — circular stepper
// Maps contract status + events → visual progress
// ═══════════════════════════════════════════

const STEPS = [
  { key: "ky_hd", label: "Ký HĐ" },
  { key: "chup_ngoai", label: "Chụp ngoại" },
  { key: "chup_studio", label: "Chụp studio" },
  { key: "chinh_sua", label: "Chỉnh sửa" },
  { key: "in_an", label: "In ấn" },
  { key: "hoan_tat", label: "Hoàn tất" },
] as const;

interface Props {
  contract: Contract;
  events: ContractEvent[];
}

function getCurrentStep(
  status: string,
  events: ContractEvent[]
): number {
  // Map contract status to step index
  if (status === "hoan_thanh") return 5;
  if (status === "da_huy") return -1;

  // Check events to determine progress
  const completedEvents = events.filter(
    (e) => e.status === "hoan_thanh"
  );
  const totalEvents = events.length;

  if (totalEvents === 0) return 0; // Just signed
  if (completedEvents.length === totalEvents && totalEvents >= 2) return 3;
  if (completedEvents.length > 0) return Math.min(completedEvents.length, 2);

  return 0;
}

export default function WorkflowStepper({ contract, events }: Props) {
  const currentStep = getCurrentStep(contract.status, events);
  const isCancelled = contract.status === "da_huy";

  return (
    <div className="card-base p-4 lg:p-5">
      {/* Desktop: Horizontal stepper */}
      <div className="max-lg:hidden">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isCompleted = !isCancelled && i <= currentStep;
            const isCurrent = !isCancelled && i === currentStep;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
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
                      <CheckCircle2 size={16} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-caption font-medium whitespace-nowrap
                      ${isCompleted ? "text-emerald-700" : "text-text-muted"}`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line (not on last item) */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 mb-5">
                    <div
                      className={`h-0.5 rounded-full transition-colors duration-300
                        ${!isCancelled && i < currentStep
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

      {/* Mobile: Dots stepper — Stitch lines 103-137 */}
      <div className="lg:hidden">
        {/* Header: "Tiến độ thực hiện" + "Bước X/6" */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-caption font-bold uppercase tracking-widest">
            Tiến độ thực hiện
          </span>
          <span className="text-caption font-bold text-interactive">
            {isCancelled
              ? "Đã hủy"
              : `Bước ${Math.min(currentStep + 1, STEPS.length)}/${STEPS.length}`}
          </span>
        </div>

        {/* 6 dots horizontal with connecting line */}
        <div className="relative flex items-start justify-between px-1">
          {/* Background line */}
          <div className="absolute top-[7px] left-4 right-4 h-[2px] bg-bg-hover" />
          {/* Filled line */}
          <div
            className="absolute top-[7px] left-4 h-[2px] bg-interactive transition-all duration-500"
            style={{
              width: isCancelled
                ? "0%"
                : `${Math.max(0, (currentStep / (STEPS.length - 1)) * 100)}%`,
              maxWidth: "calc(100% - 2rem)",
            }}
          />

          {STEPS.map((step, i) => {
            const isCompleted = !isCancelled && i < currentStep;
            const isCurrent = !isCancelled && i === currentStep;
            const isPending = isCancelled || i > currentStep;

            return (
              <div
                key={step.key}
                className="relative z-10 flex flex-col items-center gap-1.5"
                style={{ width: "3rem" }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300
                    ${isCompleted
                      ? "bg-interactive"
                      : isCurrent
                        ? "bg-interactive ring-4 ring-interactive/20"
                        : isPending
                          ? "bg-slate-200"
                          : "bg-slate-200"
                    }`}
                />
                <span
                  className={`text-center leading-tight transition-colors
                    ${isCompleted
                      ? "text-interactive font-bold"
                      : isCurrent
                        ? "text-interactive font-bold"
                        : "text-text-muted font-medium"
                    }`}
                  style={{ fontSize: "9px" }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
