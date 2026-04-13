"use client";

import { useEffect, useState } from "react";
import { Edit, FolderTree, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFinanceCategory } from "@/app/actions/finance-category-actions";
import { fetchFinanceCategories } from "@/app/actions/finance-operations-queries";
import { CategoryFormModal } from "@/components/finance/categories/category-form-modal";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FinanceCategory } from "@/types/finance-operations";

interface CategoriesClientProps {
  initialData: FinanceCategory[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function CategoriesClient({ initialData }: CategoriesClientProps) {
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = cacheKeys.financeCategories("all");
  const { data, error, isLoading } = useSWR(key, () => requireData(fetchFinanceCategories("all")), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được danh mục.");
  }, [error]);

  const categories = data || initialData;

  const refresh = () => {
    void mutate(key);
    void mutate(cacheKeys.financeCategories("Thu"));
    void mutate(cacheKeys.financeCategories("Chi"));
  };

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: FinanceCategory) => {
    setEditing(item);
    setIsModalOpen(true);
  };

  const remove = async (item: FinanceCategory) => {
    if (!window.confirm(`Xóa danh mục ${item.name}?`)) return;
    setDeletingId(item.id);
    const result = await deleteFinanceCategory(item.id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa danh mục.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-info/10">
            <FolderTree className="w-4 h-4 text-info" />
          </div>
          <div>
            <h1 className="text-h1">Danh mục thu chi</h1>
            <p className="text-body-sm text-text-secondary">Nguồn phân loại cho phiếu thu, phiếu chi và ngân sách.</p>
          </div>
        </div>
        <Button type="button" onClick={openCreate} className="btn-cta gap-2">
          <Plus className="w-4 h-4" />
          Thêm danh mục
        </Button>
      </div>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Tên</TH>
                <TH>Loại</TH>
                <TH>Mã</TH>
                <TH>Mặc định</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((item) => (
                <TR key={item.id}>
                  <TD className="font-semibold text-text-primary">{item.name}</TD>
                  <TD>
                    <span className={item.type === "Thu" ? "badge badge-success" : "badge badge-error"}>{item.type}</span>
                  </TD>
                  <TD>
                    <span className="tag-badge">{item.category_code}</span>
                  </TD>
                  <TD>{item.is_default ? "Có" : "-"}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!item.is_default && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={deletingId === item.id} className="text-error">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableWrapper>
        )}
      </section>

      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={refresh}
          category={editing}
        />
      )}
    </>
  );
}
