"use client";

/**
 * InventoryFormModal - Create / edit inventory item.
 * SSOT: UnifiedModal, input-base, label-base, form-grid-2col, error-text.
 */

import {
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invalidateInventoryAfterWrite } from "@/lib/cache-invalidation";
import { createInventoryItem, updateInventoryItem } from "@/app/actions/inventory-mutations";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { cacheKeys, patchListCache } from "@/lib/swr";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  type InventoryCategory,
  type InventoryUnit,
} from "@/lib/validations/inventory.schema";
import { INVENTORY_CATEGORY_MAP, INVENTORY_UNIT_MAP } from "@/types/inventory-constants";
import type { InventoryItem } from "@/types/inventory";

const UNIT_OPTIONS = INVENTORY_UNITS.map((value) => ({
  value,
  label: INVENTORY_UNIT_MAP[value] || value,
}));

const CATEGORY_ORDER: InventoryCategory[] = [
  "in_an",
  "album",
  "khung_anh",
  "makeup",
  "trang_tri",
  "hoa",
  "tieu_hao",
  "van_phong_pham",
  "khac",
];

const CATEGORY_OPTIONS = CATEGORY_ORDER
  .filter((value) => INVENTORY_CATEGORIES.includes(value))
  .map((value) => ({
  value,
  label: INVENTORY_CATEGORY_MAP[value]?.label || value,
}));

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: InventoryItem | null;
}

export function InventoryFormModal({ isOpen, onClose, editItem }: InventoryFormModalProps) {
  const isEdit = !!editItem;
  const [isPending, startTransition] = useTransition();

  const [itemCode, setItemCode] = useState(editItem?.item_code || "");
  const [name, setName] = useState(editItem?.name || "");
  const [category, setCategory] = useState<InventoryCategory | "">(
    (editItem?.category as InventoryCategory) || "",
  );
  const [unit, setUnit] = useState<InventoryUnit | "">(
    (editItem?.unit as InventoryUnit) || "",
  );
  const [minStock, setMinStock] = useState(editItem?.min_stock ?? 5);
  const [initialStock, setInitialStock] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(
    editItem?.purchase_price || editItem?.average_unit_price || 0,
  );
  const [salePrice, setSalePrice] = useState(editItem?.sale_price || 0);
  const [supplier, setSupplier] = useState(editItem?.supplier || "");
  const [imageUrl, setImageUrl] = useState(editItem?.image_url || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [error, setError] = useState("");

  const handleSubmit = (event?: FormEvent | MouseEvent) => {
    event?.preventDefault();

    if (!name.trim()) {
      setError("Tên vật tư là bắt buộc");
      return;
    }
    if (!category) {
      setError("Vui lòng chọn phân loại");
      return;
    }
    if (!unit) {
      setError("Vui lòng chọn đơn vị");
      return;
    }

    setError("");
    const formData = {
      item_code: itemCode.trim() || undefined,
      name: name.trim(),
      category,
      unit,
      min_stock: minStock,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      supplier: supplier.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit) {
      // UPDATE: chỉ field đơn (KHÔNG đụng tồn kho / giá TB) → optimistic patch + đóng modal NGAY.
      const id = editItem.id;
      onClose();
      void runOptimisticMutation({
        apply: () =>
          patchListCache<InventoryItem>(cacheKeys.inventory(), id, formData as Partial<InventoryItem>),
        rollback: () => {
          void invalidateInventoryAfterWrite(id);
        },
        action: () =>
          updateInventoryItem({ id, updated_at: editItem.updated_at, data: formData }),
        onSuccess: () => {
          toast.success("Đã cập nhật vật tư");
          void invalidateInventoryAfterWrite(id);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      });
      return;
    }

    // CREATE: item_code auto-gen + initial_stock → stock_in_atomic (giá TB) → đóng ngay + revalidate.
    onClose();
    startTransition(async () => {
      const result = await createInventoryItem({
        ...formData,
        initial_stock: initialStock,
        initial_unit_cost: purchasePrice,
      });
      if (result && "success" in result && result.success) {
        toast.success("Đã nhập kho vật tư mới");
        await invalidateInventoryAfterWrite();
      } else {
        const errMsg = result && "error" in result ? result.error : "Có lỗi xảy ra";
        toast.error(typeof errMsg === "string" ? errMsg : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Sửa vật tư" : "Nhập kho mới"}
      size="xl"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="h-12">
            Hủy
          </Button>
          <Button type="button" onClick={(event) => handleSubmit(event)} disabled={isPending} className="h-12">
            {isPending ? "Đang lưu..." : isEdit ? "Cập nhật" : "Nhập kho"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        <div>
          <label className="label-base">Tên vật tư *</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="VD: Phôi ảnh 60x90, cọ trang điểm..."
          />
        </div>

        <div className="form-grid-2col">
          <div>
            <label className="label-base">Mã vật tư</label>
            <Input
              value={itemCode}
              onChange={(event) => setItemCode(event.target.value)}
              placeholder="Tự động khi lưu"
              className="font-mono"
            />
          </div>
          <div>
            <label className="label-base">Phân loại *</label>
            <SelectForm
              value={category}
              onChange={(value) => setCategory(value as InventoryCategory)}
              options={CATEGORY_OPTIONS}
              placeholder="Chọn phân loại"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div>
            <label className="label-base">Giá nhập TB</label>
            <CurrencyInput value={purchasePrice} onChange={setPurchasePrice} />
          </div>
          <div>
            <label className="label-base">Giá bán</label>
            <CurrencyInput value={salePrice} onChange={setSalePrice} />
          </div>
        </div>

        <div className="form-grid-2col">
          {!isEdit && (
            <div>
              <label className="label-base">Số lượng tồn</label>
              <Input
                type="number"
                min={0}
                value={initialStock}
                onChange={(event) => setInitialStock(Number(event.target.value))}
              />
            </div>
          )}
          <div>
            <label className="label-base">Tồn kho tối thiểu</label>
            <Input
              type="number"
              min={0}
              value={minStock}
              onChange={(event) => setMinStock(Number(event.target.value))}
              className="text-danger"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div>
            <label className="label-base">Đơn vị *</label>
            <SelectForm
              value={unit}
              onChange={(value) => setUnit(value as InventoryUnit)}
              options={UNIT_OPTIONS}
              placeholder="Chọn đơn vị"
            />
          </div>
          <div>
            <label className="label-base">Nhà cung cấp</label>
            <Input
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="VD: Công ty ABC"
            />
          </div>
        </div>

        <div>
          <label className="label-base">Ảnh vật tư (URL)</label>
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            type="url"
          />
          {imageUrl && (
            <p className="text-xs text-text-muted mt-1.5">
              💡 Preview sẽ hiển thị trong chi tiết vật tư
            </p>
          )}
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <Textarea
            className="min-h-20"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Cách bảo quản, lưu ý..."
          />
        </div>
      </form>
    </UnifiedModal>
  );
}
