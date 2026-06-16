"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Plus, Trash2, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { Textarea } from "@/components/ui/textarea";
import { Drawer } from "@/components/ui/drawer";
import { getContractOptions } from "@/app/actions/printing-reference-queries";
import {
  createPrintingOrder,
  deletePrintingOrder,
  updatePrintingOrder,
} from "@/app/actions/printing-mutations";
import {
  invalidateContractAfterWrite,
  invalidatePrintingAfterWrite,
} from "@/lib/cache-invalidation";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/lib/toast-utils";
import { Badge } from "@/components/ui/badge";
import { PRINTING_STATUS_LABELS, PRINTING_STATUS_VARIANTS } from "@/types/printing-constants";
import { DepositPaymentModal } from "@/components/printing/deposit-payment-modal";
import { FinalPaymentModal } from "@/components/printing/final-payment-modal";
import { CancelOrderModal } from "@/components/printing/cancel-order-modal";
import { LabPaymentModal } from "@/components/printing/labs/lab-payment-modal";
import { PaymentHistorySection } from "@/components/printing/payment-history-section";
import {
  startProduction,
  completeProduction,
} from "@/app/actions/printing-workflow-mutations";
import { getOrderPaymentSummary } from "@/app/actions/printing-queries";
import { fetchInventoryPickerItems } from "@/app/actions/inventory-queries";
import type {
  ContractOption,
  LabOption,
  PrintingItem,
  PrintingOrderRow,
} from "@/types/printing";
import type { InventoryItem } from "@/types/inventory";
import type { PrintingOrderStatus } from "@/types/printing-constants";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: PrintingOrderRow | null;
  labs: LabOption[];
  onSaved: () => Promise<void> | void;
  onStatusChange?: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}

interface NextStepAction {
  label: string;
  nextStatus: PrintingOrderStatus;
  action?: "deposit" | "start_production" | "complete_production" | "mark_delivered" | "final_payment" | "default";
}

function getNextStepAction(status: PrintingOrderStatus): NextStepAction | null {
  switch (status) {
    case "cho_xu_ly":
      return { label: "Thu đặt cọc", nextStatus: "dat_coc" as PrintingOrderStatus, action: "deposit" };
    case "dat_coc":
      return { label: "Bắt đầu in", nextStatus: "dang_in", action: "start_production" };
    case "dang_in":
      return { label: "Hoàn thành in", nextStatus: "da_in", action: "complete_production" };
    case "da_in":
      return { label: "Đã giao khách", nextStatus: "da_giao" as PrintingOrderStatus, action: "mark_delivered" };
    case "da_giao":
      return { label: "Thu tất toán", nextStatus: "hoan_thanh" as PrintingOrderStatus, action: "final_payment" };
    case "da_nhan":
      return null;
    default:
      return null;
  }
}

interface EditablePrintingItem extends PrintingItem {
  tempId: string;
}

interface FormState {
  contractId: string;
  labId: string;
  expectedDate: string;
  notes: string;
  items: EditablePrintingItem[];
}

const NO_INVENTORY_LINK = "__none__";

