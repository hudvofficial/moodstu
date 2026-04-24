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
  "makeup": { bg: "bg-accent/10", text: "text-accent", accent: "bg-accent" },
  "photo":  { bg: "bg-info/10", text: "text-info", accent: "bg-info" },
};

function getCategoryStyle(category: string) {
  const key = Object.keys(CATEGORY_STYLES).find((k) =>
    category.toLowerCase().includes(k)
  );
  return key
    ? CATEGORY_STYLES[key]
    : { bg: "bg-bg-hover", text: "text-text-secondary", accent: "bg-text-muted" };
}

interface ChecklistCategoryCardProps {
  category: string;
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
}

export function ChecklistCategoryCard({
  category,
  items,
  onToggle,
}: ChecklistCategoryCardProps) {
  const style = getCategoryStyle(category);
  const catDone = items.filter((i) => i.is_completed).length;
  const allDone = catDone === items.length;

  return (
    <div className="rounded-md shadow-xs overflow-hidden">
      {/* Category header */}
      <div className={`flex items-center justify-between px-3 py-2 ${style.bg}`}>
        <span className={`text-tiny font-bold ${style.text}`}>
          {category}
        </span>
        <span className={`text-tiny font-bold ${allDone ? "text-success" : style.text} opacity-80`}>
          {catDone}/{items.length}
        </span>
      </div>

      {/* Items */}
      <div className="px-2 py-2 space-y-1">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all group ${
              item.is_completed
                ? "bg-bg-hover/30 opacity-60"
                : "bg-bg-card shadow-xs hover:shadow-sm"
            }`}
          >
            {/* Accent bar */}
            <div
              className={`w-1 rounded-full transition-all self-stretch ${
                item.is_completed ? "bg-border" : style.accent
              }`}
            />

            {/* Checkbox icon */}
            <Button unstyled
              type="button"
              onClick={() => onToggle(item)}
              className="shrink-0"
            >
              {item.is_completed ? (
                <CheckSquare className="w-5 h-5 text-success" />
              ) : (
                <Square className="w-5 h-5 text-text-muted transition-colors group-hover:text-text-secondary" />
              )}
            </Button>

            {/* Label */}
            <span
              className={`text-body-sm leading-snug select-none transition-all ${
                item.is_completed
                  ? "line-through text-text-muted"
                  : "text-text-main font-medium group-hover:text-text-primary"
              }`}
            >
              {item.item_name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
