"use client";

/**
 * ✅ DrawerChecklist — Compact checklist view for contract drawer
 *
 * Shows progress bar + grouped by category with toggleable items.
 * Optimistic UI: checkbox updates instantly, syncs in background.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { CheckSquare, Square, ChevronDown, ChevronRight } from "lucide-react";
import { toggleChecklist } from "@/app/actions/checklist-actions";
import { toast } from "sonner";

// ─── TYPES ───────────────────────────────────

interface ChecklistItem {
  id: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
}

interface DrawerChecklistProps {
  items: ChecklistItem[];
}

// ─── CATEGORY COLORS ────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "lễ tân": { bg: "bg-amber-100/60", text: "text-amber-700" },
  "makeup": { bg: "bg-pink-100/60", text: "text-pink-700" },
  "photo": { bg: "bg-blue-100/60", text: "text-blue-700" },
};

function getCatStyle(category: string) {
  const key = Object.keys(CATEGORY_COLORS).find((k) =>
    category.toLowerCase().includes(k)
  );
  return key
    ? CATEGORY_COLORS[key]
    : { bg: "bg-bg-hover", text: "text-text-secondary" };
}

// ─── COMPONENT ───────────────────────────────

export function DrawerChecklist({ items: initialItems }: DrawerChecklistProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Sync state when props change (SWR revalidation, drawer reopen)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Stats
  const total = items.length;
  const done = items.filter((i) => i.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    for (const item of items) {
      const cat = item.category;
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return map;
  }, [items]);

  const categories = Object.keys(grouped);

  // Toggle expand
  const toggleExpand = useCallback((cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // Toggle item (optimistic + race condition lock)
  const handleToggle = useCallback(async (item: ChecklistItem) => {
    // Prevent double-click race condition
    if (pendingIds.has(item.id)) return;

    const newVal = !item.is_completed;

    // Lock item
    setPendingIds((prev) => new Set(prev).add(item.id));

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_completed: newVal } : i
      )
    );

    try {
      const res = await toggleChecklist(item.id, newVal);
      if (!res.success) {
        // Revert
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, is_completed: !newVal } : i
          )
        );
        toast.error("Lỗi cập nhật checklist");
      }
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_completed: !newVal } : i
        )
      );
      toast.error("Lỗi kết nối");
    } finally {
      // Unlock item
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [pendingIds]);

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
      {/* Header + Progress */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-caption font-semibold text-text-secondary">
          <CheckSquare className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Chuẩn bị
        </h4>
        <span className={`text-tiny font-bold ${pct === 100 ? "text-success" : "text-text-muted"}`}>
          {done}/{total} ({pct}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-bg-hover rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Category groups */}
      <div className="flex flex-col gap-1.5">
        {categories.map((cat) => {
          const catItems = grouped[cat];
          const catDone = catItems.filter((i) => i.is_completed).length;
          const isExpanded = expandedCats.has(cat);
          const style = getCatStyle(cat);

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggleExpand(cat)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-hover/30 ${style.bg}`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                )}
                <span className={`text-tiny font-bold ${style.text}`}>
                  {cat}
                </span>
                <span className={`text-tiny ml-auto font-bold ${
                  catDone === catItems.length ? "text-success" : "text-text-muted"
                }`}>
                  {catDone === catItems.length ? "✓ " : ""}{catDone}/{catItems.length}
                </span>
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5">
                  {catItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-hover/20 transition-colors ${
                        pendingIds.has(item.id) ? "opacity-50 cursor-wait" : ""
                      }`}
                    >
                      {item.is_completed ? (
                        <CheckSquare
                          className="w-4 h-4 text-success shrink-0 cursor-pointer"
                          onClick={() => handleToggle(item)}
                        />
                      ) : (
                        <Square
                          className="w-4 h-4 text-text-muted shrink-0 cursor-pointer"
                          onClick={() => handleToggle(item)}
                        />
                      )}
                      <span
                        className={`text-body-sm leading-snug select-none ${
                          item.is_completed
                            ? "line-through text-text-muted"
                            : "text-text-main"
                        }`}
                      >
                        {item.item_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
