import {
  CalendarPlus,
  FolderOpen,
  Banknote,
  Printer,
  Shirt,
  MessageSquare,
} from "lucide-react";

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
}

export default function QuickActionsGrid({ onAction }: Props) {
  return (
    <>
      {/* ══════ MOBILE: no card wrapper ══════ */}
      <div className="lg:hidden px-4 py-3">
        <h3 className="text-caption font-bold text-text-muted uppercase tracking-wider mb-3">
          Thao tác nhanh
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => onAction?.(action.key)}
                className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-md
                           bg-bg-card shadow-xs
                           transition-all duration-200
                           active:scale-(--scale-press-sm) active:bg-bg-hover cursor-pointer"
              >
                <div
                  className={`w-(--icon-container-sm) h-(--icon-container-sm) rounded-md flex items-center justify-center
                              ${action.bg} ${action.hoverBg}
                             transition-all duration-200`}
                >
                  <Icon size={20} className={action.text} />
                </div>
                <span className="text-caption font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════ DESKTOP: card wrapper ══════ */}
      <div className="max-lg:hidden card-base p-5">
        <h3 className="text-caption font-bold text-text-muted uppercase tracking-wider mb-3">
          Thao tác nhanh
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => onAction?.(action.key)}
                className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-md
                           bg-primary/4 hover:bg-primary/8
                           transition-all duration-200
                           active:scale-(--scale-press-sm) cursor-pointer"
              >
                <div
                  className={`w-(--icon-container-md) h-(--icon-container-md) rounded-lg flex items-center justify-center
                              ${action.bg} ${action.hoverBg}
                              group-hover:scale-110 group-hover:shadow-sm
                              transition-all duration-200`}
                >
                  <Icon size={22} className={action.text} />
                </div>
                <span className="text-caption font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