function buildTempId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyItem(): EditablePrintingItem {
  return {
    tempId: buildTempId(),
    name: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function getInitialForm(order: PrintingOrderRow | null): FormState {
  return {
    contractId: order?.contractId || "",
    labId: order?.labId || "",
    expectedDate: order?.expectedDate || "",
    notes: order?.notes || "",
    items:
      order?.items.map((item) => ({
        ...item,
        tempId: buildTempId(),
      })) ?? [createEmptyItem()],
  };
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export default function PrintingDetailDrawer({
  isOpen,
  onClose,
  order,
  labs,
  onSaved,
  onStatusChange,
}: Props) {
  const [form, setForm] = useState<FormState>(() => getInitialForm(order));
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showFinalPaymentModal, setShowFinalPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLabPaymentModal, setShowLabPaymentModal] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<{ remaining: number } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [contractSearch, setContractSearch] = useState("");
  const debouncedContractSearch = useDebounce(contractSearch, 300);

  const [prevReset, setPrevReset] = useState<{ open: boolean; order: typeof order } | null>(null);
  if (!prevReset || prevReset.open !== isOpen || prevReset.order !== order) {
    setPrevReset({ open: isOpen, order });
    if (isOpen) {
      setForm(getInitialForm(order));
      setContractSearch(order ? `${order.contractCode} - ${order.customerName}` : "");
      setConfirmDeleteOpen(false);
      setShowDepositModal(false);
      setShowFinalPaymentModal(false);
      setShowCancelModal(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    if (order) {
      getOrderPaymentSummary(order.id)
        .then((result) => {
          if (result.success) {
            setPaymentSummary({ remaining: result.data.remaining });
          }
        })
        .catch(() => {});
    }

    fetchInventoryPickerItems({ activeOnly: true, limit: 100 })
      .then((result) => {
        setInventoryItems(result.items);
      })
      .catch(() => {});
  }, [isOpen, order]);

  const { data: contractOptionsResult } = useSWR<ActionResult<ContractOption[]>>(
    isOpen && !order ? ["printing-contract-options", debouncedContractSearch] : null,
    () => getContractOptions(debouncedContractSearch || undefined),
    { keepPreviousData: true },
  );

  const contractOptions = useMemo(() => {
    if (order) {
      return order.contractId
        ? [
            {
              id: order.contractId,
              contract_code: order.contractCode,
              customer_name: order.customerName,
            },
          ]
        : [];
    }

    if (contractOptionsResult?.success) {
      return contractOptionsResult.data;
    }

    return [];
  }, [contractOptionsResult, order]);

  const labOptions = labs.map((lab) => ({
    value: lab.id,
    label: lab.lab_name,
  }));

  const totalAmount = useMemo(
    () =>
      form.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [form.items],
  );

  const updateItem = (
    tempId: string,
    field: keyof PrintingItem,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const removeItem = (tempId: string) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((item) => item.tempId !== tempId)
          : prev.items,
    }));
  };

  const handleSubmit = async () => {
    const validItems = form.items
      .map((item) => ({
        item_id: item.item_id || undefined,
        name: item.name.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      .filter((item) => item.name);

    if (!order && !form.contractId) {
      toast("Vui lòng chọn hợp đồng", "warning");
      return;
    }

    if (validItems.length === 0) {
      toast("Cần ít nhất 1 sản phẩm in", "warning");
      return;
    }

    const isEdit = !!order;
    const orderId = order?.id;
    const orderUpdatedAt = order?.updatedAt || undefined;
    const orderContractId = order?.contractId;
    const formContractId = form.contractId;
    const updatePayload = {
      labId: form.labId || null,
      expectedDate: form.expectedDate || null,
      notes: form.notes.trim() || null,
      items: validItems,
    };
    const createPayload = {
      contractId: form.contractId,
      labId: form.labId || null,
      expectedDate: form.expectedDate || null,
      notes: form.notes.trim() || null,
      items: validItems,
    };

    setLoading(true);
    onClose();
    try {
      if (isEdit && orderId) {
        const result = await updatePrintingOrder(orderId, updatePayload, orderUpdatedAt);
        if (!result.success) throw new Error(result.error);
        toast("Cập nhật đơn in thành công", "success");
      } else {
        const result = await createPrintingOrder(createPayload);
        if (!result.success) throw new Error(result.error);
        toast("Tạo đơn in thành công", "success");
      }

      await Promise.all([
        Promise.resolve(onSaved()),
        invalidatePrintingAfterWrite(orderId),
        orderContractId || formContractId
          ? invalidateContractAfterWrite(orderContractId || formContractId)
          : Promise.resolve(),
      ]);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể lưu đơn in",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const nextStepAction = order ? getNextStepAction(order.status) : null;

  const handleNextStep = async () => {
    if (!order || !nextStepAction) return;

    switch (nextStepAction.action) {
      case "deposit":
        setShowDepositModal(true);
        break;
      case "start_production":
        setLoading(true);
        try {
          await startProduction({ orderId: order.id });
          toast("Đã bắt đầu in và reserve vật tư", "success");
          await onSaved();
        } catch (error: any) {
          toast(error.message || "Lỗi bắt đầu in", "error");
        } finally {
          setLoading(false);
        }
        break;
      case "complete_production":
        setLoading(true);
        try {
          await completeProduction({ orderId: order.id });
          toast("Hoàn thành in, đã xuất kho", "success");
          await onSaved();
        } catch (error: any) {
          toast(error.message || "Lỗi hoàn thành in", "error");
        } finally {
          setLoading(false);
        }
        break;
      case "final_payment":
        setShowFinalPaymentModal(true);
        break;
      case "mark_delivered":
      case "default":
        if (onStatusChange) {
          setLoading(true);
          try {
            await onStatusChange(order, nextStepAction.nextStatus);
          } catch (error) {
            toast(
              error instanceof Error ? error.message : "Lỗi cập nhật trạng thái",
              "error",
            );
          } finally {
            setLoading(false);
          }
        }
        break;
    }
  };

  const handleDelete = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const result = await deletePrintingOrder(order.id);
      if (!result.success) throw new Error(result.error);

      toast("Đã xóa đơn in", "success");
      await Promise.all([
        Promise.resolve(onSaved()),
        invalidatePrintingAfterWrite(order.id),
        order.contractId ? invalidateContractAfterWrite(order.contractId) : Promise.resolve(),
      ]);
      onClose();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể xóa đơn in",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cố ý tắt header gốc của Drawer bằng hideHeader và custom UI */}
      <Drawer isOpen={isOpen} onClose={onClose}>
        {/* Force custom wrapper vì Drawer của shadcn sẽ append header */}
        <div className="flex min-h-full flex-col pb-28 pt-1" style={{ marginTop: "-48px" }}>
          
          <div className="mb-5 flex items-start justify-between border-b border-border/60 pb-4 pt-10">
            <div className="min-w-0 pr-4">
              <h2 className="mb-1.5 flex flex-wrap items-center gap-2 text-xl font-semibold text-text-main">
                {order ? "Chi tiết lệnh in" : "Tạo đơn in mới"}
                {order && (
                  <Badge variant={PRINTING_STATUS_VARIANTS[order.status]} className="shrink-0 text-[11px] font-bold uppercase tracking-wide shadow-sm">
                    {PRINTING_STATUS_LABELS[order.status]}
                  </Badge>
                )}
              </h2>
              {order && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span className="flex items-center gap-1.5 font-semibold text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {order.orderCode}
                  </span>
                  <span className="text-border">•</span>
                  <span>{order.contractCode}</span>
                  <span className="text-border">•</span>
                  <span className="font-medium text-text-secondary">{order.customerName}</span>
                </p>
              )}
            </div>
            <Button
              unstyled
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-main"
              aria-label="Đóng"
            >
              <X className="size-[18px]" />
            </Button>
          </div>

          <div className="flex-1 space-y-6">
            {!order && (
              <div>
                <label className="label-base">Tìm hợp đồng</label>
                <Input
                  value={contractSearch}
                  onChange={(event) => setContractSearch(event.target.value)}
                  placeholder="Nhập mã hợp đồng hoặc tên khách"
                  className="w-full"
                />
              </div>
            )}

            <section className="rounded-2xl border border-border/70 bg-white p-5 shadow-[0_8px_28px_-18px_rgba(61,43,31,0.45)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-text-main">
                  <span className="h-4 w-1 rounded-full bg-primary/35" />
                  Thông tin điều phối
                </h3>
              </div>

              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <SelectForm
                  label="Hợp đồng"
                  value={form.contractId}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, contractId: value }))
                  }
                  options={contractOptions.map((contract) => ({
                    value: contract.id,
                    label: `${contract.contract_code} - ${contract.customer_name}`,
                  }))}
                  placeholder="Chọn hợp đồng"
                  disabled={!!order}
                />

                <div className="space-y-2">
                  <SelectForm
                    label="Lab"
                    value={form.labId}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, labId: value }))
                    }
                    options={labOptions}
                    placeholder="Chọn lab"
                  />
                  <Button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, labId: "" }))}
                    variant="ghost"
                    size="sm"
                    className="min-h-0 px-0 py-0 text-xs font-semibold text-text-secondary hover:text-text-main"
                  >
                    Bỏ chọn lab
                  </Button>
                </div>

                <DatePicker
                  label="Ngày dự kiến nhận"
                  value={form.expectedDate}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, expectedDate: value }))
                  }
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-text-main">
                  <span className="h-4 w-1 rounded-full bg-primary/35" />
                  Danh sách hạng mục
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addItem}
                  className="font-semibold text-text-secondary hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="mr-1.5 size-4" />
                  Thêm hạng mục
                </Button>
              </div>

              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div
                    key={item.tempId}
                    className="group relative space-y-4 rounded-2xl border border-border/70 bg-white p-5 shadow-[0_8px_28px_-20px_rgba(61,43,31,0.45)] transition-all hover:border-primary/25 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-main">
                         <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eee6dc] text-xs font-bold text-text-secondary">
                          {index + 1}
                        </span>
                        <span className="truncate">{item.name || "Hạng mục mới"}</span>
                      </h4>
                      <div className="flex shrink-0 items-center gap-2">
                         <span className="whitespace-nowrap font-bold text-primary">
                          {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                        </span>
                        {form.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.tempId)}
                            className="min-h-0 px-2 py-2 text-text-muted opacity-100 hover:bg-error/10 hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label="Xóa hạng mục"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                     <div className="grid gap-4">
                       <div className="space-y-4">
                        <SelectForm
                          label="Liên kết vật tư (tùy chọn)"
                          value={item.item_id || NO_INVENTORY_LINK}
                          onChange={(value) => {
                            const itemId = value === NO_INVENTORY_LINK ? "" : value;
                            updateItem(item.tempId, "item_id", itemId);
                            if (itemId) {
                              const selected = inventoryItems.find((i) => i.id === itemId);
                              if (selected && !item.name) {
                                updateItem(item.tempId, "name", selected.name);
                              }
                            }
                          }}
                          options={[
                            { value: NO_INVENTORY_LINK, label: "-- Không liên kết --" },
                            ...inventoryItems.map((i) => ({
                              value: i.id,
                              label: `${i.item_code} - ${i.name}`,
                            })),
                          ]}
                          placeholder="Chọn vật tư để liên kết"
                        />
                        <Input
                          label="Tên sản phẩm"
                          value={item.name}
                          onChange={(event) => updateItem(item.tempId, "name", event.target.value)}
                          placeholder="Ví dụ: Album 20x30"
                          className="w-full"
                        />
                      </div>

                       <div className="grid grid-cols-[1fr_1.15fr] gap-3">
                        <Input
                          label="Số lượng"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              item.tempId,
                              "quantity",
                              Number(event.target.value || 1),
                            )
                          }
                          className="w-full"
                        />
                        <CurrencyInput
                          label="Đơn giá"
                          value={item.unitPrice}
                          onChange={(value) => updateItem(item.tempId, "unitPrice", value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div>
              <label className="mb-1.5 block px-1 text-sm font-semibold text-text-main">Ghi chú thêm</label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={2}
                placeholder="Yêu cầu riêng, thông báo cho lab..."
                className="w-full resize-none bg-white"
              />
            </div>

            {order && (
              <div className="border-t border-border pt-5">
                <PaymentHistorySection orderId={order.id} />
              </div>
            )}
          </div>

          <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 border-t border-border bg-bg-base/95 px-6 py-4 shadow-[0_-8px_28px_-18px_rgba(61,43,31,0.35)] backdrop-blur-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-[0_8px_28px_-18px_rgba(61,43,31,0.45)]">
                <div>
                  <p className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-text-muted">
                    Tổng chi phí tạm tính
                  </p>
                  <p className="mt-1 text-2xl font-bold leading-tight text-text-main">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                {paymentSummary && paymentSummary.remaining > 0 && (
                  <div className="rounded-2xl bg-warning/10 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-warning">Còn lại</p>
                    <p className="text-sm font-bold text-warning">{formatCurrency(paymentSummary.remaining)}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {order ? (
                    <>
                        <Button
                          onClick={() => setConfirmDeleteOpen(true)}
                          variant="ghost"
                          disabled={loading}
                          className="shrink-0 whitespace-nowrap font-semibold text-text-main hover:bg-error/10 hover:text-error"
                        >
                        <Trash2 className="mr-1.5 size-4" />
                        Xóa
                      </Button>
                      {order.status !== "hoan_thanh" && order.status !== "huy_don" && (
                        <Button
                          onClick={() => setShowCancelModal(true)}
                          variant="ghost"
                          disabled={loading}
                          className="shrink-0 whitespace-nowrap font-semibold text-text-main hover:bg-warning/10 hover:text-warning"
                        >
                          Hủy đơn
                        </Button>
                      )}
                      {order.labId && (
                        <Button
                          onClick={() => setShowLabPaymentModal(true)}
                          variant="ghost"
                          disabled={loading}
                          className="shrink-0 whitespace-nowrap gap-2 font-semibold text-text-main hover:bg-primary/10 hover:text-primary"
                        >
                          <WalletCards className="size-4" />
                          Thanh toán lab
                        </Button>
                      )}
                    </>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button onClick={onClose} variant="ghost" disabled={loading} className="shrink-0 whitespace-nowrap font-semibold text-text-secondary">
                    Đóng
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    loading={loading}
                    variant={nextStepAction && onStatusChange ? "outline" : "primary"}
                    className={nextStepAction && onStatusChange ? "shrink-0 whitespace-nowrap border-primary/25 font-semibold text-primary hover:bg-primary/10" : "shrink-0 whitespace-nowrap font-semibold"}
                  >
                    {loading ? "Đang xử lý..." : order ? "Lưu thay đổi" : "Tạo đơn in"}
                  </Button>
                  {nextStepAction && onStatusChange && (
                    <Button
                      onClick={handleNextStep}
                      loading={loading}
                      className="shrink-0 whitespace-nowrap gap-2 px-5 shadow-sm"
                    >
                      {nextStepAction.label}
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa đơn in"
        message={`Bạn chắc chắn muốn xóa "${order?.orderCode || ""}"?`}
        confirmLabel="Xóa"
        cancelLabel="Đóng"
        variant="danger"
      />

      {order && (
        <>
          <DepositPaymentModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            order={order}
            onSuccess={async () => {
              await onSaved();
              const result = await getOrderPaymentSummary(order.id);
              if (result.success) {
                setPaymentSummary({ remaining: result.data.remaining });
              }
            }}
          />

          <FinalPaymentModal
            isOpen={showFinalPaymentModal}
            onClose={() => setShowFinalPaymentModal(false)}
            order={order}
            remainingAmount={paymentSummary?.remaining ?? order.remainingAmount ?? 0}
            onSuccess={async () => {
              await onSaved();
              const result = await getOrderPaymentSummary(order.id);
              if (result.success) {
                setPaymentSummary({ remaining: result.data.remaining });
              }
            }}
          />

          <CancelOrderModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            order={order}
            onSuccess={onSaved}
          />

          <LabPaymentModal
            isOpen={showLabPaymentModal}
            onClose={() => setShowLabPaymentModal(false)}
            labId={order.labId || undefined}
            labName={labs.find((lab) => lab.id === order.labId)?.lab_name}
            onSuccess={onSaved}
          />
        </>
      )}
    </>
  );
}
