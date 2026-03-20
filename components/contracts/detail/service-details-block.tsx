import { List, Package, Shirt, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ContractItem, ItemType } from "@/types/contract";
import { getItemTypeLabel } from "@/types/contract-constants";

// ═══════════════════════════════════════════
// ServiceDetailsBlock — Service/product table
// Phase 04b: Desktop table + Mobile cards
// V1 Ref: details/ServiceDetailsBlock.tsx (210 lines)
// ═══════════════════════════════════════════

interface Props {
  items: ContractItem[];
  totalAmount: number;
  discountAmount: number;
}

// ─── Item type display map ────────────────────
const ITEM_TYPE_VARIANT: Record<ItemType, "info" | "warning" | "accent" | "error"> = {
  dich_vu: "info",
  san_pham: "warning",
  trang_phuc: "accent",
  phat_sinh: "error",
};

function getItemIcon(type: ItemType) {
  switch (type) {
    case "dich_vu":
      return <Wrench size={16} />;
    case "san_pham":
      return <Package size={16} />;
    case "trang_phuc":
      return <Shirt size={16} />;
    case "phat_sinh":
      return <Wrench size={16} />;
    default:
      return <Package size={16} />;
  }
}

export default function ServiceDetailsBlock({
  items,
  totalAmount,
  discountAmount,
}: Props) {
  const subtotal = items.reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center gap-2">
          <List size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Chi tiết dịch vụ & sản phẩm
          </h3>
        </div>
        <Badge variant="neutral">{items.length} mục</Badge>
      </div>

      {items.length > 0 ? (
        <>
          {/* ═══ Desktop Table ═══ */}
          <div className="hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-hover/50">
                  <th className="table-header px-6 py-3 text-left">
                    Tên dịch vụ
                  </th>
                  <th className="table-header px-4 py-3 text-center">Loại</th>
                  <th className="table-header px-4 py-3 text-center">SL</th>
                  <th className="table-header px-4 py-3 text-right">
                    Đơn giá
                  </th>
                  <th className="table-header px-6 py-3 text-right">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const variant = ITEM_TYPE_VARIANT[item.type] || "info";
                  const typeLabel = getItemTypeLabel(item.type);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-bg-hover/30 transition-colors ${
                        idx < items.length - 1
                          ? "shadow-[inset_0_-1px_0_var(--color-border)]"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-bg-hover text-text-secondary">
                            {getItemIcon(item.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body-sm font-semibold text-text-primary truncate">
                              {item.item_name}
                            </p>
                            {item.notes && (
                              <p className="text-caption truncate">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={variant}>
                          {typeLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-body-sm font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-body-sm text-text-secondary">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-3 text-right text-body-sm font-bold text-text-primary">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ Mobile Cards ═══ */}
          <div className="lg:hidden px-4 pb-2 space-y-2">
            {items.map((item) => {
              const variant = ITEM_TYPE_VARIANT[item.type] || "info";
              const typeLabel = getItemTypeLabel(item.type);
              return (
                <div key={item.id} className="p-3 rounded-xl bg-bg-hover/40">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-body-sm font-semibold text-text-primary flex-1 min-w-0 truncate">
                      {item.item_name}
                    </p>
                    <Badge variant={variant}>
                      {typeLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-caption">
                    <span>
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </span>
                    <span className="font-bold text-text-primary">
                      {formatCurrency(item.total_amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ Footer Totals ═══ */}
          <div className="px-4 lg:px-6 py-3 lg:py-4 bg-bg-hover/30 space-y-1.5">
            <div className="flex justify-between text-body-sm">
              <span className="text-text-secondary">Tạm tính</span>
              <span className="font-semibold">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-body-sm">
                <span className="text-text-secondary">Giảm giá</span>
                <span className="font-semibold text-red-600">
                  −{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <div className="bg-border/30 h-px my-1" />
            <div className="flex justify-between">
              <span className="text-body-sm font-bold text-text-primary">
                Tổng cộng
              </span>
              <span className="text-h3 text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 lg:px-6 py-8 text-center">
          <Package size={32} className="mx-auto text-text-muted mb-2" />
          <p className="text-body-sm text-text-muted">Chưa có dịch vụ nào</p>
        </div>
      )}
    </div>
  );
}
