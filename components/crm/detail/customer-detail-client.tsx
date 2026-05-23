"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Heart,
  ChevronLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";

import type { Customer } from "@/types/crm";
import { SOURCE_MAP } from "@/types/crm";
import { format } from "date-fns";
import { toast } from "sonner";
import CustomerFormModal from "../customer-form-modal";
import { getCustomerById, deleteCustomer } from "@/app/actions/customer-actions";
import { cacheKeys } from "@/lib/swr";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { CrmToolbarSurface } from "@/components/crm/crm-toolbar-surface";

interface CustomerDetail {
  customer: Customer;
  contracts: Record<string, unknown>[];
  lifetimeValue: number;
}

interface Props {
  customerId: string;
  initialData: CustomerDetail;
}

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

export default function CustomerDetailClient({ customerId, initialData }: Props) {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetcher = async () => {
    const res = await getCustomerById(customerId);
    if (!res.success) throw new Error(res.error || "Lỗi tải dữ liệu");
    if (!res.data) throw new Error("Dữ liệu rỗng");
    return res.data as CustomerDetail;
  };

  const { data, error: swrError, mutate } = useSWR<CustomerDetail>(
    cacheKeys.customerDetail(customerId),
    fetcher,
    { fallbackData: initialData }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteCustomer(customerId);
      if (res.success) {
        toast.success("Đã xoá khách hàng");
        globalMutate(cacheKeys.customers());
        router.push("/crm/customers");
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
    globalMutate(cacheKeys.customerDetail(customerId));
    globalMutate(cacheKeys.customers());
  };

  const customer = data?.customer;
  const initial = customer?.full_name?.charAt(0)?.toUpperCase() || "?";
  
  // Debt calculation (assuming contract logic: debt = total - paid)
  // Current CRM contract records from `getCustomerById` only returns total_value, status, created_at.
  // Assuming no full payment tracking in getCustomerById right now, so we will show LTV.

  function buildDetailStr(h: number | null | undefined, w: number | null | undefined, s: number | null | undefined): string {
    const parts: string[] = [];
    if (h) parts.push(`${h}cm`);
    if (w) parts.push(`${w}kg`);
    if (s) parts.push(`giày ${s}`);
    return parts.join(", ");
  }

  function buildPersonStr(name: string | null | undefined, h: number | null | undefined, w: number | null | undefined, s: number | null | undefined): string {
    const detail = buildDetailStr(h, w, s);
    if (!name) return detail;
    if (!detail) return name;
    return `${name} — ${detail}`;
  }

  return (
    <>
      <div className="main-container gap-4 pb-12">
        <CrmToolbarSurface>
          <div className="flex items-center min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
              <ChevronLeft size={20} />
            </Button>
            <h1 className="text-h3 truncate text-text-primary">
              {customer?.full_name || "Hồ sơ Khách Hàng"}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="gap-2"
            >
              <PenLine className="w-4 h-4" />
              Sửa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CrmToolbarSurface>

        {swrError && !data ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted card-base">
            <AlertCircle className="w-8 h-8 text-error/60" />
            <p className="text-sm text-center px-4">{swrError.message || "Lỗi tải dữ liệu"}</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Thử lại
            </Button>
          </div>
        ) : !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Skeleton className="h-[400px] lg:col-span-4 rounded-xl" />
            <Skeleton className="h-[400px] lg:col-span-8 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            
            {/* Left Column: Profile & Info */}
            <div className="lg:col-span-4 space-y-4 lg:space-y-6 lg:sticky lg:top-20">
              {/* Hero Card */}
              <div className="card-base p-4 lg:p-6 flex flex-col items-center text-center">
                <div className="size-20 lg:size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-h2 font-bold mb-4 shadow-sm border border-primary/20">
                  {initial}
                </div>
                <h2 className="text-h3 text-text-primary mb-1">{customer?.full_name}</h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {customer?.customer_code && <Badge variant="neutral">#{customer.customer_code}</Badge>}
                  {customer?.source && <Badge variant="secondary">{SOURCE_MAP[customer.source]?.label || customer.source}</Badge>}
                </div>

                <div className="w-full grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-bg-hover p-3 rounded-xl border border-border/50">
                    <p className="text-caption text-text-muted mb-0.5">Giá trị LTV</p>
                    <p className="text-body font-bold text-primary">
                      {data.lifetimeValue > 0 ? `${formatCurrency(data.lifetimeValue)} ${CURRENCY_SYMBOL}` : '0 đ'}
                    </p>
                  </div>
                  <div className="bg-bg-hover p-3 rounded-xl border border-border/50">
                    <p className="text-caption text-text-muted mb-0.5">Số hợp đồng</p>
                    <p className="text-body font-bold text-text-primary">
                      {data.contracts.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {customer?.tags && customer.tags.length > 0 && (
                <div className="card-base p-4">
                  <div className="flex items-center gap-2 text-text-secondary mb-3">
                    <Tags size={16} />
                    <span className="text-body-sm font-semibold">Phân loại / Thẻ</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((t) => (
                      <Badge key={t} variant="primary">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="card-base overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-bg-muted/30">
                  <h3 className="text-body-sm font-bold text-text-primary">Liên hệ & Cá nhân</h3>
                </div>
                
                {customer?.phone && (
                  <InfoRow icon={Phone} label="Điện thoại">
                    <a href={`tel:${customer.phone}`} className="text-sm font-medium text-primary hover:underline">
                      {customer.phone}
                    </a>
                  </InfoRow>
                )}
                {customer?.email && (
                  <InfoRow icon={Mail} label="Email">
                    <a href={`mailto:${customer.email}`} className="text-sm font-medium text-text-primary hover:text-primary truncate max-w-[200px]">
                      {customer.email}
                    </a>
                  </InfoRow>
                )}
                {customer?.date_of_birth && (
                  <InfoRow icon={Calendar} label="Ngày sinh">
                    <span className="text-sm font-medium text-text-primary">
                      {format(new Date(customer.date_of_birth), "dd/MM/yyyy")}
                    </span>
                  </InfoRow>
                )}
                {customer?.address && (
                  <div className="flex flex-col gap-1 p-3.5 border-b border-border/50">
                    <div className="flex items-center gap-2.5 text-text-muted">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Địa chỉ</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary pl-6">
                      {customer.address}
                    </span>
                  </div>
                )}
                {customer?.notes && (
                  <div className="flex flex-col gap-1.5 p-3.5">
                    <div className="flex items-center gap-2.5 text-text-muted">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Ghi chú thêm</span>
                    </div>
                    <div className="ml-6 text-sm text-text-primary bg-bg-muted/50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {customer.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Studio Specs & Contracts History */}
            <div className="lg:col-span-8 space-y-4 lg:space-y-6">
              
              {/* Studio Specs */}
              {(customer?.bride_name || customer?.groom_name || customer?.wedding_date) && (
                <div className="card-base p-4 lg:p-6">
                  <div className="flex items-center gap-2 text-text-primary mb-4 border-b border-border/50 pb-3">
                    <Heart size={18} className="text-rose-500" />
                    <h3 className="text-body font-bold">Thông tin Lễ cưới</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customer?.wedding_date && (
                      <div className="col-span-1 md:col-span-2 bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-rose-800 flex items-center gap-2">
                          <CalendarPlus size={16} /> Ngày cưới dự kiến
                        </span>
                        <Badge variant="neutral" className="bg-white">
                          {format(new Date(customer.wedding_date), "dd/MM/yyyy")}
                        </Badge>
                      </div>
                    )}
                    
                    {customer?.bride_name && (
                      <div className="space-y-2 p-3 bg-bg-hover rounded-xl border border-border/50">
                        <p className="text-caption font-semibold text-text-muted uppercase">Cô dâu</p>
                        <p className="text-body-sm font-bold text-text-primary">{customer.bride_name}</p>
                        {customer.bride_phone && (
                          <p className="text-sm text-primary flex items-center gap-1.5">
                            <Phone size={14} /> {customer.bride_phone}
                          </p>
                        )}
                        {(customer.bride_height || customer.bride_weight || customer.bride_shoe_size) && (
                          <div className="mt-2 text-xs text-text-secondary bg-surface p-2 rounded-md border border-border/30">
                            Số đo: {buildDetailStr(customer.bride_height, customer.bride_weight, customer.bride_shoe_size)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {customer?.groom_name && (
                      <div className="space-y-2 p-3 bg-bg-hover rounded-xl border border-border/50">
                        <p className="text-caption font-semibold text-text-muted uppercase">Chú rể</p>
                        <p className="text-body-sm font-bold text-text-primary">{customer.groom_name}</p>
                        {customer.groom_phone && (
                          <p className="text-sm text-primary flex items-center gap-1.5">
                            <Phone size={14} /> {customer.groom_phone}
                          </p>
                        )}
                        {(customer.groom_height || customer.groom_weight || customer.groom_shoe_size) && (
                          <div className="mt-2 text-xs text-text-secondary bg-surface p-2 rounded-md border border-border/30">
                            Số đo: {buildDetailStr(customer.groom_height, customer.groom_weight, customer.groom_shoe_size)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contracts History */}
              <div className="card-base p-4 lg:p-6">
                <div className="flex items-center gap-2 text-text-primary mb-4 border-b border-border/50 pb-3">
                  <History size={18} className="text-primary" />
                  <h3 className="text-body font-bold">Lịch sử Hợp đồng</h3>
                </div>

                {data.contracts.length === 0 ? (
                  <div className="text-center py-10 rounded-xl bg-bg-hover/50 border border-dashed border-border flex flex-col items-center justify-center">
                    <History className="w-10 h-10 text-text-muted mb-2 opacity-50" />
                    <p className="text-text-secondary font-medium">Chưa có hợp đồng nào</p>
                    <p className="text-caption text-text-muted mt-1">Hợp đồng ký kết sẽ xuất hiện tại đây.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.contracts.map((c: any) => (
                      <Link
                        key={c.id}
                        href={`/contracts/${c.id}`}
                        className="block group"
                      >
                        <div className="p-4 bg-bg-hover hover:bg-bg-muted transition-colors rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                                {c.contract_code}
                              </span>
                              <Badge variant={getStatusVariant(c.status)}>
                                {c.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-text-muted flex items-center gap-1">
                              <Calendar size={12} />
                              Lập lúc: {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                            </div>
                          </div>
                          <div className="font-bold text-text-primary sm:text-right">
                            {formatCurrency(c.total_amount || 0)} {CURRENCY_SYMBOL}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
        message="Bạn có chắc là muốn xóa hồ sơ khách hàng này không? Tất cả dữ liệu liên quan sẽ bị ẩn."
        confirmLabel={isDeleting ? "Đang xóa..." : "Xóa (Nguy hiểm)"}
        cancelLabel="Hủy"
        variant="danger"
      />
    </>
  );
}
