"use client";

import { useEffect, useState, useCallback } from "react";
import { Edit, FolderTree, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFinanceCategory } from "@/app/actions/finance-category-actions";
import { fetchFinanceCategories } from "@/app/actions/finance-operations-queries";
import { CategoryFormModal } from "@/components/finance/categories/category-form-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FAB } from "@/components/ui/fab";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FinanceCategory } from "@/types/finance-operations";
import { TierSwitch } from "@/components/ui/tier-switch";

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
    void mutate(cacheKeys.financeCategories("thu"));
    void mutate(cacheKeys.financeCategories("chi"));
  };

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((item: FinanceCategory) => {
    setEditing(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Cấu hình", href: "/settings/finance" },
          { label: "Danh mục thu chi" },
        ]}
      />

      <section className="entrance entrance-0 mt-4 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="icon-box bg-info/10">
              <FolderTree className="w-5 h-5 text-info" />
            </div>
            <div>
              <h1 className="text-h3 font-semibold text-text-primary">Danh mục thu chi</h1>
              <p className="text-body-sm text-text-secondary">Nguồn phân loại cho phiếu thu, phiếu chi và ngân sách.</p>
            </div>
          </div>
          <div className="hidden lg:flex shrink-0">
            <Button type="button" onClick={openCreate} variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Thêm danh mục</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TierSwitch
            phone={
              <div className="flex flex-col gap-3">
                {categories.map((item) => (
                  <div key={item.id} className="card-base p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between min-w-0 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-body font-semibold mb-2 truncate">
                          {item.name}
                          {item.is_default && <span className="ml-2 text-tiny uppercase font-bold text-text-muted tag-badge">Mặc định</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={item.type === "thu" ? "success" : "error"}>
                            {item.type === "thu" ? "Thu" : "Chi"}
                          </Badge>
                          <span className="tag-badge">{item.category_code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!item.is_default && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={deletingId === item.id} className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
            desktop={
              <div className="card-base overflow-hidden">
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
                          <Badge variant={item.type === "thu" ? "success" : "error"}>
                            {item.type === "thu" ? "Thu" : "Chi"}
                          </Badge>
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
              </div>
            }
          />
        )}
      </section>

      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSaved={refresh}
          category={editing}
        />
      )}

      {/* FAB cho mobile */}
      <FAB onClick={openCreate} label="Thêm danh mục" />
    </div>
  );
}
