"use client";

import Image from "next/image";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Shirt, Search } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAvailableItems } from "@/app/actions/dress-queries";
import { reserveDressForContract } from "@/app/actions/dress-mutations";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";
import DatePicker from "@/components/ui/date-picker";

// ═══════════════════════════════════════════
// Dress Reservation Form — V2 (replaces V1 DressSelector)
// Phase 07A: V2 dress_reservations pattern
// Data via server actions, NOT client Supabase
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractCode: string;
}

interface DressItem {
  id: string;
  name: string;
  item_code: string | null;
  category: string | null;
  size: string | null;
  color: string | null;
  rental_price: number | null;
  image_url: string | null;
}

export default function DressReservationForm({
  isOpen,
  onClose,
  contractId,
  contractCode,
}: Props) {
  const [items, setItems] = useState<DressItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAddon, setIsAddon] = useState(true);
  const [rentalPrice, setRentalPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch available items on open
  useEffect(() => {
    if (!isOpen) return;
    getAvailableItems().then((result) => {
      if (result.success && result.data) {
        setItems(result.data as DressItem[]);
      }
    });
  }, [isOpen]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.item_code?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId]
  );

  // Auto-fill price when selecting item
  const handleSelect = useCallback((item: DressItem) => {
    setSelectedId(item.id);
    if (item.rental_price) {
      setRentalPrice(String(item.rental_price));
    }
  }, []);

  const resetForm = useCallback(() => {
    setSelectedId(null);
    setSearch("");
    setIsAddon(true);
    setRentalPrice("");
    setStartDate("");
    setEndDate("");
    setNotes("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedId) {
      toast("Vui lòng chọn trang phục", "warning");
      return;
    }

    const price = parseFloat(rentalPrice) || 0;
    setLoading(true);
    try {
      const result = await reserveDressForContract({
        dressId: selectedId,
        contractId,
        isAddon,
        rentalPrice: price,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        toast("Đã đặt trang phục thành công", "success");
        resetForm();
        onClose();
        await revalidateContractCaches(contractId);
      } else {
        toast(result.error || "Lỗi đặt trang phục", "error");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedId, rentalPrice, contractId, isAddon, startDate, endDate, notes, resetForm, onClose]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={() => { resetForm(); onClose(); }}
      title="Chọn trang phục"
      description={contractCode}
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã, loại..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Item list */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center">
              <Shirt size={24} className="text-text-muted/40 mx-auto mb-2" />
              <p className="text-caption text-text-muted">
                {items.length === 0 ? "Không có trang phục khả dụng" : "Không tìm thấy"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 !p-2.5 rounded-md transition-all text-left
                  ${selectedId === item.id
                    ? "bg-primary/10 ring-1 ring-primary"
                    : "bg-bg-hover hover:bg-bg-secondary"
                  }`}
              >
                {/* Thumbnail */}
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Shirt size={16} className="text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-caption text-text-muted">
                    {item.item_code && <span>#{item.item_code}</span>}
                    {item.size && <span>Size {item.size}</span>}
                    {item.rental_price && (
                      <span>{new Intl.NumberFormat("vi-VN").format(item.rental_price)}đ</span>
                    )}
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>

        {/* Selected item details */}
        {selectedItem && (
          <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
            <p className="text-body-sm font-semibold text-primary mb-2">
              Đã chọn: {selectedItem.name}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base mb-1 block">Giá thuê</label>
                <Input
                  type="number"
                  value={rentalPrice}
                  onChange={(e) => setRentalPrice(e.target.value)}
                  placeholder="0"
                  className="w-full"
                />
              </div>
              <div>
                <DatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  label="Ngày bắt đầu"
                  placeholder="Chọn ngày"
                />
              </div>
            </div>

            {/* Addon checkbox */}
            <label className="flex items-center gap-2 text-body-sm cursor-pointer mt-3">
              <div className="relative flex items-center justify-center">
                <Checkbox
                  checked={isAddon}
                  onChange={(e) => setIsAddon(e.target.checked)}
                />
                <svg className="absolute w-3 h-3 text-primary hidden peer-checked:block pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-text-secondary">
                Đây là mục phát sinh (cộng vào giá trị HĐ)
              </span>
            </label>

            {/* Notes */}
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
              rows={2}
              className="w-full resize-none mt-3"
            />
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => { resetForm(); onClose(); }}
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedId || loading}
            className="disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đặt trang phục"}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
