"use client";

import { Pencil, Trash2, Phone, Mail, Calendar, MapPin, Building2, User } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, getInitials } from "@/lib/utils";
import type { Customer } from "@/types/crm";
import { SOURCE_MAP } from "@/types/crm";

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CustomerDrawer({
  customer,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: CustomerDrawerProps) {
  if (!customer || !isOpen) return null;

  const sourceInfo = customer.source
    ? SOURCE_MAP[customer.source] || { label: customer.source }
    : null;

  const headerRight = (
    <div className="flex items-center gap-1">
      {onEdit && (
        <Button
          unstyled
          onClick={() => {
            onClose();
            onEdit(customer.id);
          }}
          className="btn-icon"
          title="Sửa khách hàng"
        >
          <Pencil className="w-4 h-4 text-text-secondary" />
        </Button>
      )}
      {onDelete && (
        <Button
          unstyled
          onClick={() => {
            onClose();
            onDelete(customer.id);
          }}
          className="btn-icon text-error hover:bg-error/10 hover:text-error"
          title="Xoá khách hàng"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={customer.customer_code}
      headerRight={headerRight}
    >
      <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
        {/* ── HEADER ── */}
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
            {getInitials(customer.full_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main">{customer.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-text-secondary">
                {customer.phone || "Chưa có SĐT"}
              </span>
              {sourceInfo && (
                <Badge variant="neutral" className="text-tiny">
                  {sourceInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ── TAGS ── */}
        {customer.tags && customer.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-main">Phân loại</h3>
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-bg-muted text-text-secondary rounded-md text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── CHI TIẾT ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-main border-b border-border pb-2">
            Thông tin chi tiết
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={<Phone />} label="Số điện thoại" value={customer.phone} />
            <InfoItem icon={<Phone />} label="SĐT Khác" value={customer.alt_phone} />
            <InfoItem icon={<Mail />} label="Email" value={customer.email} />
            <InfoItem icon={<MapPin />} label="Địa chỉ" value={customer.address} />
            <InfoItem icon={<Calendar />} label="Ngày sinh" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : null} />
            <InfoItem icon={<Building2 />} label="Nguồn" value={sourceInfo?.label} />
          </div>
        </div>

        {/* ── THÔNG TIN CƯỚI HỎI ── */}
        {(customer.wedding_date || customer.bride_name || customer.groom_name) && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-main border-b border-border pb-2">
              Thông tin Dâu / Rể
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={<Calendar className="text-primary" />} label="Ngày cưới" value={customer.wedding_date ? formatDate(customer.wedding_date) : null} />
              <div className="hidden sm:block"></div>
              <InfoItem icon={<User className="text-pink-500" />} label="Cô dâu" value={customer.bride_name} />
              <InfoItem icon={<User className="text-blue-500" />} label="Chú rể" value={customer.groom_name} />
            </div>
          </div>
        )}

        {/* ── GHI CHÚ ── */}
        {customer.notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-main">Ghi chú</h3>
            <div className="bg-bg-muted p-3 rounded-lg text-sm text-text-secondary whitespace-pre-wrap">
              {customer.notes}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <div className="text-text-muted mt-0.5 [&_svg]:w-4 [&_svg]:h-4">
        {icon}
      </div>
      <div>
        <div className="text-xs text-text-muted mb-0.5">{label}</div>
        <div className="font-medium text-text-main">{value}</div>
      </div>
    </div>
  );
}
