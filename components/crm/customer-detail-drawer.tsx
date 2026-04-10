"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  User,
  Mail,
  Phone,
  Calendar,
  PenLine,
  Building2,
  CalendarPlus,
  History,
  Tags,
  Trash2,
  AlertCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import type { Customer } from "@/types/crm";
import { SOURCE_MAP } from "@/types/crm";
import { format } from "date-fns";
import { toast } from "sonner";
import CustomerFormModal from "./customer-form-modal";
import { getCustomerById, deleteCustomer } from "@/app/actions/customer-actions";
import { cacheKeys } from "@/lib/swr";

// ════════════════════════════════════════════════════════════
// Helpers — Local (same pattern as LeadDetailDrawer Phase 01)
// ════════════════════════════════════════════════════════════

interface CustomerDetail {
  customer: Customer;
  contracts: Record<string, unknown>[];
  lifetimeValue: number;
}

/** InfoRow — eliminates 8× duplicate flex+border-b pattern */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 border-b border-border/50">
      <div className="flex items-center gap-2.5 text-text-muted shrink-0">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CustomerDetailDrawer — Gold Standard parity (Phase 02)
// ════════════════════════════════════════════════════════════

interface Props {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mồi data từ list → SWR fallbackData → zero-loading */
  initialData?: CustomerDetail;
}

