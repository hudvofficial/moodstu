"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, ChevronDown, ChevronRight } from "lucide-react";
import { toggleChecklist } from "@/app/actions/checklist-actions";
import { updateContractListChecklistCache, markContractSelfMutation } from "@/lib/hooks/use-contract-queries";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  id: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
}

interface DrawerChecklistProps {
  contractId?: string;
  items: ChecklistItem[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "lễ tân": { bg: "bg-warning/10", text: "text-warning" },
  "makeup": { bg: "bg-accent/10", text: "text-accent" },
  "photo": { bg: "bg-info/10", text: "text-info" },
};

function getCatStyle(category: string) {
  const key = Object.keys(CATEGORY_COLORS).find((item) =>
    category.toLowerCase().includes(item),
  );
  return key
    ? CATEGORY_COLORS[key]
    : { bg: "bg-bg-hover", text: "text-text-secondary" };
}

export function DrawerChecklist({ contractId, items: initialItems }: DrawerChecklistProps) {
  const queryClient = useQueryClient();
  const [pendingToggles, setPendingToggles] = useState<Map<string, boolean>>(new Map());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    if (pendingToggles.size === 0) return initialItems;
    return initialItems.map(item => {
      const override = pendingToggles.get(item.id);
      return override !== undefined ? { ...item, is_completed: override } : item;
    });
  }, [initialItems, pendingToggles]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingToggles(prev => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const [id, value] of prev) {
        if (initialItems.find(i => i.id === id)?.is_completed === value) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialItems]);

  const total = items.length;
  const done = items.filter((item) => item.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [items]);

  const categories = Object.keys(grouped);

  const toggleExpand = useCallback((category: string) => {
    setExpandedCats((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleToggle = useCallback(async (item: ChecklistItem) => {
    const nextCompleted = !item.is_completed;
    const itemContractId = contractId; // truyền từ DrawerContent để list cache update ngay, không đợi realtime/server

    await runOptimisticMutation({
      apply: () => {
        markContractSelfMutation(); // realtime handler bỏ qua echo của cú tick này → list không refetch
        setPendingToggles(prev => new Map(prev).set(item.id, nextCompleted));
        // Optimistic update cho LIST CACHE (Bảng bên trái nhảy instant)
        if (itemContractId) {
          updateContractListChecklistCache(queryClient, itemContractId, item.id, nextCompleted);
        }
      },
      rollback: () => {
        setPendingToggles(prev => { const next = new Map(prev); next.delete(item.id); return next; });
        // Rollback lại LIST CACHE nếu API fail
        if (itemContractId) {
          updateContractListChecklistCache(queryClient, itemContractId, item.id, item.is_completed);
        }
      },
      action: () => toggleChecklist(item.id, nextCompleted),
      // KHÔNG invalidate drawerExtra ở onSuccess: optimistic patch (apply) đã cập nhật
      // đúng cả list cache lẫn drawer cache; server success = xác nhận, refetch chỉ tạo
      // data-swap re-render ~300ms sau mỗi tick (cảm giác "trôi/cấn"). Đồng bộ cuối
      // do trailing reconcile của realtime handler lo (3.5s sau cú tick cuối, im lặng).
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Lỗi cập nhật checklist");
      },
    });
  }, [queryClient, contractId]);

  if (total === 0) {
    return (
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-2">
          <CheckSquare className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Chuẩn bị
        </h4>
        <p className="text-body-sm text-text-muted italic">Chưa có checklist chuẩn bị</p>
      </section>
    );
  }

  return (
    <section className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-caption font-semibold text-text-secondary">
          <CheckSquare className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Chuẩn bị
        </h4>
        <span className={`text-tiny font-bold ${pct === 100 ? "text-success" : "text-text-muted"}`}>
          {done}/{total} ({pct}%)
        </span>
      </div>

      <div className="w-full h-1.5 bg-bg-hover rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {categories.map((category) => {
          const catItems = grouped[category];
          const catDone = catItems.filter((item) => item.is_completed).length;
          const isExpanded = expandedCats.has(category);
          const style = getCatStyle(category);

          return (
            <div key={category}>
              <Button
                unstyled
                onClick={() => toggleExpand(category)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-hover/30 ${style.bg}`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                )}
                <span className={`text-tiny font-bold ${style.text}`}>{category}</span>
                <span className={`text-tiny ml-auto font-bold ${
                  catDone === catItems.length ? "text-success" : "text-text-muted"
                }`}
                >
                  {catDone === catItems.length ? "✓ " : ""}{catDone}/{catItems.length}
                </span>
              </Button>

              {isExpanded && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5">
                  {catItems.map((item) => {
                    return (
                      <Button
                        unstyled
                        key={item.id}
                        type="button"
                        onClick={() => handleToggle(item)}
                        className="w-full flex items-center text-left gap-2 px-2 py-2.5 rounded cursor-pointer transition-colors group active:scale-[0.98] hover:bg-hover/20 min-h-[44px]"
                      >
                        <div className="shrink-0 transition-transform group-active:scale-90">
                          {item.is_completed ? (
                            <CheckSquare className="w-4 h-4 text-success" />
                          ) : (
                            <Square className="w-4 h-4 text-text-muted" />
                          )}
                        </div>
                        <span
                          className={`text-body-sm leading-snug select-none transition-opacity ${
                            item.is_completed
                              ? "line-through text-text-muted opacity-70"
                              : "text-text-main"
                          }`}
                        >
                          {item.item_name}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
