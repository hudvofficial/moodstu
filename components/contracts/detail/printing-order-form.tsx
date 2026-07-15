"use client";

import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { ChevronDown, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import {
  createPrintingOrder,
  fetchLabServices,
  getLabs,
} from "@/app/actions/printing-actions";
import { invalidatePrintingAfterWrite } from "@/lib/cache-invalidation";
import { toastManager as toast } from "@/lib/toast-utils";
import { SimpleSelect } from "@/components/ui/simple-select";
import DatePicker from "@/components/ui/date-picker";
import type { LabService } from "@/types/printing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractCode: string;
  onSuccess?: () => void;
}

interface PrintItem {
  name: string;
  quantity: number | "";
  unitPrice: number;
}

interface LabOption {
  id: string;
  lab_name: string;
}

const emptyItem = (): PrintItem => ({
  name: "",
  quantity: "",
  unitPrice: 0,
});

const printingItemTableStyle = {
  "--printing-order-action-col": "var(--space-xl)",
  "--printing-order-money-col": "calc(var(--space-xl) * 3)",
  "--printing-order-qty-col": "calc(var(--space-xl) * 2)",
} as CSSProperties;

const printingItemGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) var(--printing-order-qty-col) var(--printing-order-money-col) var(--printing-order-action-col)",
} as CSSProperties;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export default function PrintingOrderForm({
  isOpen,
  onClose,
  contractId,
  contractCode,
  onSuccess,
}: Props) {
  const [labId, setLabId] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [labServices, setLabServices] = useState<LabService[]>([]);
  const [items, setItems] = useState<PrintItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");


  useEffect(() => {
    if (!isOpen) return;
    getLabs().then((result) => {
      if (result.success && result.data) {
        setLabs(result.data as LabOption[]);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!labId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLabServices([]);
      return;
    }

    fetchLabServices(labId).then((result) => {
      if (result.success && result.data) {
        setLabServices(result.data as LabService[]);
      }
    });
  }, [labId]);

  const updateItem = useCallback(
    (index: number, field: keyof PrintItem, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };

        if (field === "name") {
          const matchedService = labServices.find((service) => service.item_name === value);
          if (matchedService) {
            next[index].unitPrice = matchedService.cost_price;
          }
        }

        return next;
      });
    },
    [labServices],
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * item.unitPrice,
    0,
  );

  const resetForm = useCallback(() => {
    setLabId(null);
    setItems([emptyItem()]);
    setNotes("");
    setExpectedDate("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const validItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({ ...item, quantity: item.quantity === "" ? 1 : item.quantity }));
    if (validItems.length === 0) {
      toast.warning("Vui lòng nhập ít nhất 1 sản phẩm");
      return;
    }
    if (!labId) {
      toast.warning("Vui lòng chọn xưởng in");
      return;
    }

    // Đóng modal NGAY (close + revalidate) — order_code gen server, không đụng totals HĐ.
    const payload = {
      contractId,
      labId,
      items: validItems,
      notes: notes.trim() || null,
      expectedDate: expectedDate || null,
    };
    const toastId = "create-print-order";
    toast.loading("Đang tạo đơn in...", { id: toastId });
    resetForm();
    onClose();
    try {
      const result = await createPrintingOrder(payload);
      if (result.success) {
        toast.success("Đã tạo đơn in thành công", { id: toastId });
        onSuccess?.();
        void invalidatePrintingAfterWrite();
      } else {
        toast.error(result.error || "Lỗi tạo đơn in", { id: toastId });
      }
    } catch {
      toast.error("Có lỗi xảy ra", { id: toastId });
    }
  }, [items, contractId, labId, notes, expectedDate, resetForm, onClose, onSuccess]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Tạo đơn in ảnh"
      description={contractCode}
    >
      <div className="space-y-4">
        <div className="form-grid-2col">
          <SimpleSelect
            value={labId || ""}
            onChange={(value) => setLabId(value || null)}
            options={labs.map((lab) => ({ value: lab.id, label: lab.lab_name }))}
            label="Xưởng in"
            placeholder="Chọn lab"
          />

          <DatePicker
            value={expectedDate}
            onChange={(date) => setExpectedDate(date)}
            label="Ngày dự kiến nhận"
            placeholder="Chọn ngày"
          />
        </div>

        <div
          className="overflow-hidden rounded-lg border border-border bg-bg-card"
          style={printingItemTableStyle}
        >
          <div
            className="items-center gap-2 border-b border-border bg-bg-hover/50 px-3 py-2.5 text-caption font-bold uppercase tracking-widest text-text-muted"
            style={printingItemGridStyle}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span>Sản phẩm</span>
                <Button
                  type="button"
                  onClick={addItem}
                  unstyled
                  className="btn-icon h-6 w-6 min-w-6 rounded-full bg-primary/10 text-primary hover:bg-primary/15"
                  aria-label="Thêm sản phẩm"
                >
                  <PlusCircle size={16} />
                </Button>
              </div>
            </div>
            <span className="text-center">SL</span>
            <span className="text-right">Thành tiền</span>
            <span />
          </div>

          <div>
            {items.map((item, index) => {
              const lineTotal = (item.quantity || 0) * item.unitPrice;

              return (
                <div
                  key={index}
                  className="items-center gap-2 border-b border-border/40 px-3 py-2 last:border-b-0"
                  style={printingItemGridStyle}
                >
                  <div className="relative min-w-0">
                    <Input
                      unstyled
                      withBaseStyles={false}
                      value={item.name}
                      onChange={(event) => updateItem(index, "name", event.target.value)}
                      placeholder={labId ? "Tên sp..." : "Chọn lab trước"}
                      disabled={!labId}
                      className="input-base h-9 w-full pr-7 text-sm font-medium"
                      list={`lab-services-${index}`}
                    />
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <datalist id={`lab-services-${index}`}>
                      {labServices.map((service) => (
                        <option key={service.id} value={service.item_name}>
                          {formatCurrency(service.cost_price)}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <Input
                    unstyled
                    withBaseStyles={false}
                    type="number"
                    value={item.quantity === "" ? "" : String(item.quantity)}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        updateItem(index, "quantity", "");
                      } else {
                        const parsed = parseInt(raw);
                        if (!isNaN(parsed) && parsed >= 1) {
                          updateItem(index, "quantity", parsed);
                        }
                      }
                    }}
                    onBlur={(event) => {
                      if (event.target.value === "") {
                        updateItem(index, "quantity", 1);
                      }
                    }}
                    min={1}
                    placeholder="SL"
                    className="input-base h-9 w-full text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                  />

                  <div className="min-w-0 text-right text-body-sm font-semibold text-primary tabular-nums">
                    {lineTotal > 0 ? formatCurrency(lineTotal) : "0"}
                  </div>

                  <Button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    unstyled
                    className="btn-icon h-8 w-8 min-w-8 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                    aria-label="Xóa sản phẩm"
                  >
                    <X size={18} />
                  </Button>
                </div>
              );
            })}
          </div>

          {totalAmount > 0 && (
            <div className="border-t border-border bg-bg-hover/40 px-3 py-2 text-right text-sm font-semibold text-text-primary">
              Tổng: {formatCurrency(totalAmount)}đ
            </div>
          )}
        </div>

        <div>
          <label className="label-base mb-1 block">Ghi chú</label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ghi chú thêm..."
            rows={2}
            className="w-full resize-none"
          />
        </div>

        <div className="form-actions">
          <Button
            onClick={() => {
              resetForm();
              onClose();
            }}
            variant="outline"
          >
            Đóng
          </Button>
          <Button onClick={handleSubmit}>
            Tạo đơn in
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
