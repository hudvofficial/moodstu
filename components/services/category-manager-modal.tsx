"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { resolveIcon } from "@/lib/utils/icon-map";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertCategory, deleteCategory } from "@/app/actions/category-actions";
import type { ServiceCategory } from "@/types/service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: ServiceCategory[];
  onCategoryCreated?: (newCategory: ServiceCategory) => void;
}

export function CategoryManagerModal({ isOpen, onClose, categories, onCategoryCreated }: Props) {
  const router = useRouter();
  
  // -- Local State for Optimistic Updates --
  const [localCategories, setLocalCategories] = useState<ServiceCategory[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // -- State --
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // -- Form State --
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

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

  const cancelEdit = () => {
    resetForm();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }

    // Save previous state for rollback
    const previousCategories = [...localCategories];
    const isEditing = !!editingId;
    const tempId = `temp_${Date.now()}`;
    const optimisticName = name.trim();
    const optimisticIcon = icon.trim() || undefined;

    // 1. Optimistic Update
    const optimisticRecord: ServiceCategory = {
      id: editingId || tempId,
      name: optimisticName,
      icon: optimisticIcon || null,
      slug: isEditing ? (localCategories.find(c => c.id === editingId)?.slug || "") : "...", // Auto-resolved by backend anyway
      parent_id: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      setLocalCategories(prev => prev.map(c => c.id === editingId ? { ...c, ...optimisticRecord } : c));
    } else {
      setLocalCategories(prev => [...prev, optimisticRecord]);
    }

    // Fast UI reset
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
      
      // 2. Server success -> Swap tempId with freshRecord (if creating)
      if (!isEditing && freshRecord) {
        setLocalCategories(prev => prev.map(c => c.id === tempId ? (freshRecord as ServiceCategory) : c));
        
        // Auto Sync Event + Close modal
        if (onCategoryCreated) {
          onCategoryCreated(freshRecord as ServiceCategory);
          onClose();
        }
      }
      
      toast.success(isEditing ? "Cập nhật thành công" : "Tạo danh mục mới thành công");
      router.refresh(); // Sync back the real cache invisibly
      
    } catch (error: unknown) {
      // 3. Rollback on failure
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
    
    // Optimistic Delete
    setLocalCategories(prev => prev.filter(c => c.id !== deletingId));

    try {
      setIsSubmitting(true);
      const response = await deleteCategory(deletingId);
      if (!response.success) {
        throw new Error(response.error);
      }
      toast.success("Đã xóa danh mục");
      router.refresh();
    } catch (error: unknown) {
      // Rollback
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Quick Create / Edit Form */}
          <div className="bg-bg-hover rounded-xl p-4 border border-border-base">
            <h3 className="text-sm font-semibold text-text-main mb-3">
              {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h3>
            
            <form onSubmit={handleSave} className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <label className="label-base block mb-1">Tên danh mục <span className="text-error">*</span></label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Chụp ảnh cưới"
                  className="w-full"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              
              <div className="w-24 shrink-0">
                <label className="label-base block mb-1">Icon (tùy chọn)</label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="camera"
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex gap-1 shrink-0">
                {editingId ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={isSubmitting}
                      className="px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3"
                    >
                      {!isSubmitting && <Check className="w-4 h-4 mr-1.5" />} {isSubmitting ? "Đang lưu..." : "Lưu"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4"
                  >
                    {!isSubmitting && <Plus className="w-4 h-4 mr-1.5" />} {isSubmitting ? "Lưu..." : "Thêm"}
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* List Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-main">
                Danh sách ({localCategories.length})
              </h3>
            </div>
            
            {localCategories.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border-base rounded-lg bg-bg-surface">
                Chưa có danh mục nào. Hãy tạo danh mục đầu tiên.
              </div>
            ) : (
              <div className="border border-border-base rounded-lg overflow-hidden divide-y divide-border-base">
                {localCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-bg-hover transition-colors bg-bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-hover text-accent flex items-center justify-center shrink-0">
                        {cat.icon ? (
                          <>{React.createElement(resolveIcon(cat.icon), { size: 16 })}</>
                        ) : (
                          <span className="font-bold text-caption uppercase">{cat.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-main">{cat.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* eslint-disable-next-line react/forbid-elements */}
                      <button
                        onClick={() => startEdit(cat)}
                        disabled={isSubmitting || cat.id.startsWith("temp_")}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50"
                        title="Sửa danh mục"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* eslint-disable-next-line react/forbid-elements */}
                      <button
                        onClick={() => setDeletingId(cat.id)}
                        disabled={isSubmitting || cat.id.startsWith("temp_")}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </UnifiedModal>

      {/* Delete Confirmation */}
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
