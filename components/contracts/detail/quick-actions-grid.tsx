import {
  CalendarPlus,
  FolderOpen,
  Banknote,
  Printer,
  Shirt,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════
// QuickActionsGrid — 6 quick action icons
// Rainbow icons + bg circles + enhanced hover
// ═══════════════════════════════════════════

const ACTIONS = [
  { key: "event", label: "Thêm sự kiện", icon: CalendarPlus, text: "text-blue-600", bg: "bg-blue-50", hoverBg: "group-hover:bg-blue-100" },
  { key: "drive", label: "Drive", icon: FolderOpen, text: "text-amber-600", bg: "bg-amber-50", hoverBg: "group-hover:bg-amber-100" },
  { key: "payment", label: "Thu tiền", icon: Banknote, text: "text-emerald-600", bg: "bg-emerald-50", hoverBg: "group-hover:bg-emerald-100" },
  { key: "print", label: "Đặt in", icon: Printer, text: "text-purple-600", bg: "bg-purple-50", hoverBg: "group-hover:bg-purple-100" },
  { key: "costume", label: "Trang phục", icon: Shirt, text: "text-pink-600", bg: "bg-pink-50", hoverBg: "group-hover:bg-pink-100" },
  { key: "note", label: "Ghi chú", icon: MessageSquare, text: "text-sky-600", bg: "bg-sky-50", hoverBg: "group-hover:bg-sky-100" },
] as const;

interface Props {
  onAction?: (key: string) => void;
  paymentLabel?: string;
}

export default function QuickActionsGrid({ onAction, paymentLabel = "Thu tiền" }: Props) {
  return (
    <div className="card-base p-4 lg:p-5 mb-4 lg:mb-0 entrance entrance-1">
      <h3 className="text-caption font-bold text-text-muted uppercase tracking-wider mb-3 lg:mb-4 px-1 lg:px-0">
        Thao tác nhanh
      </h3>
      <div className="flex flex-row overflow-x-auto gap-3 pb-2 -mx-2 px-2 lg:-mx-0 lg:px-0 snap-x hide-scrollbar">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = action.key === "payment" ? paymentLabel : action.label;
          return (
            <Button unstyled
              key={action.key}
              onClick={() => onAction?.(action.key)}
              className="group flex-shrink-0 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-md
                         bg-bg-card shadow-xs lg:bg-primary/4 lg:hover:bg-primary/8 lg:shadow-none
                         w-[85px] lg:w-auto lg:flex-1 snap-center
                         transition-all duration-200
                         active:scale-(--scale-press-sm) active:bg-bg-hover cursor-pointer"
            >
              <div
                className={`w-(--icon-container-md) h-(--icon-container-md) rounded-lg flex items-center justify-center
                            ${action.bg} ${action.hoverBg}
                            lg:group-hover:scale-110 lg:group-hover:shadow-sm
                            transition-all duration-200`}
              >
                <Icon size={22} className={action.text} />
              </div>
              <span className="text-caption font-medium text-text-secondary group-hover:text-text-primary transition-colors text-center w-full truncate px-1">
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
