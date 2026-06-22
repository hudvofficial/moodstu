"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { toggleChecklist } from "@/app/actions/checklist-actions";
import { updateContractListChecklistCache, contractKeys } from "@/lib/hooks/use-contract-queries";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getEventTypeLabel } from "@/types/contract-constants";
import type { EventType } from "@/types/contract";
import { ChecklistCategoryCard } from "./checklist-category-card";

export interface ChecklistItem {
  id: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
}

const STAGE_ORDER = ["chụp", "ảnh", "phóng", "ăn hỏi", "hỏi", "lễ", "cưới"];

function sortStages(stages: string[]) {
  return [...stages].sort((a, b) => {
    const ia = STAGE_ORDER.findIndex((stage) => a.toLowerCase().includes(stage));
    const ib = STAGE_ORDER.findIndex((stage) => b.toLowerCase().includes(stage));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function getStageProgress(cats: Record<string, ChecklistItem[]>) {
  const all = Object.values(cats).flat();
  const done = all.filter((item) => item.is_completed).length;
  return {
    done,
    total: all.length,
    pct: all.length > 0 ? Math.round((done / all.length) * 100) : 0,
  };
}

export default function ContractChecklistManager({
  contractId,
  initialChecklists = [],
}: {
  contractId?: string;
  initialChecklists: ChecklistItem[];
}) {
  const queryClient = useQueryClient();
  const [pendingToggles, setPendingToggles] = useState<Map<string, boolean>>(new Map());

  const items = useMemo(() => {
    if (pendingToggles.size === 0) return initialChecklists;
    return initialChecklists.map(item => {
      const override = pendingToggles.get(item.id);
      return override !== undefined ? { ...item, is_completed: override } : item;
    });
  }, [initialChecklists, pendingToggles]);

  const pendingIds = useMemo(() => new Set(pendingToggles.keys()), [pendingToggles]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingToggles(prev => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const [id, value] of prev) {
        if (initialChecklists.find(i => i.id === id)?.is_completed === value) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialChecklists]);

  const groupedByStage = useMemo(() => {
    const map: Record<string, Record<string, ChecklistItem[]>> = {};
    for (const item of items) {
      const stage = item.event_stage || "NGÀY CHỤP";
      if (!map[stage]) map[stage] = {};
      if (!map[stage][item.category]) map[stage][item.category] = [];
      map[stage][item.category].push(item);
    }
    return map;
  }, [items]);

  const stages = useMemo(() => sortStages(Object.keys(groupedByStage)), [groupedByStage]);
  const defaultStage = useMemo(() => {
    if (stages.length === 0) return null;
    return stages.find((stage) =>
      Object.values(groupedByStage[stage]).flat().some((item) => !item.is_completed),
    ) || stages[0];
  }, [groupedByStage, stages]);

  const [activeStage, setActiveStage] = useState<string | null>(defaultStage);
  const hasMultipleStages = stages.length > 1;

  useEffect(() => {
    if (!activeStage || !stages.includes(activeStage)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStage(defaultStage);
    }
  }, [activeStage, defaultStage, stages]);

  const total = items.length;
  const done = items.filter((item) => item.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleToggle = useCallback(async (item: ChecklistItem) => {
    if (pendingToggles.has(item.id)) return;

    const nextCompleted = !item.is_completed;
    const itemContractId = contractId;

    await runOptimisticMutation({
      apply: () => {
        setPendingToggles(prev => new Map(prev).set(item.id, nextCompleted));
        if (itemContractId) {
          updateContractListChecklistCache(queryClient, itemContractId, item.id, nextCompleted);
        }
      },
      rollback: () => {
        setPendingToggles(prev => { const next = new Map(prev); next.delete(item.id); return next; });
        if (itemContractId) {
          updateContractListChecklistCache(queryClient, itemContractId, item.id, item.is_completed);
        }
      },
      action: () => toggleChecklist(item.id, nextCompleted),
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(result.data.contract_id) });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Lỗi cập nhật checklist");
      },
    });
  }, [pendingToggles, queryClient]);

  if (total === 0) {
    return (
      <div className="card-base p-4 lg:p-5" id="section-checklist-items">
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">Chuẩn bị</h3>
        </div>
        <p className="text-body-sm text-text-muted italic">Chưa có checklist chuẩn bị</p>
      </div>
    );
  }

  return (
    <div className="card-base p-4 lg:p-5" id="section-checklist-items">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">Chuẩn bị</h3>
        </div>
        <span className={`text-caption font-bold ${pct === 100 ? "text-success" : "text-text-muted"}`}>
          {done}/{total} ({pct}%)
        </span>
      </div>

      <div className="h-2 rounded-full bg-bg-hover overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {hasMultipleStages && (
        <div className="flex gap-1 mb-4 p-1 bg-bg-hover rounded-md">
          {stages.map((stage) => {
            const progress = getStageProgress(groupedByStage[stage]);
            const isActive = activeStage === stage;
            return (
              <Button
                unstyled
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`flex-1 py-2 px-3 rounded-md text-caption font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-bg-card text-text-main shadow-sm"
                    : progress.pct === 100
                      ? "text-success/60 hover:bg-bg-card/60 hover:text-success"
                      : "text-text-muted hover:bg-bg-card/60 hover:text-text-secondary"
                }`}
              >
                <div className="truncate">{getEventTypeLabel(stage as EventType)}</div>
                <div className={`text-tiny ${progress.pct === 100 ? "text-success" : ""}`}>
                  {progress.done}/{progress.total}
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {stages.map((stage) => {
        if (hasMultipleStages && stage !== activeStage) return null;

        const categories = groupedByStage[stage];
        const catEntries = Object.entries(categories);
        const gridClass =
          catEntries.length >= 3
            ? "grid-cols-1 lg:grid-cols-3"
            : catEntries.length === 2
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1";

        if (!hasMultipleStages) {
          return (
            <div key={stage} className={`grid gap-3 ${gridClass}`}>
              {catEntries.map(([category, catItems]) => (
                <ChecklistCategoryCard
                  key={category}
                  category={category}
                  items={catItems}
                  pendingIds={pendingIds}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          );
        }

        return (
          <div key={stage}>
            <Button
              unstyled
              onClick={() => setActiveStage(activeStage === stage ? null : stage)}
              className="group w-full flex items-center justify-between rounded-md px-2 py-2 -mx-2 text-left transition-colors hover:bg-bg-hover cursor-pointer"
            >
              <span className="text-caption font-bold text-text-secondary transition-colors group-hover:text-text-primary">
                {getEventTypeLabel(stage as EventType)}
              </span>
              {activeStage === stage ? (
                <ChevronUp size={14} className="text-text-muted transition-colors group-hover:text-text-primary" />
              ) : (
                <ChevronDown size={14} className="text-text-muted transition-colors group-hover:text-text-primary" />
              )}
            </Button>

            <div className={`grid gap-3 ${gridClass}`}>
              {catEntries.map(([category, catItems]) => (
                <ChecklistCategoryCard
                  key={category}
                  category={category}
                  items={catItems}
                  pendingIds={pendingIds}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
