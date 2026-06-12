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
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 md:gap-3 mt-3 lg:mt-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = action.key === "payment" ? paymentLabel : action.label;
          return (
            <Button unstyled
              key={action.key}
              onClick={() => onAction?.(action.key)}
              className="group flex min-w-0 flex-col items-center justify-center gap-1 sm:gap-1.5 md:gap-2
                         rounded-xl px-1 py-2 sm:px-2 sm:py-3 lg:py-4
                         bg-bg-hover/50 hover:bg-bg-hover border border-transparent hover:border-border/50
                         transition-all duration-200
                         active:scale-(--scale-press-sm) cursor-pointer"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-(--icon-container-md) md:w-(--icon-container-md)
                            ${action.bg} ${action.hoverBg}
                            lg:group-hover:scale-110 lg:group-hover:shadow-sm
                            transition-all duration-200`}
              >
                <Icon size={20} className={action.text} />
              </div>
              <span className="w-full truncate px-0.5 text-center text-tiny font-medium text-text-secondary transition-colors group-hover:text-text-primary sm:text-caption">
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
