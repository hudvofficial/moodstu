"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shirt, Ribbon, Briefcase, Gift, Baby, Shapes, Sparkles, Gem, Printer, type LucideIcon } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDress, updateDress, deleteDress, uploadDressImage, deleteDressImage, checkItemCodeExists } from "@/app/actions/dress-mutations";
import { ImageUpload } from "@/components/ui/image-upload";
import { DRESS_CATEGORIES, DRESS_CONDITIONS } from "@/lib/validations/dress.schema";
import { DRESS_CONDITION_MAP, DRESS_CATEGORY_MAP, CATEGORY_PREFIX_MAP } from "@/types/dress-constants";
import { toast } from "@/lib/toast-utils";
import { QRLabel } from "@/components/dresses/dress-qr-modal";
import { printDressLabel } from "@/lib/print-qr-label";
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

const CATEGORY_OPTIONS = DRESS_CATEGORIES.map((c) => ({
  value: c,
  label: DRESS_CATEGORY_MAP[c].label,
}));

// Category → Lucide icon map (ENUM keys — V1 ref: mỗi loại có icon riêng)
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  vay_cuoi: Shirt,
  ao_dai: Ribbon,
  vest: Briefcase,
  vay_trap: Gift,
  do_be: Baby,
  vay_da_hoi: Sparkles,
  phu_kien: Gem,
  khac: Shapes,
};

function getInitial(item: DressItem | null): FormState {
  return {
    name: item?.name ?? "",
    item_code: item?.item_code ?? "",
    category: item?.category ?? "vay_cuoi",
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
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(getInitial(editItem));
      setPendingUploadUrl(null);
      setCodeError(null);
    }
  }, [isOpen, editItem]);

  const update = useCallback((partial: Partial<FormState>) => {
    setForm((p) => {
      const next = { ...p, ...partial };
      // Auto-clear item_code when category changes (prefix mismatch)
      if (partial.category && partial.category !== p.category) {
        next.item_code = "";
        setCodeError(null);
      }
      return next;
    });
  }, []);

  // ── Async uniqueness check ──
  const validateItemCode = useCallback(async (code: string) => {
    if (!code.trim()) { setCodeError(null); return; }
    try {
      const res = await checkItemCodeExists(code, editItem?.id);
      if (res.success && res.data?.exists) setCodeError("Mã này đã tồn tại!");
      else setCodeError(null);
    } catch { setCodeError(null); }
  }, [editItem?.id]);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast("Tên trang phục là bắt buộc", "warning");
      return;
    }
    if (codeError) {
      toast("Mã trang phục đã tồn tại, vui lòng đổi mã khác", "warning");
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
      setPendingUploadUrl(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [form, editItem, onClose, onSaved, codeError]);

  const handleClose = useCallback(() => {
    if (pendingUploadUrl && pendingUploadUrl !== editItem?.image_url) {
      deleteDressImage(pendingUploadUrl); // fire-and-forget
    }
    setPendingUploadUrl(null);
    onClose();
  }, [pendingUploadUrl, editItem?.image_url, onClose]);

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
        onClose={handleClose}
        title={editItem ? `Sửa: ${editItem.name}` : "Thêm trang phục"}
        size="lg"
        footer={
          <div className="form-actions">
            {editItem && (
              <Button type="button" variant="danger" onClick={() => setConfirmOpen(true)} disabled={loading}>
                Xóa
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Đang xử lý..." : editItem ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Image + QR — 2 columns on edit */}
          <div className={`grid gap-4 items-stretch ${editItem?.item_code ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Image Upload */}
            <div className={editItem?.item_code ? 'flex flex-col gap-1 p-3 bg-bg-hover rounded-xl' : ''}>
              <label className="label-base">Hình ảnh</label>
              <div className="flex-1 min-h-0">
                <ImageUpload fillCard={!!editItem?.item_code} value={form.image_url || undefined} onChange={(url) => { update({ image_url: url }); setPendingUploadUrl(url); }} onUpload={uploadDressImage} />
              </div>
            </div>

            {/* QR Card — print via popup window (V1 pattern) */}
            {editItem?.item_code && (
              <div className="flex flex-col items-center gap-2 p-3 bg-bg-hover rounded-xl">
                <div ref={qrContainerRef}>
                  <QRLabel dress={editItem} qrSize={72} />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const canvas = qrContainerRef.current?.querySelector("canvas");
                    const qrDataUrl = canvas ? canvas.toDataURL("image/png") : undefined;
                    printDressLabel(editItem, qrDataUrl);
                  }}
                  className="gap-1.5 w-full"
                >
                  <Printer size={14} />
                  In nhãn QR
                </Button>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="label-base">Tên trang phục *</label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="VD: Váy cưới Đuôi cá Luxury"
              className="w-full"
            />
          </div>

          {/* Category Select */}
          <SelectForm
            label="Phân loại"
            value={form.category}
            onChange={(v) => update({ category: v })}
            options={CATEGORY_OPTIONS}
          />

          {/* Fix #7: form-grid-2col — Code + Color */}
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Mã trang phục</label>
              <div className="flex gap-0">
                <span className="inline-flex items-center px-2.5 bg-bg-hover text-text-muted text-sm font-mono rounded-l-lg border border-r-0 border-border-primary">
                  {CATEGORY_PREFIX_MAP[form.category] || "K"}-
                </span>
                <Input
                  type="text"
                  value={form.item_code.replace(/^[A-Z]+-?/i, "")}
                  onChange={(e) => {
                    const num = e.target.value.replace(/[^0-9]/g, "");
                    const prefix = CATEGORY_PREFIX_MAP[form.category] || "K";
                    update({ item_code: num ? `${prefix}-${num}` : "" });
                    setCodeError(null);
                  }}
                  onBlur={() => validateItemCode(form.item_code)}
                  placeholder="Tự gen"
                  className="w-full font-mono rounded-l-none"
                />
              </div>
              {codeError && <p className="text-xs text-error mt-1">{codeError}</p>}
            </div>
            <div>
              <label className="label-base">Màu sắc</label>
              <Input type="text" value={form.color} onChange={(e) => update({ color: e.target.value })}
                placeholder="Trắng, Kem..." className="w-full" />
            </div>
          </div>

          {/* Fix #7 + #5: form-grid-2col — Size + Condition (SelectForm) */}
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Size</label>
              <Input type="text" value={form.size} onChange={(e) => update({ size: e.target.value })}
                placeholder="S, M, L..." className="w-full" />
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
            <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })}
              rows={2} placeholder="Phụ kiện đi kèm, tình trạng..." className="w-full resize-none" />
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
