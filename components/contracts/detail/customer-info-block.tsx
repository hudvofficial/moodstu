import { User, Phone, Mail, MapPin, Heart } from "lucide-react";
import type { Customer } from "@/types/contract";

// ═══════════════════════════════════════════
// CustomerInfoBlock — Customer details card
// Phase 04b: Avatar, name, phone, email, address
// Phase C1: Bride/Groom info
// V1 Ref: details/CustomerInfoBlock.tsx (port logic)
// ═══════════════════════════════════════════

interface Props {
  customer: Customer | null;
  notes: string | null;
  embedded?: boolean;
  brideName?: string | null;
  groomName?: string | null;
  bridePhone?: string | null;
  groomPhone?: string | null;
  brideHeight?: number | null;
  brideWeight?: number | null;
  brideShoeSize?: number | null;
  groomHeight?: number | null;
  groomWeight?: number | null;
  groomShoeSize?: number | null;
}

export default function CustomerInfoBlock({
  customer, notes, embedded,
  brideName, groomName, bridePhone, groomPhone,
  brideHeight, brideWeight, brideShoeSize,
  groomHeight, groomWeight, groomShoeSize,
}: Props) {
  if (!customer) return null;

  // Avatar initial letter
  const initial = customer.full_name?.charAt(0)?.toUpperCase() || "?";

  // Build Stitch-format: "155cm, 50kg, giày 39"
  function buildDetailStr(h: number | null | undefined, w: number | null | undefined, s: number | null | undefined): string {
    const parts: string[] = [];
    if (h) parts.push(`${h}cm`);
    if (w) parts.push(`${w}kg`);
    if (s) parts.push(`giày ${s}`);
    return parts.join(", ");
  }

  // Build full bride/groom display: "Tên — 155cm, 50kg, giày 39"
  function buildPersonStr(name: string | null | undefined, h: number | null | undefined, w: number | null | undefined, s: number | null | undefined): string {
    const detail = buildDetailStr(h, w, s);
    if (!name) return detail;
    if (!detail) return name;
    return `${name} — ${detail}`;
  }

  return (
    <div className={embedded ? "" : "card-base p-4 lg:p-6"}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <User size={16} className="text-primary" />
        <h3 className="text-body-sm font-bold text-text-primary">
          Thông tin khách hàng
        </h3>
      </div>

      {/* Customer Profile */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-md bg-primary/10 text-primary
                     flex items-center justify-center text-body-sm font-bold shrink-0"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-bold text-text-primary truncate">
            {customer.full_name}
          </p>
          {customer.customer_code && (
            <p className="text-caption">#{customer.customer_code}</p>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Phone */}
        <ContactRow icon={<Phone size={14} />} label="Điện thoại">
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="text-body-sm font-semibold text-primary hover:underline"
            >
              {customer.phone}
            </a>
          ) : (
            <span className="text-caption">Chưa cập nhật</span>
          )}
        </ContactRow>

        {/* Alt Phone */}
        {customer.alt_phone && (
          <ContactRow icon={<Phone size={14} />} label="SĐT phụ">
            <a
              href={`tel:${customer.alt_phone}`}
              className="text-body-sm text-text-primary"
            >
              {customer.alt_phone}
            </a>
          </ContactRow>
        )}

        {/* Email */}
        {customer.email && (
          <ContactRow icon={<Mail size={14} />} label="Email">
            <a
              href={`mailto:${customer.email}`}
              className="text-body-sm text-text-primary hover:text-primary truncate"
            >
              {customer.email}
            </a>
          </ContactRow>
        )}

        {/* Address */}
        {customer.address && (
          <ContactRow icon={<MapPin size={14} />} label="Địa chỉ">
            <p className="text-body-sm text-text-primary">{customer.address}</p>
          </ContactRow>
        )}

        {/* Wedding Date */}
        {customer.wedding_date && (
          <ContactRow icon={<Heart size={14} />} label="Ngày cưới">
            <p className="text-body-sm text-text-primary">
              {new Date(customer.wedding_date).toLocaleDateString("vi-VN")}
            </p>
          </ContactRow>
        )}

        {/* ── Bride / Groom — Stitch Clean Grid ── */}
        {brideName && (
          <ContactRow icon={<Heart size={14} />} label="Cô dâu">
            <p className="text-body-sm font-medium text-text-primary">
              {buildPersonStr(brideName, brideHeight, brideWeight, brideShoeSize)}
            </p>
            {bridePhone && (
              <a href={`tel:${bridePhone}`} className="text-body-sm text-primary hover:underline">
                {bridePhone}
              </a>
            )}
          </ContactRow>
        )}

        {groomName && (
          <ContactRow icon={<Heart size={14} />} label="Chú rể">
            <p className="text-body-sm font-medium text-text-primary">
              {buildPersonStr(groomName, groomHeight, groomWeight, groomShoeSize)}
            </p>
            {groomPhone && (
              <a href={`tel:${groomPhone}`} className="text-body-sm text-primary hover:underline">
                {groomPhone}
              </a>
            )}
          </ContactRow>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-4 p-3 rounded-md bg-bg-hover">
          <p className="text-caption font-semibold mb-1">Ghi chú</p>
          <p className="text-body-sm text-text-secondary">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Helper: Contact row ──────────────────────

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-text-muted shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-caption mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
