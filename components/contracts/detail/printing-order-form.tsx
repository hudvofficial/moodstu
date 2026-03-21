"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { createPrintingOrder, getLabs } from "@/app/actions/printing-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";
import { SimpleSelect } from "@/components/ui/simple-select";
import DatePicker from "@/components/ui/date-picker";

// ═══════════════════════════════════════════
// Printing Order Form — V1 → V2
// Phase 05A: Labs via server action, NOT client Supabase
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractCode: string;
}

interface PrintItem {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

interface LabOption {
  id: string;
  lab_name: string;
}

const emptyItem = (): PrintItem => ({
  name: "",
  size: "",
  quantity: 1,
  unitPrice: 0,
});

export default function PrintingOrderForm({
  isOpen,
  onClose,
  contractId,
  contractCode,
}: Props) {
  const [labId, setLabId] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [items, setItems] = useState<PrintItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch labs on open
  useEffect(() => {
    if (!isOpen) return;
    getLabs().then((result) => {
      if (result.success && result.data) {
        setLabs(result.data as LabOption[]);
      }
    });
  }, [isOpen]);

  const updateItem = useCallback(
    (index: number, field: keyof PrintItem, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const resetForm = useCallback(() => {
    setLabId(null);
    setItems([emptyItem()]);
    setNotes("");
    setExpectedDate("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const validItems = items.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      toast("Vui lòng nhập ít nhất 1 sản phẩm", "warning");
      return;
    }

    setLoading(true);
    try {
      const result = await createPrintingOrder({
        contractId,
        labId,
        items: validItems,
        notes: notes.trim() || null,
        expectedDate: expectedDate || null,
      });

      if (result.success) {
        toast("Đã tạo đơn in thành công", "success");
        resetForm();
        onClose();
        await revalidateContractCaches(contractId);
      } else {
        toast(result.error || "Lỗi tạo đơn in", "error");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [items, contractId, labId, notes, expectedDate, resetForm, onClose]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={() => { resetForm(); onClose(); }}
      title="Tạo đơn in ảnh"
      description={contractCode}
    >
      <div className="space-y-4">
        {/* Lab selector */}
          <SimpleSelect
            value={labId || ""}
            onChange={(v) => setLabId(v || null)}
            options={labs.map((l) => ({ value: l.id, label: l.lab_name }))}
            label="Xưởng in"
            placeholder="Chọn lab"
          />

        {/* Expected date */}
        <div>
          <DatePicker
            value={expectedDate}
            onChange={(date) => setExpectedDate(date)}
            label="Ngày dự kiến nhận"
            placeholder="Chọn ngày"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-base">Sản phẩm in</label>
            <button onClick={addItem} className="btn btn-outline text-xs py-1 px-2">
              <Plus size={12} />
              Thêm
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_60px_60px_70px_32px] gap-2 items-center"
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder="Tên SP"
                  className="input-base text-sm"
                />
                <input
                  type="text"
                  value={item.size}
                  onChange={(e) => updateItem(i, "size", e.target.value)}
                  placeholder="Size"
                  className="input-base text-sm"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                  min={1}
                  className="input-base text-sm text-center"
                />
                <input
                  type="number"
                  value={item.unitPrice || ""}
                  onChange={(e) => updateItem(i, "unitPrice", parseInt(e.target.value) || 0)}
                  placeholder="Giá"
                  className="input-base text-sm"
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="btn-icon text-error"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalAmount > 0 && (
            <p className="text-right text-sm font-semibold mt-2 text-text-primary">
              Tổng: {new Intl.NumberFormat("vi-VN").format(totalAmount)}đ
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label-base mb-1 block">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú thêm..."
            rows={2}
            className="input-base w-full resize-none"
          />
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="btn btn-outline"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Tạo đơn in"}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
