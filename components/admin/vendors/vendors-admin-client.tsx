"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Merge, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import {
  deleteVendor,
  mergeVendors,
  quickAddVendor,
  updateVendor,
} from "@/app/actions/vendor-actions";
import type { Vendor } from "@/types/vendor";

type VendorRow = Pick<Vendor, "id" | "full_name" | "phone" | "service_type" | "status"> & {
  created_at?: string;
  updated_at?: string;
};

interface Props {
  initialVendors: VendorRow[];
}

interface DraftVendor {
  id?: string;
  full_name: string;
  phone: string;
  service_type: string;
  status: "active" | "inactive";
}

const EMPTY_DRAFT: DraftVendor = {
  full_name: "",
  phone: "",
  service_type: "",
  status: "active",
};

function toDraft(vendor: VendorRow): DraftVendor {
  return {
    id: vendor.id,
    full_name: vendor.full_name,
    phone: vendor.phone || "",
    service_type: vendor.service_type || "",
    status: vendor.status,
  };
}

export function VendorsAdminClient({ initialVendors }: Props) {
  const [vendors, setVendors] = useState(initialVendors);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftVendor>(EMPTY_DRAFT);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredVendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((vendor) =>
      [vendor.full_name, vendor.phone, vendor.service_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, vendors]);

  const refreshRow = (row: VendorRow) => {
    setVendors((prev) => {
      const exists = prev.some((item) => item.id === row.id);
      if (!exists) return [...prev, row].sort((a, b) => a.full_name.localeCompare(b.full_name));
      return prev.map((item) => (item.id === row.id ? { ...item, ...row } : item));
    });
  };

  const handleSave = () => {
    if (!draft.full_name.trim()) {
      toast.error("Nhập tên thợ ngoài trước");
      return;
    }

    startTransition(async () => {
      const result = draft.id
        ? await updateVendor({
            id: draft.id,
            full_name: draft.full_name,
            phone: draft.phone || null,
            service_type: draft.service_type || null,
            status: draft.status,
          })
        : await quickAddVendor({
            full_name: draft.full_name,
            phone: draft.phone,
            service_type: draft.service_type,
          });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      refreshRow(result.data as VendorRow);
      setDraft(EMPTY_DRAFT);
      toast.success(draft.id ? "Đã cập nhật thợ ngoài" : "Đã thêm/chọn thợ ngoài");
    });
  };

  const handleDelete = (vendor: VendorRow) => {
    const ok = window.confirm(
      `Xóa thợ ngoài "${vendor.full_name}"?\n\nLịch sử task/thanh toán vẫn được giữ, nhưng người này sẽ không còn hiện trong danh sách chọn mới.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteVendor(vendor.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setVendors((prev) => prev.filter((item) => item.id !== vendor.id));
      toast.success("Đã xóa thợ ngoài");
    });
  };

  const handleMerge = () => {
    if (!mergeSourceId || !mergeTargetId) {
      toast.error("Chọn đủ thợ cần gộp và thợ giữ lại");
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      toast.error("Không thể gộp cùng một người");
      return;
    }

    const source = vendors.find((item) => item.id === mergeSourceId);
    const target = vendors.find((item) => item.id === mergeTargetId);
    const ok = window.confirm(
      `Gộp "${source?.full_name || "thợ nguồn"}" vào "${target?.full_name || "thợ giữ lại"}"?\n\nToàn bộ task và thanh toán sẽ chuyển sang thợ giữ lại.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await mergeVendors({ keepVendorId: mergeTargetId, mergeVendorId: mergeSourceId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setVendors((prev) => prev.filter((item) => item.id !== mergeSourceId));
      setMergeSourceId("");
      setMergeTargetId("");
      toast.success("Đã gộp thợ ngoài");
    });
  };

  return (
    <div className="main-container gap-4!">
      <div className="rounded-2xl bg-bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-overline text-text-muted">Admin</p>
            <h1 className="text-title font-bold text-text-primary">Quản lý thợ ngoài</h1>
            <p className="text-body-sm text-text-muted">
              Thêm, sửa, xóa mềm và gộp duplicate freelancer/vendor. Lịch sử task và công nợ được giữ nguyên.
            </p>
          </div>
          <Input
            unstyled
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, SĐT, loại việc..."
            className="input-base h-10 md:w-80"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="space-y-4 rounded-2xl bg-bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-label font-bold text-text-primary">{draft.id ? "Sửa thợ ngoài" : "Thêm thợ ngoài"}</h2>
            {draft.id && (
              <Button unstyled type="button" onClick={() => setDraft(EMPTY_DRAFT)} className="text-text-muted hover:text-error">
                <X size={16} />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <Input unstyled className="input-base" placeholder="Tên thợ ngoài" value={draft.full_name} onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))} />
            <Input unstyled className="input-base" placeholder="Số điện thoại" value={draft.phone} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input unstyled className="input-base" placeholder="Loại việc: chụp ảnh, quay phim..." value={draft.service_type} onChange={(e) => setDraft((prev) => ({ ...prev, service_type: e.target.value }))} />
            <SelectForm
              value={draft.status}
              onChange={(val) => setDraft((prev) => ({ ...prev, status: val as "active" | "inactive" }))}
              options={[
                { value: "active", label: "Đang hoạt động" },
                { value: "inactive", label: "Ngưng dùng" }
              ]}
              placeholder="Trạng thái"
            />
          </div>

          <Button unstyled type="button" onClick={handleSave} disabled={isPending} className="btn btn-primary w-full">
            {draft.id ? <Save size={16} /> : <Plus size={16} />}
            {draft.id ? "Lưu thay đổi" : "Thêm / lấy bản đã có"}
          </Button>

          <div className="border-t border-border pt-4">
            <h2 className="mb-2 text-label font-bold text-text-primary">Gộp duplicate</h2>
            <div className="space-y-2">
              <SelectForm
                value={mergeSourceId}
                onChange={setMergeSourceId}
                options={vendors.map(v => ({ value: v.id, label: `${v.full_name}${v.phone ? ` - ${v.phone}` : ""}` }))}
                placeholder="Chọn bản cần gộp/xóa"
              />
              <SelectForm
                value={mergeTargetId}
                onChange={setMergeTargetId}
                options={vendors.map(v => ({ value: v.id, label: `${v.full_name}${v.phone ? ` - ${v.phone}` : ""}` }))}
                placeholder="Chọn bản giữ lại"
              />
              <Button unstyled type="button" onClick={handleMerge} disabled={isPending} className="btn btn-secondary w-full">
                <Merge size={16} />
                Gộp vào bản giữ lại
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-label font-bold text-text-primary">Danh sách ({filteredVendors.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-text-muted">
                <tr>
                  <th className="py-2 pr-3">Tên</th>
                  <th className="py-2 pr-3">SĐT</th>
                  <th className="py-2 pr-3">Loại việc</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-bg-hover/50">
                    <td className="py-2 pr-3 font-semibold text-text-primary">{vendor.full_name}</td>
                    <td className="py-2 pr-3 text-text-muted">{vendor.phone || "-"}</td>
                    <td className="py-2 pr-3 text-text-muted">{vendor.service_type || "-"}</td>
                    <td className="py-2 pr-3 text-text-muted">{vendor.status === "active" ? "Đang hoạt động" : "Ngưng dùng"}</td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button unstyled type="button" onClick={() => setDraft(toDraft(vendor))} className="icon-btn h-8 w-8 rounded-full text-text-muted hover:text-primary">
                          <Pencil size={15} />
                        </Button>
                        <Button unstyled type="button" onClick={() => handleDelete(vendor)} className="icon-btn h-8 w-8 rounded-full text-error hover:bg-error/10">
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted">Không có thợ ngoài phù hợp</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
