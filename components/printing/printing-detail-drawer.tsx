"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Plus, Trash2, WalletCards } from "lucide-react";
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
  recordDepositPayment,
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
  action?: 'deposit' | 'start_production' | 'complete_production' | 'mark_delivered' | 'final_payment' | 'default';
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
    case "da_nhan": // Legacy status
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
  return `${new Intl.NumberFormat("vi-VN").format(value)}d`;
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

  useEffect(() => {
    if (!isOpen) return;
    setForm(getInitialForm(order));
    setContractSearch(order ? `${order.contractCode} - ${order.customerName}` : "");
    setConfirmDeleteOpen(false);
    setShowDepositModal(false);
    setShowFinalPaymentModal(false);
    setShowCancelModal(false);

    // Fetch payment summary for order
    if (order) {
      getOrderPaymentSummary(order.id)
        .then((result) => {
          if (result.success) {
            setPaymentSummary({ remaining: result.data.remaining });
          }
        })
        .catch(() => {
          // Silently fail, not critical
        });
    }

    // Fetch inventory items for linking
    fetchInventoryPickerItems({ activeOnly: true, limit: 100 })
      .then((result) => {
        setInventoryItems(result.items);
      })
      .catch(() => {
        // Silently fail, not critical
      });
  }, [isOpen, order]);

  const selectableLabs = labs;

  const { data: contractOptionsResult } = useSWR<ActionResult<ContractOption[]>>(
    isOpen && !order ? ["printing-contract-options", debouncedContractSearch] : null,
    () => getContractOptions(debouncedContractSearch || undefined),
    { keepPreviousData: true },
  );

  const contractOptions = useMemo(() => {
    if (order) {
      return [
        {
          id: order.contractId || "",
          contract_code: order.contractCode,
          customer_name: order.customerName,
        },
      ];
    }

    if (contractOptionsResult?.success) {
      return contractOptionsResult.data;
    }

    return [];
  }, [contractOptionsResult, order]);

  const labOptions = selectableLabs.map((lab) => ({
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
        item_id: item.item_id || undefined,  // Include item_id if set (for inventory linking)
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

    // Đóng drawer NGAY (close + revalidate) — order_code/totals/tồn kho do RPC server tính → không patch.
    setLoading(true);
    onClose();
    try {
      if (isEdit && orderId) {
        const result = await updatePrintingOrder(orderId, updatePayload, orderUpdatedAt);

        if (!result.success) {
          throw new Error(result.error);
        }

        toast("Cập nhật đơn in thành công", "success");
      } else {
        const result = await createPrintingOrder(createPayload);

        if (!result.success) {
          throw new Error(result.error);
        }

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

    // Handle different actions based on the action type
    switch (nextStepAction.action) {
      case "deposit":
        // Open deposit modal
        setShowDepositModal(true);
        break;

      case "start_production":
        // Reserve inventory
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
        // Stock out inventory
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
        // Open final payment modal
        setShowFinalPaymentModal(true);
        break;

      case "mark_delivered":
      case "default":
        // Use onStatusChange callback for other status changes
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
      if (!result.success) {
        throw new Error(result.error);
      }

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
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={order ? `Chi tiết lệnh in` : "Tạo đơn in mới"}
        titleBadge={
          order ? (
            <Badge variant={PRINTING_STATUS_VARIANTS[order.status]}>
              {PRINTING_STATUS_LABELS[order.status]}
            </Badge>
          ) : undefined
        }
      >
        <div className="flex flex-col min-h-full">
          <div className="flex-1 space-y-5">
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

            {order && (
              <div className="p-4 bg-bg-hover rounded-xl mb-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Mã lệnh in</p>
                  <p className="text-h3">{order.orderCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Khách hàng</p>
                  <p className="font-medium text-text-main">{order.customerName}</p>
                </div>
              </div>
            )}

            <div className="form-grid-2col">
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
                  className="text-xs text-text-muted hover:text-text-main px-0!"
                >
                  Bỏ chọn lab
                </Button>
              </div>
            </div>

            <div className="form-grid-2col">
              <DatePicker
                value={form.expectedDate}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, expectedDate: value }))
                }
                label="Ngày dự kiến nhận"
              />

              <div className="rounded-xl bg-bg-hover p-4 flex items-end">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Tổng chi phí tạm tính
                  </p>
                  <p className="text-h2 text-text-main">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mt-4 border-t border-border pt-5">
                <h4 className="section-heading">Hạng mục in</h4>
                <Button onClick={addItem} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Thêm hạng mục</span>
                </Button>
              </div>

              {form.items.map((item, index) => (
                <div key={item.tempId} className="rounded-xl bg-bg-hover shadow-sm p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-main">
                      Hạng mục {index + 1}
                    </p>
                    {form.items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        variant="ghost"
                        className="icon-btn rounded-md text-error"
                        aria-label="Xóa hạng mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="border-t border-border/50 pt-3 space-y-3">
                    {/* Optional inventory item link */}
                    <SelectForm
                      label="Liên kết vật tư (tùy chọn)"
                      value={item.item_id || ""}
                      onChange={(value) => {
                        updateItem(item.tempId, "item_id", value || "");
                        // Auto-fill name from selected item
                        if (value) {
                          const selected = inventoryItems.find((i) => i.id === value);
                          if (selected && !item.name) {
                            updateItem(item.tempId, "name", selected.name);
                          }
                        }
                      }}
                      options={[
                        { value: "", label: "-- Không liên kết --" },
                        ...inventoryItems.map((i) => ({
                          value: i.id,
                          label: `${i.item_code} - ${i.name}`,
                        })),
                      ]}
                      placeholder="Chọn vật tư để liên kết"
                    />

                    <div>
                      <label className="label-base">Tên sản phẩm</label>
                      <Input
                        value={item.name}
                        onChange={(event) =>
                          updateItem(item.tempId, "name", event.target.value)
                        }
                        placeholder="Ví dụ: Album 20x30"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2col">
                    <div>
                      <label className="label-base">Số lượng</label>
                      <Input
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
                    </div>
                    <CurrencyInput
                      label="Đơn giá"
                      value={item.unitPrice}
                      onChange={(value) =>
                        updateItem(item.tempId, "unitPrice", value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-5">
              <label className="label-base">Ghi chú thêm</label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                placeholder="Thông tin bổ sung cho đơn in"
                className="w-full resize-none"
              />
            </div>

            {/* Payment History Section - Only show for existing orders */}
            {order && (
              <div className="border-t border-border pt-5">
                <PaymentHistorySection orderId={order.id} />
              </div>
            )}
          </div>

          <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
            {order ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setConfirmDeleteOpen(true)}
                  variant="danger"
                  disabled={loading}
                >
                  Xóa
                </Button>
                {order.status !== "hoan_thanh" && order.status !== "huy_don" && (
                  <Button
                    onClick={() => setShowCancelModal(true)}
                    variant="outline"
                    disabled={loading}
                    className="text-warning border-warning hover:bg-warning/10"
                  >
                    Hủy đơn
                  </Button>
                )}
                {order.labId && (
                  <Button
                    onClick={() => setShowLabPaymentModal(true)}
                    variant="outline"
                    disabled={loading}
                    className="gap-2"
                  >
                    <WalletCards className="w-4 h-4" />
                    Thanh toán lab
                  </Button>
                )}
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button onClick={onClose} variant="ghost" disabled={loading}>
                Đóng
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                variant={nextStepAction && onStatusChange ? "outline" : "primary"}
              >
                {loading ? "Đang xử lý..." : order ? "Lưu thay đổi" : "Tạo đơn in"}
              </Button>
              {nextStepAction && onStatusChange && (
                <Button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="gap-2"
                >
                  {nextStepAction.label}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
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
      />

      {order && (
        <>
          <DepositPaymentModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            order={order}
            onSuccess={async () => {
              await onSaved();
              setShowDepositModal(false);
            }}
          />

          <FinalPaymentModal
            isOpen={showFinalPaymentModal}
            onClose={() => setShowFinalPaymentModal(false)}
            order={order}
            remainingAmount={paymentSummary?.remaining || 0}
            onSuccess={async () => {
              await onSaved();
              setShowFinalPaymentModal(false);
            }}
          />

          <CancelOrderModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            order={order}
            onSuccess={async () => {
              await onSaved();
              setShowCancelModal(false);
              onClose(); // Close the drawer after cancelling
            }}
          />

          {order.labId && (
            <LabPaymentModal
              isOpen={showLabPaymentModal}
              onClose={() => setShowLabPaymentModal(false)}
              labId={order.labId}
              labName={order.labName || undefined}
              onSuccess={async () => {
                await onSaved();
                setShowLabPaymentModal(false);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
