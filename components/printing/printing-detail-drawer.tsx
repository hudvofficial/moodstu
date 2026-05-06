"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
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
import type {
  ContractOption,
  LabOption,
  PrintingItem,
  PrintingOrderRow,
} from "@/types/printing";
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
}

function getNextStepAction(status: PrintingOrderStatus): NextStepAction | null {
  const isReadyForLabReceive = (status as string) === "da_in";
  if (isReadyForLabReceive) {
    return { label: "Da nhan tu lab", nextStatus: "da_nhan" };
  }

  switch (status) {
    case "cho_xu_ly":
      return { label: "Bắt đầu in", nextStatus: "dang_in" };
    case "dang_in":
      return { label: "Hoàn thành in", nextStatus: "da_in" };
    case "da_in":
      return { label: "Đã giao khách", nextStatus: "da_nhan" };
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
  const [contractSearch, setContractSearch] = useState("");
  const debouncedContractSearch = useDebounce(contractSearch, 300);

  useEffect(() => {
    if (!isOpen) return;
    setForm(getInitialForm(order));
    setContractSearch(order ? `${order.contractCode} - ${order.customerName}` : "");
    setConfirmDeleteOpen(false);
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

    setLoading(true);
    try {
      if (order) {
        const result = await updatePrintingOrder(
          order.id,
          {
            labId: form.labId || null,
            expectedDate: form.expectedDate || null,
            notes: form.notes.trim() || null,
            items: validItems,
          },
          order.updatedAt || undefined,
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        toast("Cập nhật đơn in thành công", "success");
      } else {
        const result = await createPrintingOrder({
          contractId: form.contractId,
          labId: form.labId || null,
          expectedDate: form.expectedDate || null,
          notes: form.notes.trim() || null,
          items: validItems,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        toast("Tạo đơn in thành công", "success");
      }

      await Promise.all([
        Promise.resolve(onSaved()),
        invalidatePrintingAfterWrite(order?.id),
        order?.contractId || form.contractId
          ? invalidateContractAfterWrite(order?.contractId || form.contractId)
          : Promise.resolve(),
      ]);
      onClose();
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
    if (!order || !nextStepAction || !onStatusChange) return;
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
        width="650px"
        titleBadge={
          order ? (
            <Badge variant={
              order.status === "dang_in" ? "warning" :
              order.status === "da_in" ? "info" :
              order.status === "da_nhan" ? "success" : "neutral"
            }>
              {order.status === "cho_xu_ly" ? "Chờ xử lý" :
               order.status === "dang_in" ? "Đang in" :
               order.status === "da_in" ? "Đã in" :
               order.status === "da_nhan" ? "Đã nhận" : order.status}
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

                  <div className="border-t border-border/50 pt-3">
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
          </div>

          <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
            {order ? (
              <Button
                onClick={() => setConfirmDeleteOpen(true)}
                variant="danger"
                disabled={loading}
              >
                Xóa
              </Button>
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
    </>
  );
}