export default function CustomerDetailDrawer({
  customerId,
  open,
  onOpenChange,
  initialData,
}: Props) {
  const { mutate: globalMutate } = useSWRConfig();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR replaces useEffect + manual state (SSOT: lib/swr.ts cacheKeys)
  const fetcher = async () => {
    if (!customerId) throw new Error("Không có ID");
    const res = await getCustomerById(customerId);
    if (!res.success) throw new Error(res.error || "Lỗi tải dữ liệu");
    if (!res.data) throw new Error("Dữ liệu rỗng");
    return res.data as CustomerDetail;
  };

  const { data, error: swrError, isLoading, mutate } = useSWR<CustomerDetail>(
    open && customerId ? cacheKeys.customerDetail(customerId) : null,
    fetcher,
    { fallbackData: initialData },
  );

  const errorMsg = swrError
    ? swrError instanceof Error
      ? swrError.message
      : "Lỗi kết nối, vui lòng thử lại"
    : null;

  const handleDelete = async () => {
    if (!customerId) return;
    setIsDeleting(true);
    try {
      const res = await deleteCustomer(customerId);
      if (res.success) {
        toast.success("Đã xoá khách hàng");
        globalMutate(cacheKeys.customers());
        onOpenChange(false);
        setIsDeleteOpen(false);
      } else {
        toast.error(res.error || "Có lỗi xảy ra");
      }
    } catch {
      toast.error("Lỗi hệ thống, vui lòng thử lại sau");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSaved = () => {
    setIsEditOpen(false);
    if (customerId) {
      globalMutate(cacheKeys.customerDetail(customerId));
      globalMutate(cacheKeys.customers());
    }
  };

  if (!customerId) return null;

  return (
    <>
      <Drawer
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title="Hồ sơ Khách Hàng"
        size="lg"
        titleBadge={
          data ? (
            <Badge variant="neutral">{data.customer.customer_code}</Badge>
          ) : undefined
        }
        headerRight={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            disabled={!data}
          >
            <PenLine className="w-4 h-4 mr-1" />
            Sửa
          </Button>
        }
      >
        {/* Loading — SSOT: Skeleton component */}
        {isLoading && !data ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <AlertCircle className="w-8 h-8 text-error/60" />
            <p className="text-sm text-center px-4">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Thử lại
            </Button>
          </div>
        ) : !data ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <div className="flex flex-col min-h-full pb-0">
            <div className="flex-1 space-y-5">
              {/* 1. Hero — Avatar + Name + Contact pills */}
              <div className="p-4 bg-bg-hover rounded-xl shadow-sm flex items-center gap-4">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shadow-xs text-primary shrink-0">
                  <User className="size-7" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-h3 truncate">{data.customer.full_name}</h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="flex items-center gap-1 text-xs bg-bg-muted/50 px-2 py-1 rounded shadow-xs text-text-secondary">
                      <Phone className="w-3.5 h-3.5 text-text-muted" />
                      {data.customer.phone || "Trống"}
                    </span>
                    {data.customer.email && (
                      <span className="flex items-center gap-1 text-xs bg-bg-muted/50 px-2 py-1 rounded shadow-xs text-text-secondary">
                        <Mail className="w-3.5 h-3.5 text-text-muted" />
                        {data.customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. LTV Stats — Compact (SSOT: no gradient, no text-3xl) */}
              <div className="form-grid-2col">
                <div className="bg-surface p-4 rounded-xl shadow-xs flex flex-col gap-1 items-center text-center">
                  <span className="label-base">Giá trị KH (LTV)</span>
                  <span className="text-h3 text-primary">
                    {data.lifetimeValue.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="bg-surface p-4 rounded-xl shadow-xs flex flex-col gap-1 items-center text-center">
                  <span className="label-base">Tổng hợp đồng</span>
                  <span className="text-h3 text-text">
                    {data.contracts.length}
                  </span>
                </div>
              </div>

              {/* 3. DataRow Card — InfoRow helper + SSOT tokens */}
              <div className="bg-surface border border-border/50 rounded-xl overflow-hidden shadow-xs">
                {/* Desktop 2-col pairs */}
                <div className="form-grid-2col">
                  {data.customer.wedding_date && (
                    <InfoRow icon={CalendarPlus} label="Ngày cưới">
                      <Badge variant="success">
                        {format(new Date(data.customer.wedding_date), "dd/MM/yyyy")}
                      </Badge>
                    </InfoRow>
                  )}
                  {(data.customer.bride_name || data.customer.groom_name) && (
                    <InfoRow icon={User} label="Dâu / Rể">
                      <span className="text-sm font-medium text-text">
                        {data.customer.bride_name || "?"} &{" "}
                        {data.customer.groom_name || "?"}
                      </span>
                    </InfoRow>
                  )}
                </div>

                <div className="form-grid-2col">
                  {data.customer.source && (
                    <InfoRow icon={Building2} label="Nguồn">
                      <span className="text-sm font-medium text-text">
                        {SOURCE_MAP[data.customer.source]?.label ||
                          data.customer.source}
                      </span>
                    </InfoRow>
                  )}
                  {data.customer.date_of_birth && (
                    <InfoRow icon={Calendar} label="Ngày sinh">
                      <span className="text-sm font-medium text-text">
                        {format(
                          new Date(data.customer.date_of_birth),
                          "dd/MM/yyyy",
                        )}
                      </span>
                    </InfoRow>
                  )}
                </div>

                {/* Address — multiline variant */}
                {data.customer.address && (
                  <div className="flex flex-col gap-1.5 p-3.5 border-b border-border/50">
                    <div className="flex items-center gap-2.5 text-text-muted">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Địa chỉ</span>
                    </div>
                    <span className="text-sm font-medium text-text pl-[26px]">
                      {data.customer.address}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {data.customer.notes && (
                  <div className="flex flex-col gap-1.5 p-3.5 border-b border-border/50">
                    <div className="flex items-center gap-2.5 text-text-muted">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Ghi chú thêm</span>
                    </div>
                    <div className="ml-[26px] text-sm text-text bg-bg-muted/30 p-2.5 rounded-lg border border-border/30 whitespace-pre-wrap">
                      {data.customer.notes}
                    </div>
                  </div>
                )}

                {/* Tags — SSOT: Badge component */}
                {data.customer.tags && data.customer.tags.length > 0 && (
                  <div className="flex flex-col gap-2 p-3.5">
                    <div className="flex items-center gap-2.5 text-text-muted">
                      <Tags className="w-4 h-4" />
                      <span className="text-sm">Phân loại</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-[26px]">
                      {data.customer.tags.map((t) => (
                        <Badge key={t} variant="primary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Contract History */}
              <div className="space-y-3">
                <h3 className="label-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Lịch sử Hợp đồng
                </h3>

                {data.contracts.length === 0 ? (
                  <div className="text-center py-8 rounded-xl shadow-xs text-text-muted text-sm bg-surface">
                    Chưa có hợp đồng nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.contracts.map((c: Record<string, unknown>) => (
                      <div
                        key={c.id as string}
                        className="p-4 bg-surface rounded-xl shadow-sm flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-text flex items-center gap-2">
                            {c.contract_code as string}
                            <Badge
                              variant={getStatusVariant(c.status as string)}
                            >
                              {c.status as string}
                            </Badge>
                          </div>
                          <div className="text-xs text-text-muted">
                            Lập lúc:{" "}
                            {format(
                              new Date(c.created_at as string),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </div>
                        </div>
                        <div className="font-bold text-primary text-base">
                          {(c.total_value as number)?.toLocaleString("vi-VN")} đ
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer — Gold Standard (Printing L504 & CRM Lead Phase 1) */}
            <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex items-center justify-between gap-3 z-10 shrink-0">
              <Button
                variant="danger"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xoá Khách Hàng
              </Button>
              <div className="flex flex-1 justify-end items-center">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit Component Layer */}
      <CustomerFormModal
        isOpen={isEditOpen}
        onClose={handleEditSaved}
        customer={data?.customer}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa Khách Hàng"
        message="Bạn có chắc là muốn xóa hồ sơ khách hàng này không? Hành động này không thể hoàn tác, trừ khi có sysadmin mở khoá Database."
        confirmLabel={isDeleting ? "Đang xóa..." : "Xóa (Nguy hiểm)"}
        cancelLabel="Hủy"
        variant="danger"
      />
    </>
  );
}
