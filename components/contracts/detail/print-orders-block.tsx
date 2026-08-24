"use client";

import { useMemo, useState } from "react";
import { Printer, Calendar, Plus, Copy, Link2, ExternalLink, Pencil, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
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

// Trục A — tiến độ sản xuất Mood ⇄ Lab (ADR-014). Không còn "đặt cọc"/"giao khách" —
// và không còn side effect (kho/tiền) gắn theo trạng thái nào, nên mọi bước chuyển
// đều an toàn thao tác thẳng ở đây, không cần route sang /printing như trước.
const STATUS_ORDER = ["cho_xu_ly", "dang_in", "da_in", "hoan_thanh"];

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
  const [orderOverrides, setOrderOverrides] = useState<Record<string, Partial<PrintingOrder>>>({});
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
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
    <div className="card-base overflow-hidden border border-border/60 bg-gradient-to-b from-white to-bg-subtle/40 p-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Printer size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-body-sm font-bold text-text-primary">In ấn</h3>
            {localOrders.length > 0 && (
              <p className="text-micro text-text-muted">
                {localOrders.length} đơn đang theo dõi
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {localOrders.length > 0 && (
            <span className="rounded-full bg-bg-hover px-2.5 py-1 text-micro font-semibold text-text-muted">
              {localOrders.length} đơn
            </span>
          )}
          {onAdd && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="!px-2.5 !py-1.5 text-caption font-semibold text-interactive hover:bg-interactive-light"
            >
              <Plus size={14} className="mr-1" />
              Thêm
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {localOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-bg-hover/40 px-4 py-8 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-text-muted shadow-sm">
              <Printer size={22} />
            </span>
            <p className="text-body-sm font-semibold text-text-primary">Chưa có đơn in ấn</p>
            <p className="mt-1 text-caption text-text-muted">Tạo đơn in để theo dõi lab, file và tiến độ sản xuất.</p>
            {onAdd && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="mt-3 text-caption font-semibold text-interactive hover:bg-interactive-light"
              >
                <Plus size={14} className="mr-1" />
                Tạo đơn in
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {localOrders.map((order) => {
              const labPay = labPaymentBadge(order.payment_status);
              const items = order.items || [];
              const expanded = expandedOrders.has(order.id);
              const isLate = order.expected_date && new Date(order.expected_date) < new Date() && !["hoan_thanh", "huy_don"].includes(order.status || "");
              const isMissingFile = !order.print_file_url && !["hoan_thanh", "huy_don"].includes(order.status || "");
              const hasNoItems = items.length === 0;

              return (
                <div
                  key={order.id}
                  className={`group rounded-xl border bg-white/80 shadow-sm transition-all duration-200 ${
                    expanded ? "border-primary/30 ring-1 ring-primary/10" : "border-border/60 hover:border-primary/20 hover:shadow-md"
                  }`}
                >
                  {/* HEADER AREA - ALWAYS VISIBLE */}
                  <div 
                    className="flex cursor-pointer items-start justify-between gap-3 p-3.5"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-body-sm font-bold text-text-primary">{order.order_code || "Đơn in"}</p>
                        
                        {/* Status Summary & Warnings */}
                        <div className="flex items-center gap-1.5">
                          {isLate && (
                            <span className="flex items-center gap-1 rounded bg-error-light px-1.5 py-0.5 text-micro font-semibold text-error-dark" title="Quá hạn giao">
                              <AlertCircle size={10} /> Quá hạn
                            </span>
                          )}
                          {isMissingFile && (
                            <span className="flex items-center gap-1 rounded bg-warning-light px-1.5 py-0.5 text-micro font-semibold text-warning-dark" title="Thiếu file in">
                              Thiếu file
                            </span>
                          )}
                          {hasNoItems && (
                            <span className="flex items-center gap-1 rounded bg-bg-hover px-1.5 py-0.5 text-micro font-medium text-text-muted">
                              Rỗng
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary Text (Visible when collapsed) */}
                      {!expanded && (
                        <p className="mt-1 truncate text-caption text-text-muted">
                          {items.length > 0 ? (
                            <span className="font-medium text-text-primary">{items.length} SP</span>
                          ) : (
                            "Chưa có SP"
                          )}
                          {typeof order.total_amount === "number" && order.total_amount > 0 && ` • ${formatVnd(order.total_amount)}đ`}
                          {order.expected_date && ` • Hẹn ${formatDate(order.expected_date)}`}
                          {order.labs?.name && ` • ${order.labs.name}`}
                        </p>
                      )}

                      {/* Detail Badges (Visible when expanded) */}
                      {expanded && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={labPay.variant} className="text-micro">
                            {labPay.label}
                          </Badge>
                          {order.labs?.name && (
                            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-micro font-medium text-text-muted">
                              Lab: {order.labs.name}
                            </span>
                          )}
                          {order.expected_date && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-bg-hover px-2 py-0.5 text-micro font-medium text-text-muted">
                              <Calendar size={10} />
                              {formatDate(order.expected_date)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <StatusSelect
                          current={order.status || "cho_xu_ly"}
                          options={[...PRINT_ORDER_STATUS_OPTIONS]}
                          variant="compact"
                          onUpdate={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                        />
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-bg-hover">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDABLE CONTENT */}
                  {expanded && (
                    <div className="border-t border-border/50 p-3.5 pt-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-micro font-bold uppercase tracking-wide text-text-muted">Danh sách sản phẩm</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyForLab(order)}
                          className="h-auto px-2 py-1 text-micro font-medium text-interactive hover:bg-interactive-light"
                        >
                          <Copy size={12} className="mr-1" /> Copy gửi Lab
                        </Button>
                      </div>
                      
                      <div className="rounded-lg border border-border/40 bg-bg-hover/30 p-2.5">
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((item, index) => (
                              <div key={`${item.item_id || item.name}-${index}`} className="flex items-start justify-between gap-3 text-caption">
                                <div className="flex min-w-0 items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted/40" />
                                  <div className="min-w-0 leading-tight">
                                    <span className="text-text-primary break-words font-medium">
                                      {item.name || "Sản phẩm không tên"}
                                    </span>
                                    <span className="ml-1.5 inline-block text-text-muted">
                                      SL: {item.quantity || 1}
                                    </span>
                                  </div>
                                </div>
                                <span className="shrink-0 tabular-nums text-text-muted">
                                  {formatVnd((item.quantity || 1) * (item.unitPrice || 0))}đ
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-caption italic text-text-muted">
                            Đơn chưa cập nhật chi tiết sản phẩm.
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          {editingFile === order.id ? (
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                              <Input
                                value={fileInput}
                                onChange={(event) => setFileInput(event.target.value)}
                                placeholder="Dán link file in (https://...)"
                                className="h-8 min-w-[240px] text-caption"
                                autoFocus
                              />
                              <div className="flex items-center gap-1.5">
                                <Button type="button" size="sm" onClick={() => saveFileUrl(order.id)} className="!px-2.5 !py-1 text-caption">
                                  Lưu
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFile(null)} className="!px-2.5 !py-1 text-caption">
                                  Hủy
                                </Button>
                              </div>
                            </div>
                          ) : order.print_file_url ? (
                            <div className="flex min-w-0 items-center gap-2 text-caption">
                              <a
                                href={order.print_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-w-0 items-center gap-1 rounded-full bg-interactive-light px-2.5 py-1 font-semibold text-interactive hover:underline"
                              >
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate">File in</span>
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditFile(order)}
                                className="h-7 w-7 rounded-full p-0 text-text-muted hover:bg-bg-hover hover:text-interactive"
                                aria-label="Sửa link file"
                              >
                                <Pencil size={12} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditFile(order)}
                              className="flex h-auto items-center gap-1 rounded-full px-2.5 py-1 text-micro font-semibold text-warning-dark bg-warning-light hover:bg-warning-light/80"
                            >
                              <AlertCircle size={12} />
                              Cập nhật file in
                            </Button>
                          )}
                        </div>

                        {typeof order.total_amount === "number" && order.total_amount > 0 && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-hover/50 px-3 py-1.5 sm:block sm:bg-transparent sm:p-0 sm:text-right">
                            <span className="text-micro font-bold uppercase tracking-wide text-text-muted sm:hidden">Tổng tiền</span>
                            <span className="block text-body-sm font-bold tabular-nums text-text-primary sm:text-body-md">{formatVnd(order.total_amount)}đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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

    </div>
  );
}
