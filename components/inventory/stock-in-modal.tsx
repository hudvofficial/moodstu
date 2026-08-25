"use client";

/**
 * 📥 StockInModal — Nhập kho vật tư
 * Uses: UnifiedModal + CurrencyInput
 * Action: stockIn() → updates current_stock + average_unit_price
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select/SelectForm";
import DatePicker from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "@/hooks/use-debounce";
import { invalidateFinanceAfterWrite, invalidateInventoryAfterWrite } from "@/lib/cache-invalidation";
import { stockIn } from "@/app/actions/inventory-mutations";
import { fetchInventoryPickerItems } from "@/app/actions/inventory-queries";
import { getSupplierOptions } from "@/app/actions/vendor-actions";
import type { InventoryItem } from "@/types/inventory";

const KEEP_ITEM_SUPPLIER = "__item__";
const PAYMENT_METHOD_OPTIONS = [
  { value: "chuyen_khoan", label: "Chuyển khoản" },
  { value: "tien_mat", label: "Tiền mặt" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  items?: InventoryItem[];
}

export function StockInModal({ isOpen, onClose, item, items }: StockInModalProps) {
  const [isPending, startTransition] = useTransition();
  const [pickedItem, setPickedItem] = useState<InventoryItem | null>(null);
  const activeItem = item || pickedItem;

  const [quantityInput, setQuantityInput] = useState("");
  const [unitCost, setUnitCost] = useState(item?.purchase_price || 0);
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  // ADR-016: phôi nhập về trả ngay (user chốt 25/08) → mặc định "Đã trả", RPC tạo phiếu chi cho NCC
  const [supplierId, setSupplierId] = useState<string>(KEEP_ITEM_SUPPLIER);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; full_name: string }[]>([]);
  const [paid, setPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("chuyen_khoan");
  const [paidDate, setPaidDate] = useState(todayIso());
  const [pickerItems, setPickerItems] = useState<InventoryItem[]>(items || []);
  const [pickerSearch, setPickerSearch] = useState("");
  const debouncedPickerSearch = useDebounce(pickerSearch, 300);
  const quantity = Number(quantityInput);
  const isQuantityValid =
    quantityInput.trim() !== "" && Number.isInteger(quantity) && quantity >= 1;

  const resetForm = () => {
    setQuantityInput("");
    setUnitCost(item?.purchase_price || 0);
    setSupplier(item?.supplier || "");
    setReason("");
    setNotes("");
    setError("");
    setPickedItem(null);
    setPickerSearch("");
    setSupplierId(KEEP_ITEM_SUPPLIER);
    setPaid(true);
    setPaymentMethod("chuyen_khoan");
    setPaidDate(todayIso());
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getSupplierOptions()
      .then((result) => {
        if (cancelled) return;
        if (result && "success" in result && result.success) setSupplierOptions(result.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen || item) return;
    let cancelled = false;
    fetchInventoryPickerItems({
      search: debouncedPickerSearch,
      limit: 30,
      activeOnly: true,
    })
      .then((data) => {
        if (!cancelled) setPickerItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải vật tư");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPickerSearch, isOpen, item, items]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!activeItem) return;
    if (activeItem.status !== "active") {
      setError("Vật tư đã ngưng, không thể nhập kho");
      return;
    }
    if (!isQuantityValid) { setError("Số lượng phải ≥ 1"); return; }
    if (paid && quantity * unitCost > 0 && supplierId === KEEP_ITEM_SUPPLIER && !activeItem.supplier_id) {
      setError("Đã trả tiền thì cần chọn nhà cung cấp để ghi phiếu chi");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await stockIn({
        itemId: activeItem.id,
        quantity,
        unitCost,
        supplier: supplier.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        supplierId: supplierId === KEEP_ITEM_SUPPLIER ? undefined : supplierId,
        paid,
        paymentMethod: paymentMethod as "tien_mat" | "chuyen_khoan",
        paidDate: paid ? paidDate : undefined,
      });

      if (result && "success" in result && result.success) {
        toast.success(
          paid && quantity * unitCost > 0
            ? `Đã nhập ${quantity} ${activeItem.name} vào kho và ghi phiếu chi ${(quantity * unitCost).toLocaleString("vi-VN")}đ`
            : `Đã nhập ${quantity} ${activeItem.name} vào kho`,
        );
        await invalidateInventoryAfterWrite(activeItem.id);
        if (paid) await invalidateFinanceAfterWrite();
        handleClose();
      } else {
        setError(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Không thể nhập kho",
        );
      }
    });
  };

  if (!isOpen) return null;

  // Item picker options
  const itemOptions = pickerItems.map(i => ({ value: i.id, label: `${i.item_code} — ${i.name}` }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nhập kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) — Tồn: ${activeItem.current_stock}` : "Chọn vật tư cần nhập kho"}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending || !activeItem || !isQuantityValid}>
            {isPending ? "Đang xử lý..." : "Xác nhận nhập kho"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        {/* Item Picker — chỉ hiện khi chưa có item */}
        {!activeItem && (
          <div>
            <ComboboxSearch
              label="Chọn vật tư *"
              onChange={(id) => {
                const found = pickerItems.find(i => i.id === id) || null;
                setPickedItem(found);
                if (found) {
                  setUnitCost(found.purchase_price || 0);
                  setSupplier(found.supplier || "");
                }
              }}
              onSearchChange={setPickerSearch}
              options={itemOptions}
              placeholder="Tìm và chọn vật tư..."
            />
          </div>
        )}

        {/* Form fields — chỉ hiện khi đã có item */}
        {activeItem && (
          <>
        <div className="form-grid-2col">
          <div>
            <label className="label-base">Số lượng *</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
            />
          </div>
          <div>
            <label className="label-base">Đơn giá nhập</label>
            <CurrencyInput value={unitCost} onChange={setUnitCost} />
          </div>
        </div>

        <div>
          <SelectForm
            label="Nhà cung cấp (đối tác)"
            value={supplierId}
            onChange={setSupplierId}
            options={[
              { value: KEEP_ITEM_SUPPLIER, label: activeItem.supplier_id ? "Giữ nhà cung cấp hiện tại của vật tư" : "-- Chưa gắn nhà cung cấp --" },
              ...supplierOptions.map((s) => ({ value: s.id, label: s.full_name })),
            ]}
            placeholder="Chọn nhà cung cấp"
          />
        </div>

        <div>
          <label className="label-base">Ghi chú nhà cung cấp (tên trên hoá đơn)</label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="VD: Xưởng thiệp cưới HD"
          />
        </div>

        {/* ADR-016: tiền phôi rời két lúc nhập → phiếu chi tạo cùng transaction */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-text-main cursor-pointer">
            <Checkbox checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Đã trả tiền nhà cung cấp — tự ghi phiếu chi {quantity > 0 && unitCost > 0 ? `${(quantity * unitCost).toLocaleString("vi-VN")}đ` : ""}
          </label>
          {paid && (
            <div className="form-grid-2col">
              <SelectForm
                label="Phương thức"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={PAYMENT_METHOD_OPTIONS}
              />
              <DatePicker
                label="Ngày trả"
                value={paidDate}
                onChange={setPaidDate}
                required
                placeholder="Chọn ngày trả"
              />
            </div>
          )}
        </div>

        <div>
          <label className="label-base">Lý do nhập</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Bổ sung hàng tháng 3"
          />
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <Textarea
            className="min-h-15"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thông tin thêm..."
          />
        </div>
          </>
        )}
      </form>
    </UnifiedModal>
  );
}
