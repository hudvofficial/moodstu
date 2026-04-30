"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { resolveIcon } from "@/lib/utils/icon-map";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertCategory, deleteCategory } from "@/app/actions/category-actions";
import { cacheKeys, revalidateByPrefixes } from "@/lib/swr";
import type { ServiceCategory } from "@/types/service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: ServiceCategory[];
  onCategoryCreated?: (newCategory: ServiceCategory) => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
}: Props) {
  const [localCategories, setLocalCategories] = useState<ServiceCategory[]>(categories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setIcon("");
  };

  const startEdit = (cat: ServiceCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon || "");
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }

    const previousCategories = [...localCategories];
    const isEditing = !!editingId;
    const tempId = `temp_${Date.now()}`;
    const optimisticName = name.trim();
    const optimisticIcon = icon.trim() || undefined;

    const optimisticRecord: ServiceCategory = {
      id: editingId || tempId,
      name: optimisticName,
      icon: optimisticIcon || null,
      slug: isEditing ? (localCategories.find((c) => c.id === editingId)?.slug || "") : "...",
      parent_id: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      setLocalCategories((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...optimisticRecord } : c)),
      );
    } else {
      setLocalCategories((prev) => [...prev, optimisticRecord]);
    }

    resetForm();

    try {
      setIsSubmitting(true);
      const response = await upsertCategory({
        id: editingId || undefined,
        name: optimisticName,
        icon: optimisticIcon,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const freshRecord = response.data;

      if (!isEditing && freshRecord) {
        setLocalCategories((prev) =>
          prev.map((c) => (c.id === tempId ? (freshRecord as ServiceCategory) : c)),
        );

        if (onCategoryCreated) {
          onCategoryCreated(freshRecord as ServiceCategory);
          onClose();
        }
      }

      toast.success(isEditing ? "Cập nhật thành công" : "Tạo danh mục mới thành công");
      await revalidateByPrefixes([cacheKeys.categories(), cacheKeys.services()]);
    } catch (error: unknown) {
      const e = error as Error;
      toast.error(e.message || "Đã có lỗi xảy ra");
      setLocalCategories(previousCategories);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const previousCategories = [...localCategories];
    setLocalCategories((prev) => prev.filter((c) => c.id !== deletingId));

    try {
      setIsSubmitting(true);
      const response = await deleteCategory(deletingId);
      if (!response.success) {
        throw new Error(response.error);
      }
      toast.success("Đã xóa danh mục");
      await revalidateByPrefixes([cacheKeys.categories(), cacheKeys.services()]);
    } catch (error: unknown) {
      const e = error as Error;
      toast.error(e.message || "Không thể xóa danh mục này");
      setLocalCategories(previousCategories);
    } finally {
      setIsSubmitting(false);
      setDeletingId(null);
    }
  };

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title="Quản lý danh mục dịch vụ"
        size="lg"
        className="max-h-[85vh] flex flex-col"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 flex flex-col gap-5 sm:gap-6">
          <div className="bg-bg-hover/80 rounded-xl p-3.5 sm:p-4 shadow-md ring-1 ring-black/3">
            <h3 className="text-sm font-semibold text-text-main mb-3">
              {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h3>

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 sm:grid-cols-[1fr_112px_auto] gap-3 sm:items-end"
            >
              <div className="min-w-0">
                <label className="label-base block mb-1">
                  Tên danh mục <span className="text-error">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Chụp ảnh cưới"
                  className="w-full h-11"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="min-w-0">
                <label className="label-base block mb-1">Icon</label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="camera"
                  className="w-full h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2 sm:gap-1 shrink-0">
                {editingId ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={isSubmitting}
                      className="h-11 px-3"
                      aria-label="Hủy chỉnh sửa danh mục"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 flex-1 sm:flex-none px-4"
                    >
                      {!isSubmitting && <Check className="w-4 h-4 mr-1.5" />}
                      {isSubmitting ? "Đang lưu..." : "Lưu"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full sm:w-auto px-4"
                  >
                    {!isSubmitting && <Plus className="w-4 h-4 mr-1.5" />}
                    {isSubmitting ? "Lưu..." : "Thêm"}
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-main">
                Danh sách ({localCategories.length})
              </h3>
            </div>

            {localCategories.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm rounded-lg bg-bg-hover/50 shadow-sm ring-1 ring-black/3">
                Chưa có danh mục nào. Hãy tạo danh mục đầu tiên.
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden shadow-md ring-1 ring-black/3 bg-bg-card">
                {localCategories.map((cat) => {
                  const Icon = cat.icon ? resolveIcon(cat.icon) : null;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-bg-hover transition-colors bg-bg-card border-b border-border-light last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-bg-hover text-accent flex items-center justify-center shrink-0">
                          {Icon ? (
                            <Icon size={16} />
                          ) : (
                            <span className="font-bold text-caption uppercase">
                              {cat.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-main truncate">
                            {cat.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => startEdit(cat)}
                          disabled={isSubmitting || cat.id.startsWith("temp_")}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-md text-text-muted hover:text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50"
                          title="Sửa danh mục"
                          aria-label={`Sửa danh mục ${cat.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDeletingId(cat.id)}
                          disabled={isSubmitting || cat.id.startsWith("temp_")}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                          title="Xóa danh mục"
                          aria-label={`Xóa danh mục ${cat.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </UnifiedModal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa danh mục"
        message="Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác và chỉ thực hiện được nếu không có dịch vụ nào đang sử dụng danh mục."
        confirmLabel="Xóa"
        variant="danger"
      />
    </>
  );
}
