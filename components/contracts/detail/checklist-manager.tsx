"use client";

/**
 * ✅ ContractChecklistManager — Full checklist for detail page
 *
 * Port from V1 (540 LOC) → V2 optimized (~250 LOC)
 * - Stage tabs (khi có nhiều stages: NGÀY CHỤP, NGÀY TỔ CHỨC)
 * - Category groups (Lễ Tân, Makeup, Photo)
 * - Optimistic toggle
 * - Progress per stage + global
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { toggleChecklist } from "@/app/actions/checklist-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
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

// ─── STAGE SORT ──────────────────────────────

const STAGE_ORDER = ["chụp", "ảnh", "phóng", "ăn hỏi", "hỏi", "lễ", "cưới"];



function sortStages(stages: string[]) {
  return [...stages].sort((a, b) => {
    const ia = STAGE_ORDER.findIndex((s) => a.toLowerCase().includes(s));
    const ib = STAGE_ORDER.findIndex((s) => b.toLowerCase().includes(s));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// ─── COMPONENT ───────────────────────────────

export default function ContractChecklistManager({
  initialChecklists = [],
}: {
  initialChecklists: ChecklistItem[];
}) {
  const [items, setItems] = useState(initialChecklists);

  // W6 fix: Sync state when prop changes (switching contracts / tab refetch)
  useEffect(() => {
    setItems(initialChecklists);
  }, [initialChecklists]);

  // Group by stage → category
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
  // Compute initial active stage (first pending, or first stage)
  const defaultStage = useMemo(() => {
    if (stages.length === 0) return null;
    return stages.find((s) => {
      const cats = groupedByStage[s];
      return Object.values(cats).flat().some((i) => !i.is_completed);
    }) || stages[0];
  }, [stages, groupedByStage]);

  const [activeStage, setActiveStage] = useState<string | null>(defaultStage);
  const hasMultipleStages = stages.length > 1;

  // Stats
  const total = items.length;
  const done = items.filter((i) => i.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Toggle (optimistic)
  const handleToggle = useCallback(async (item: ChecklistItem) => {
    const newVal = !item.is_completed;
    const applyState = (isCompleted: boolean) => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_completed: isCompleted } : i))
      );
    };

    await runOptimisticMutation({
      apply: () => applyState(newVal),
      rollback: () => applyState(!newVal),
      action: () => toggleChecklist(item.id, newVal),
      onSuccess: (res) => {
        void revalidateContractCaches(res.data.contract_id);
      },
      onError: () => {
        toast.error("Lỗi cập nhật checklist");
      },
    });
  }, []);

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

  // ── Stage progress helper ──
  const getStageProgress = (cats: Record<string, ChecklistItem[]>) => {
    const all = Object.values(cats).flat();
    const d = all.filter((i) => i.is_completed).length;
    return { done: d, total: all.length, pct: all.length > 0 ? Math.round((d / all.length) * 100) : 0 };
  };

  return (
    <div className="card-base p-4 lg:p-5" id="section-checklist-items">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Chuẩn bị
          </h3>
        </div>
        <span className={`text-caption font-bold ${pct === 100 ? "text-success" : "text-text-muted"}`}>
          {done}/{total} ({pct}%)
        </span>
      </div>

      {/* Global progress */}
      <div className="h-2 rounded-full bg-bg-hover overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stage tabs (nếu nhiều stages) */}
      {hasMultipleStages && (
        <div className="flex gap-1 mb-4 p-1 bg-bg-hover rounded-md">
          {stages.map((stage) => {
            const sp = getStageProgress(groupedByStage[stage]);
            const isActive = activeStage === stage;
            return (
              <Button unstyled
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`flex-1 py-2 px-3 rounded-md text-caption font-bold transition-all ${
                  isActive
                    ? "bg-bg-card text-text-main shadow-sm"
                    : sp.pct === 100
                      ? "text-success/60 hover:text-success"
                      : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="truncate">{getEventTypeLabel(stage as EventType)}</div>
                <div className={`text-tiny ${sp.pct === 100 ? "text-success" : ""}`}>
                  {sp.done}/{sp.total}
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {/* Active stage content */}
      {stages.map((stage) => {
        if (hasMultipleStages && stage !== activeStage) return null;

        const categories = groupedByStage[stage];
        const catEntries = Object.entries(categories);

        // Single stage: show collapsible
        if (!hasMultipleStages) {
          return (
            <div
              key={stage}
              className={`grid gap-3 ${
                catEntries.length >= 3
                  ? "grid-cols-1 lg:grid-cols-3"
                  : catEntries.length === 2
                    ? "grid-cols-1 lg:grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {catEntries.map(([cat, catItems]) => (
                <ChecklistCategoryCard
                  key={cat}
                  category={cat}
                  items={catItems}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          );
        }

        // Multi-stage: show with stage header
        return (
          <div key={stage}>
            {/* Stage section header */}
            <Button unstyled
              onClick={() => setActiveStage(activeStage === stage ? null : stage)}
              className="w-full flex items-center justify-between py-2 text-left"
            >
              <span className="text-caption font-bold text-text-secondary">
                {getEventTypeLabel(stage as EventType)}
              </span>
              {activeStage === stage ? (
                <ChevronUp size={14} className="text-text-muted" />
              ) : (
                <ChevronDown size={14} className="text-text-muted" />
              )}
            </Button>

            <div
              className={`grid gap-3 ${
                catEntries.length >= 3
                  ? "grid-cols-1 lg:grid-cols-3"
                  : catEntries.length === 2
                    ? "grid-cols-1 lg:grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {catEntries.map(([cat, catItems]) => (
                <ChecklistCategoryCard
                  key={cat}
                  category={cat}
                  items={catItems}
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
