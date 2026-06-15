"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Calendar, Plus, Copy, Link2, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { formatDate } from "@/lib/utils";
import type { PrintingOrder } from "@/types/contract";
import StatusSelect, { PRINT_ORDER_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updatePrintOrderStatus, updatePrintOrderFileUrl } from "@/app/actions/printing-actions";
import { toast } from "@/lib/toast-utils";

// Production card is intentionally read-mostly; workflow side effects stay in /printing.
interface Props {
  orders: PrintingOrder[];
  contractId: string;
  customerName?: string;
  contractCode?: string;
  remainingAmount?: number;
  onStatusChange?: () => void;
  onAdd?: () => void;
}

const STATUS_ORDER = ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "hoan_thanh"];
const SIDE_EFFECT_STATUSES = new Set(["dat_coc", "dang_in", "da_in", "hoan_thanh", "huy_don"]);

function isRollback(from: string | null | undefined, to: string) {
  const fromIndex = STATUS_ORDER.indexOf(from || "cho_xu_ly");
  const toIndex = STATUS_ORDER.indexOf(to);
  return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
}

function requiresReason(from: string | null | undefined, to: string) {
  return to === "gap_su_co" || isRollback(from, to);
}

function labPaymentBadge(paymentStatus?: string | null): { label: string; variant: "success" | "warning" } {
  switch (paymentStatus) {
    case "paid":
      return { label: "Đã TT lab", variant: "success" };
    case "partial":
      return { label: "TT lab 1 phần", variant: "warning" };
    default:
      return { label: "Chưa TT lab", variant: "warning" };
  }
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function buildLabMessage(order: PrintingOrder, customerName?: string, contractCode?: string): string {
  const lines: string[] = [];
  lines.push(`📋 ĐƠN IN: ${order.order_code || "—"}`);
  if (contractCode) lines.push(`HĐ: ${contractCode}`);
  if (customerName) lines.push(`Khách: ${customerName}`);
  if (order.labs?.name) lines.push(`Lab: ${order.labs.name}`);
  lines.push("", "SẢN PHẨM:");
  (order.items || []).forEach((item, index) => lines.push(`${index + 1}. ${item.name} — SL: ${item.quantity}`));
  if (order.print_file_url) lines.push("", `File in: ${order.print_file_url}`);
  if (order.expected_date) lines.push(`Hẹn: ${formatDate(order.expected_date)}`);
  if (order.notes) lines.push(`Note: ${order.notes}`);
  return lines.join("\n");
}

interface PendingStatusChange {
  orderId: string;
  previous: string;
  next: string;
}

export default function PrintOrdersBlock({
  orders,
  contractId,
  customerName,
  contractCode,
  remainingAmount,
  onStatusChange,
  onAdd,
}: Props) {
  const router = useRouter();
  const [orderOverrides, setOrderOverrides] = useState<Record<string, Partial<PrintingOrder>>>({});
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [deliveryWarning, setDeliveryWarning] = useState<{ orderId: string; previous: string } | null>(null);
  const [routeNotice, setRouteNotice] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState("");

  const localOrders = useMemo(
    () => orders.map((order) => ({ ...order, ...(orderOverrides[order.id] || {}) })),
    [orders, orderOverrides],
  );

  const toggleExpanded = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyStatusUpdate = async (orderId: string, newStatus: string, previous: string, reason?: string) => {
    setOrderOverrides((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), status: newStatus } }));
    onStatusChange?.();

    const result = await updatePrintOrderStatus(orderId, newStatus, contractId, reason);
    if (!result.success) {
      setOrderOverrides((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), status: previous } }));
      toast(result.error || "Lỗi cập nhật", "error");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const previous = localOrders.find((order) => order.id === orderId)?.status;
    if (!previous || previous === newStatus) return;

    if (SIDE_EFFECT_STATUSES.has(newStatus)) {
      setRouteNotice(true);
      return;
    }

    if (newStatus === "da_giao" && (remainingAmount ?? 0) > 0) {
      setDeliveryWarning({ orderId, previous });
      return;
    }

    if (requiresReason(previous, newStatus)) {
      setPendingChange({ orderId, previous, next: newStatus });
      setStatusReason("");
      return;
    }

    await applyStatusUpdate(orderId, newStatus, previous);
  };

  const confirmPendingChange = async () => {
    if (!pendingChange) return;
    const reason = statusReason.trim();
    if (!reason) {
      toast("Vui lòng nhập lý do", "warning");
      return;
    }

    const change = pendingChange;
    setPendingChange(null);
    setStatusReason("");
    await applyStatusUpdate(change.orderId, change.next, change.previous, reason);
  };

  const confirmDelivery = async () => {
    if (!deliveryWarning) return;
    const { orderId, previous } = deliveryWarning;
    setDeliveryWarning(null);
    await applyStatusUpdate(orderId, "da_giao", previous);
  };

  const handleCopyForLab = async (order: PrintingOrder) => {
    try {
      await navigator.clipboard.writeText(buildLabMessage(order, customerName, contractCode));
      toast("Đã copy thông tin gửi Lab", "success");
    } catch {
      toast("Không thể copy, thử lại", "error");
    }
  };

  const startEditFile = (order: PrintingOrder) => {
    setEditingFile(order.id);
    setFileInput(order.print_file_url || "");
  };

  const saveFileUrl = async (orderId: string) => {
    const previous = localOrders.find((order) => order.id === orderId)?.print_file_url || null;
    const url = fileInput.trim() || null;
    setOrderOverrides((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), print_file_url: url } }));
    setEditingFile(null);

    const result = await updatePrintOrderFileUrl(orderId, url, contractId);
    if (!result.success) {
      setOrderOverrides((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), print_file_url: previous } }));
      toast(result.error || "Lỗi lưu link", "error");
    }
  };

  return (
    <div className="card-base p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Printer size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">In ấn</h3>
        </div>
        <div className="flex items-center gap-2">
          {localOrders.length > 0 && <span className="text-caption text-text-muted">{localOrders.length} đơn</span>}
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="!px-2 !py-1 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-0.5" />
              Thêm
            </Button>
          )}
        </div>
      </div>

      {localOrders.length === 0 ? (
        <div className="py-6 text-center">
          <Printer size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">Chưa có đơn in ấn</p>
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="mt-2 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-1" />
              Tạo đơn in
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {localOrders.map((order) => {
            const labPay = labPaymentBadge(order.payment_status);
            const items = order.items || [];
            const expanded = expandedOrders.has(order.id);
            const shownItems = expanded ? items : items.slice(0, 3);

            return (
              <div key={order.id} className="p-2.5 rounded-md bg-bg-hover">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-body-sm font-semibold text-text-primary truncate">{order.order_code || "Đơn in"}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyForLab(order)}
                        className="h-auto shrink-0 px-1 py-1 text-text-muted hover:text-interactive"
                        aria-label="Copy gửi Lab"
                        title="Copy gửi Lab"
                      >
                        <Copy size={13} />
                      </Button>
                    </div>
                    <Badge variant={labPay.variant} className="mt-1 text-micro">
                      {labPay.label}
                    </Badge>
                  </div>
                  <StatusSelect
                    current={order.status || "cho_xu_ly"}
                    options={[...PRINT_ORDER_STATUS_OPTIONS]}
                    variant="compact"
                    onUpdate={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                  />
                </div>

                <div className="flex items-center gap-3 text-caption text-text-muted">
                  {order.labs?.name && <span>Lab: {order.labs.name}</span>}
                  {order.expected_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(order.expected_date)}
                    </span>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {shownItems.map((item, index) => (
                      <div key={`${item.item_id || item.name}-${index}`} className="flex items-center justify-between gap-2 text-caption">
                        <span className="text-text-primary truncate">
                          {item.name} <span className="text-text-muted">×{item.quantity}</span>
                        </span>
                        <span className="text-text-muted tabular-nums shrink-0">{formatVnd((item.quantity || 0) * (item.unitPrice || 0))}đ</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => toggleExpanded(order.id)} className="h-auto px-0 py-0 text-micro text-interactive hover:underline">
                        {expanded ? "Thu gọn" : `Xem thêm ${items.length - 3} mục`}
                      </Button>
                    )}
                  </div>
                )}

                {typeof order.total_amount === "number" && order.total_amount > 0 && (
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-micro text-text-muted uppercase tracking-wide">Tổng</span>
                    <span className="text-body-sm font-bold text-text-primary tabular-nums">{formatVnd(order.total_amount)}đ</span>
                  </div>
                )}

                <div className="mt-2">
                  {editingFile === order.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={fileInput}
                        onChange={(event) => setFileInput(event.target.value)}
                        placeholder="Dán link file in (https://...)"
                        className="h-8 text-caption"
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={() => saveFileUrl(order.id)} className="!px-2 !py-1 text-caption">
                        Lưu
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFile(null)} className="!px-2 !py-1 text-caption">
                        Hủy
                      </Button>
                    </div>
                  ) : order.print_file_url ? (
                    <div className="flex items-center gap-2 text-caption">
                      <a href={order.print_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-interactive hover:underline truncate">
                        <ExternalLink size={12} className="shrink-0" />
                        File in
                      </a>
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEditFile(order)} className="h-auto px-1 py-1 text-text-muted hover:text-interactive" aria-label="Sửa link file">
                        <Pencil size={12} />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEditFile(order)} className="flex h-auto items-center gap-1 px-0 py-0 text-micro text-interactive hover:underline">
                      <Link2 size={12} />
                      Thêm link file
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UnifiedModal
        isOpen={!!pendingChange}
        onClose={() => {
          setPendingChange(null);
          setStatusReason("");
        }}
        title="Nhập lý do thay đổi trạng thái"
        description="Bắt buộc khi báo sự cố hoặc chuyển lùi quy trình."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPendingChange(null);
                setStatusReason("");
              }}
            >
              Hủy
            </Button>
            <Button type="button" onClick={confirmPendingChange}>Xác nhận</Button>
          </div>
        )}
      >
        <Textarea
          value={statusReason}
          onChange={(event) => setStatusReason(event.target.value)}
          placeholder="VD: In sai màu, khách đổi yêu cầu, thao tác nhầm cần quay lại..."
          rows={4}
          autoFocus
        />
      </UnifiedModal>

      <UnifiedModal
        isOpen={!!deliveryWarning}
        onClose={() => setDeliveryWarning(null)}
        title="Hợp đồng chưa thanh toán đủ"
        description={`Khách còn nợ ${formatVnd(remainingAmount ?? 0)}đ. Vẫn xác nhận đã giao sản phẩm?`}
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeliveryWarning(null)}>Hủy</Button>
            <Button type="button" onClick={confirmDelivery}>Vẫn giao</Button>
          </div>
        )}
      >
        <p className="text-body-sm text-text-muted">Kiểm tra lại công nợ trước khi bàn giao cho khách.</p>
      </UnifiedModal>

      <UnifiedModal
        isOpen={routeNotice}
        onClose={() => setRouteNotice(false)}
        title="Cần xử lý ở trang In ấn"
        description="Bước này cập nhật tồn kho và thanh toán Lab - cần thực hiện ở trang In ấn để chạy đúng nghiệp vụ."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRouteNotice(false)}>Đóng</Button>
            <Button
              type="button"
              onClick={() => {
                setRouteNotice(false);
                router.push("/printing");
              }}
            >
              Mở trang In ấn
            </Button>
          </div>
        )}
      >
        <p className="text-body-sm text-text-muted">Tìm mã đơn ở danh sách In ấn để mở và xử lý.</p>
      </UnifiedModal>
    </div>
  );
}
