"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle, ChevronDown, Clock } from "lucide-react";
import { getCategoryColor } from "@/constants/service-colors";
import type { ContractChecklistSummary } from "@/types/contract";

export interface ContractChecklistForBadge {
  id: string;
  contract_id?: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

interface MissingInfoBadgeProps {
  items?: ContractChecklistForBadge[];
  summary?: ContractChecklistSummary | null;
}

const EMPTY_ITEMS: ContractChecklistForBadge[] = [];
const STAGE_ORDER = ["chụp", "ảnh", "phóng", "ăn hỏi", "hỏi", "lễ", "cưới"];

function sortStages(stages: string[]) {
  return [...stages].sort((a, b) => {
    const ia = STAGE_ORDER.findIndex((stage) => a.toLowerCase().includes(stage));
    const ib = STAGE_ORDER.findIndex((stage) => b.toLowerCase().includes(stage));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function getSummary(
  summary: ContractChecklistSummary | null | undefined,
  items: ContractChecklistForBadge[],
): ContractChecklistSummary {
  if (summary) {
    const total = Math.max(0, Number(summary.total) || 0);
    const done = Math.min(total, Math.max(0, Number(summary.done) || 0));
    return {
      total,
      done,
      missing: Math.min(total, Math.max(0, Number(summary.missing) || total - done)),
    };
  }

  const total = items.length;
  const done = items.filter((item) => item.is_completed).length;
  return {
    total,
    done,
    missing: Math.max(0, total - done),
  };
}

const MissingInfoBadge = memo(function MissingInfoBadge({
  items = EMPTY_ITEMS,
  summary,
}: MissingInfoBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const resolvedSummary = useMemo(
    () => getSummary(summary, items),
    [items, summary],
  );

  const missingItems = useMemo(() => {
    if (!isTooltipOpen) return EMPTY_ITEMS;
    return items.filter((item) => !item.is_completed);
  }, [isTooltipOpen, items]);

  const grouped = useMemo(() => {
    if (!isTooltipOpen || missingItems.length === 0) {
      return {} as Record<string, Record<string, ContractChecklistForBadge[]>>;
    }

    return missingItems.reduce(
      (acc, item) => {
        const stage = item.event_stage || "NGÀY CHỤP";
        if (!acc[stage]) acc[stage] = {};
        if (!acc[stage][item.category]) acc[stage][item.category] = [];
        acc[stage][item.category].push(item);
        return acc;
      },
      {} as Record<string, Record<string, ContractChecklistForBadge[]>>,
    );
  }, [isTooltipOpen, missingItems]);

  const openTooltip = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect();
    setFlipUp(Boolean(rect && rect.bottom + 320 > window.innerHeight));
    setIsTooltipOpen(true);
  }, []);

  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
  }, []);

  if (resolvedSummary.total === 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tight bg-bg-hover text-text-muted">
        <Clock className="w-3 h-3 mr-1" />
        Chưa có
      </div>
    );
  }

  if (resolvedSummary.missing === 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tight bg-success/10 text-success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Đầy đủ
      </div>
    );
  }

  const hasTooltipItems = missingItems.length > 0;

  return (
    <div
      ref={badgeRef}
      tabIndex={0}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      onFocus={openTooltip}
      onBlur={closeTooltip}
      className="relative inline-block outline-none"
      aria-label={`Thiếu ${resolvedSummary.missing} mục checklist`}
    >
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tight bg-error/10 text-error cursor-help transition-all">
        <span>Thiếu</span>
        <span className="bg-error/20 text-error rounded px-1 py-0.5 text-tiny font-bold">
          {resolvedSummary.missing}
        </span>
        <ChevronDown className="w-3 h-3 opacity-40" />
      </div>

      {isTooltipOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto bg-bg-card rounded-lg shadow-xl z-50 p-3 text-left ${
            flipUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {hasTooltipItems ? (
            sortStages(Object.keys(grouped)).map((stage, stageIndex) => (
              <div key={stage} className={stageIndex > 0 ? "pt-3 mt-3" : ""}>
                <div className="text-tiny font-black uppercase tracking-widest text-primary/60 mb-2 flex items-center gap-2">
                  <span>{stage}</span>
                  <span className="h-px flex-1 bg-primary/10" />
                </div>
                {Object.entries(grouped[stage]).map(([category, categoryItems]) => {
                  const style = getCategoryColor(category);
                  return (
                    <div key={`${stage}-${category}`} className="mb-2">
                      <span className={`text-tiny font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} capitalize`}>
                        {category}
                      </span>
                      <ul className="mt-1 ml-3 space-y-1">
                        {categoryItems.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-xs text-text-secondary leading-tight">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-border shrink-0" />
                            <span>{item.item_name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-xs text-text-secondary leading-relaxed">
              Còn {resolvedSummary.missing}/{resolvedSummary.total} mục cần hoàn tất.
            </div>
          )}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-bg-card rotate-45 shadow-tooltip-arrow ${
              flipUp ? "-bottom-1.5" : "-top-1.5"
            }`}
          />
        </div>
      )}
    </div>
  );
});

export default MissingInfoBadge;
