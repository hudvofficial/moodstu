import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  id: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  "lễ tân": { bg: "bg-warning/10", text: "text-warning", accent: "bg-warning" },
  makeup: { bg: "bg-accent/10", text: "text-accent", accent: "bg-accent" },
  photo: { bg: "bg-info/10", text: "text-info", accent: "bg-info" },
};

function getCategoryStyle(category: string) {
  const key = Object.keys(CATEGORY_STYLES).find((item) =>
    category.toLowerCase().includes(item),
  );
  return key
    ? CATEGORY_STYLES[key]
    : { bg: "bg-bg-hover", text: "text-text-secondary", accent: "bg-text-muted" };
}

interface ChecklistCategoryCardProps {
  category: string;
  items: ChecklistItem[];
  pendingIds: Set<string>;
  onToggle: (item: ChecklistItem) => void;
}

export function ChecklistCategoryCard({
  category,
  items,
  pendingIds,
  onToggle,
}: ChecklistCategoryCardProps) {
  const style = getCategoryStyle(category);
  const catDone = items.filter((item) => item.is_completed).length;
  const allDone = catDone === items.length;

  return (
    <div className="rounded-md shadow-xs overflow-hidden">
      <div className={`flex items-center justify-between px-3 py-2 ${style.bg}`}>
        <span className={`text-tiny font-bold ${style.text}`}>{category}</span>
        <span className={`text-tiny font-bold ${allDone ? "text-success" : style.text} opacity-80`}>
          {catDone}/{items.length}
        </span>
      </div>

      <div className="px-2 py-2 space-y-1">
        {items.map((item) => {
          const isPending = pendingIds.has(item.id);
          return (
            <Button
              unstyled
              key={item.id}
              type="button"
              disabled={isPending}
              onClick={() => onToggle(item)}
              className={`w-full flex items-center text-left gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200 group active:scale-[0.98] ${
                item.is_completed
                  ? "bg-bg-hover/30 opacity-60"
                  : "bg-bg-card shadow-xs hover:shadow-sm hover:bg-bg-hover/50"
              } ${isPending ? "opacity-50 cursor-wait" : ""}`}
            >
              <div
                className={`w-1 rounded-full transition-all duration-300 self-stretch ${
                  item.is_completed ? "bg-border" : style.accent
                }`}
              />

              <div className="shrink-0 transition-transform duration-200 group-active:scale-90">
                {item.is_completed ? (
                  <CheckSquare className="w-5 h-5 text-success" />
                ) : (
                  <Square className="w-5 h-5 text-text-muted transition-colors group-hover:text-text-secondary" />
                )}
              </div>

              <span
                className={`text-body-sm leading-snug select-none transition-all duration-200 ${
                  item.is_completed
                    ? "line-through text-text-muted"
                    : "text-text-main font-medium group-hover:text-text-primary"
                }`}
              >
                {item.item_name}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
