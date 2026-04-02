"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
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
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus size={12} />
              Thêm
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_60px_60px_70px_32px] gap-2 items-center"
              >
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder="Tên SP"
                  className="text-sm"
                />
                <Input
                  value={item.size}
                  onChange={(e) => updateItem(i, "size", e.target.value)}
                  placeholder="Size"
                  className="text-sm"
                />
                <Input
                  type="number"
                  value={String(item.quantity)}
                  onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                  min={1}
                  className="text-sm text-center"
                />
                <CurrencyInput
                  value={item.unitPrice}
                  onChange={(val) => updateItem(i, "unitPrice", val)}
                  placeholder="Giá"
                  className="text-sm"
                />
                {items.length > 1 && (
                  <Button
                    onClick={() => removeItem(i)}
                    variant="ghost"
                    size="sm"
                    className="text-error p-1"
                  >
                    <Trash2 size={14} />
                  </Button>
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
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú thêm..."
            rows={2}
            className="w-full resize-none"
          />
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Button
            onClick={() => { resetForm(); onClose(); }}
            variant="outline"
          >
            Đóng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Tạo đơn in"}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
