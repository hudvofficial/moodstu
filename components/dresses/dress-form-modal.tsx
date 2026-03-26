"use client";

import { useState, useEffect, useCallback } from "react";
import { Shirt } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createDress, updateDress, deleteDress } from "@/app/actions/dress-mutations";
import { ImageUpload } from "@/components/ui/image-upload";
import { DRESS_CATEGORIES, DRESS_CONDITIONS } from "@/lib/validations/dress.schema";
import { DRESS_CONDITION_MAP, DRESS_CATEGORY_MAP } from "@/types/dress-constants";
import { toast } from "@/lib/toast-utils";
import type { DressItem } from "@/types/dress";

// ═══════════════════════════════════════════
// DressFormModal — Create/Edit dress
// Gold Standard: SelectForm, CurrencyInput, ConfirmDialog, form-grid-2col
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editItem: DressItem | null;
  onSaved: () => void;
}

interface FormState {
  name: string;
  item_code: string;
  category: string;
  size: string;
  color: string;
  condition: string;
  rental_price: number;
  purchase_price: number;
  image_url: string;
  notes: string;
}

// Fix #5: SelectForm options (hoisted)
const CONDITION_OPTIONS = DRESS_CONDITIONS.map((c) => ({
  value: c,
  label: DRESS_CONDITION_MAP[c],
}));

function getInitial(item: DressItem | null): FormState {
  return {
    name: item?.name ?? "",
    item_code: item?.item_code ?? "",
    category: item?.category ?? "Váy cưới",
    size: item?.size ?? "",
    color: item?.color ?? "",
    condition: item?.condition ?? "new",
    rental_price: item?.rental_price ?? 0,
    purchase_price: item?.purchase_price ?? 0,
    image_url: item?.image_url ?? "",
    notes: item?.notes ?? "",
  };
}

export default function DressFormModal({ isOpen, onClose, editItem, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => getInitial(editItem));
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(getInitial(editItem));
  }, [isOpen, editItem]);

  const update = useCallback((partial: Partial<FormState>) => {
    setForm((p) => ({ ...p, ...partial }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast("Tên trang phục là bắt buộc", "warning");
      return;
    }
    setLoading(true);
    try {
      if (editItem) {
        const result = await updateDress({
          id: editItem.id,
          updated_at: editItem.updated_at,
          data: { ...form, image_url: form.image_url || undefined },
        });
        if (!result.success) throw new Error(result.error);
        toast("Cập nhật thành công", "success");
      } else {
        const result = await createDress(form);
        if (!result.success) throw new Error(result.error);
        toast("Thêm trang phục thành công", "success");
      }
      onClose();
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [form, editItem, onClose, onSaved]);

  // Fix #8: ConfirmDialog handler (thay native confirm)
  const handleDeleteConfirm = useCallback(async () => {
    if (!editItem) return;
    setLoading(true);
    try {
      const result = await deleteDress(editItem.id);
      if (!result.success) throw new Error(result.error);
      toast("Đã xóa trang phục", "success");
      onClose();
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [editItem, onClose, onSaved]);

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title={editItem ? `Sửa: ${editItem.name}` : "Thêm trang phục"}
        size="lg"
        footer={
          <div className="form-actions">
            {editItem && (
              <button onClick={() => setConfirmOpen(true)} className="btn btn-danger" disabled={loading}>Xóa</button>
            )}
            <button onClick={onClose} className="btn btn-ghost">Đóng</button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
              {loading ? "Đang xử lý..." : editItem ? "Cập nhật" : "Thêm"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="label-base">Hình ảnh</label>
            <ImageUpload value={form.image_url || undefined} onChange={(url) => update({ image_url: url })} />
          </div>

          {/* Name */}
          <div>
            <label className="label-base">Tên trang phục *</label>
            <input type="text" value={form.name} onChange={(e) => update({ name: e.target.value })}
              placeholder="VD: Váy cưới Đuôi cá Luxury" className="input-base w-full" />
          </div>

          {/* Category chips */}
          <div>
            <label className="label-base mb-1.5">Phân loại</label>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
              {DRESS_CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => update({ category: cat })}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-caption font-semibold transition-all ${
                    form.category === cat
                      ? "bg-primary/10 text-primary ring-1 ring-primary"
                      : "bg-bg-hover text-text-muted hover:bg-bg-secondary"
                  }`}>
                  <Shirt size={16} />
                  {DRESS_CATEGORY_MAP[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Fix #7: form-grid-2col — Code + Color */}
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Mã trang phục</label>
              <input type="text" value={form.item_code} onChange={(e) => update({ item_code: e.target.value })}
                placeholder="Tự gen nếu bỏ trống" className="input-base w-full font-mono" />
            </div>
            <div>
              <label className="label-base">Màu sắc</label>
              <input type="text" value={form.color} onChange={(e) => update({ color: e.target.value })}
                placeholder="Trắng, Kem..." className="input-base w-full" />
            </div>
          </div>

          {/* Fix #7 + #5: form-grid-2col — Size + Condition (SelectForm) */}
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Size</label>
              <input type="text" value={form.size} onChange={(e) => update({ size: e.target.value })}
                placeholder="S, M, L..." className="input-base w-full" />
            </div>
            <SelectForm
              label="Tình trạng"
              value={form.condition}
              onChange={(v) => update({ condition: v })}
              options={CONDITION_OPTIONS}
            />
          </div>

          {/* Fix #7 + #6: form-grid-2col — Prices (CurrencyInput) */}
          <div className="form-grid-2col">
            <CurrencyInput
              label="Giá thuê"
              value={form.rental_price}
              onChange={(v) => update({ rental_price: v })}
            />
            <CurrencyInput
              label="Giá nhập"
              value={form.purchase_price}
              onChange={(v) => update({ purchase_price: v })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label-base">Ghi chú</label>
            <textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })}
              rows={2} placeholder="Phụ kiện đi kèm, tình trạng..." className="input-base w-full resize-none" />
          </div>
        </div>
      </UnifiedModal>

      {/* Fix #8: ConfirmDialog (thay native confirm) */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa trang phục"
        message={`Bạn có chắc muốn xóa "${editItem?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />
    </>
  );
}
