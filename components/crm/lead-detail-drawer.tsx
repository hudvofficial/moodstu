"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Pencil,
  CheckCircle2,
  XOctagon,
  UserCircle,
  Banknote,
  CalendarPlus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { format } from "date-fns";
import LeadCareLog from "./lead-care-log";
import LeadFormModal from "./lead-form-modal";
import { getLeadById } from "@/app/actions/lead-actions";
import {
  markLeadAsLost,
  convertLeadToCustomer,
  moveLeadToStage,
} from "@/app/actions/lead-lifecycle";
import { cacheKeys } from "@/lib/swr";
import {
  LEAD_STATUS_MAP,
  POTENTIAL_MAP,
  SOURCE_MAP,
  VALID_LEAD_TRANSITIONS,
} from "@/types/crm";
import type { CrmLead, LeadPotential, LeadStatus } from "@/types/crm";

// ════════════════════════════════════════════════════════════
// Helpers — Local to this drawer (SSOT: Badge component)
// ════════════════════════════════════════════════════════════

/** InfoRow — Eliminates 10× duplicate flex+border-b pattern */
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

/** Potential → Badge variant (replaces POTENTIAL_BADGE_COLORS) */
function getPotentialVariant(potential: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    hot: "error",
    warm: "warning",
    cold: "neutral",
  };
  return map[potential] || "neutral";
}

/** Score → Badge variant (replaces getScoreLevel inline colors) */
function getScoreBadge(score: number): { variant: BadgeVariant; label: string } {
  if (score >= 80) return { variant: "error", label: "Hot" };
  if (score >= 50) return { variant: "warning", label: "Warm" };
  if (score >= 25) return { variant: "info", label: "Cool" };
  return { variant: "neutral", label: "Cold" };
}

// ════════════════════════════════════════════════════════════
// LeadDetailDrawer — Gold Standard parity (Printing 1:1)
// ════════════════════════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  /** Mồi data từ list → SWR fallbackData → zero-loading */
  initialData?: CrmLead;
}

export default function LeadDetailDrawer({
  isOpen,
  onClose,
  leadId,
  initialData,
}: Props) {
  const router = useRouter();
  const [isLosing, setIsLosing] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isStageUpdating, setIsStageUpdating] = useState(false);
  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // SWR with fallbackData for zero-loading (SSOT: lib/swr.ts cacheKeys)
  const fetcher = async () => {
    if (!leadId) throw new Error("Không có ID");
    const result = await getLeadById(leadId);
    if (!result) throw new Error("Không nhận được phản hồi từ server");
    if (!result.success) throw new Error(result.error || "Lỗi tải dữ liệu");
    if (!result.data) throw new Error("Dữ liệu rỗng");
    return result.data as CrmLead;
  };

  const { data: lead, error: swrError, isLoading, mutate } = useSWR<CrmLead>(
    isOpen && leadId ? cacheKeys.leadDetail(leadId) : null,
    fetcher,
    { fallbackData: initialData },
  );

  const errorMsg = swrError
    ? swrError instanceof Error
      ? swrError.message
      : "Lỗi kết nối, vui lòng thử lại"
    : null;

  const { mutate: globalMutate } = useSWRConfig();

  // Reset local state when closed
  if (!isOpen && isLosing) setIsLosing(false);

  const handleEditClick = () => {
    setIsEditOpen(true);
  };

  const handleStageChange = async (newStage: string) => {
    if (!lead || !newStage || newStage === lead.status) return;
    setIsStageUpdating(true);
    try {
      const res = await moveLeadToStage(lead.id, newStage as LeadStatus);
      if (!res.success) throw new Error(res.error);
      globalMutate(cacheKeys.leadDetail(lead.id));
      globalMutate(cacheKeys.leads());
    } catch (err: unknown) {
      if (err instanceof Error)
        alert(err.message || "Lỗi khi chuyển trạng thái");
    } finally {
      setIsStageUpdating(false);
    }
  };

  const handleConvert = async () => {
    if (!lead) return;
    setIsConvertConfirmOpen(false);
    setIsConverting(true);
    try {
      const result = await convertLeadToCustomer(lead.id);
      if (!result.success) throw new Error(result.error);
      globalMutate(cacheKeys.leads());
      onClose();
      router.push(result.data.url);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message || "Lỗi khi chuyển đổi");
    } finally {
      setIsConverting(false);
    }
  };

  const handleMarkLost = async () => {
    if (!lead || !lostReason.trim()) return;
    try {
      const result = await markLeadAsLost(lead.id, lostReason);
      if (!result || ("success" in result && !result.success)) {
        throw new Error(result?.error || "Lỗi khi huỷ lead");
      }
      setIsLosing(false);
      setLostReason("");
      globalMutate(cacheKeys.leadDetail(lead.id));
      globalMutate(cacheKeys.leads());
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message || "Đã xảy ra lỗi");
    }
  };

  const validNextStatuses = lead
    ? VALID_LEAD_TRANSITIONS[lead.status] || []
    : [];
  const statusOptions = (
    Object.entries(LEAD_STATUS_MAP) as [
      LeadStatus,
      (typeof LEAD_STATUS_MAP)[LeadStatus],
    ][]
  )
    .filter(
      ([key]) => key === lead?.status || validNextStatuses.includes(key),
    )
    .map(([key, val]) => ({
      label: val.label,
      value: key,
    }));

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead?.contact_name || "Chi tiết Lead"}
      size="lg"
      titleBadge={
        lead ? (
          <Badge variant={getStatusVariant(lead.status)}>
            {LEAD_STATUS_MAP[lead.status as LeadStatus]?.label || lead.status}
          </Badge>
        ) : undefined
      }
      headerRight={
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditClick}
          disabled={!lead}
        >
          <Pencil className="w-4 h-4 mr-1" />
          Sửa
        </Button>
      }
    >
      {/* Loading — SSOT: Skeleton component */}
      {isLoading && !lead ? (
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
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
      ) : !lead ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col min-h-full pb-0">
          <div className="flex-1 space-y-5">
            {/* 1. Hero Section — Gold Standard (Printing L337-348) */}
            <div className="p-4 bg-bg-hover rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
                  {lead.source ? (SOURCE_MAP[lead.source]?.label || lead.source) : "Lead"}
                </p>
                <p className="text-h3">{lead.contact_name}</p>
              </div>
              {lead.phone && (
                <div className="text-right">
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
                    Liên hệ
                  </p>
                  <a
                    href={`tel:${lead.phone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag: string) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 2. DataRow Card — InfoRow helper + SSOT tokens */}
            <div className="bg-surface border border-border/50 rounded-xl overflow-hidden shadow-xs">
              {lead.phone && (
                <InfoRow icon={Phone} label="Điện thoại">
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm font-medium text-primary hover:underline line-clamp-1"
                  >
                    {lead.phone}
                  </a>
                </InfoRow>
              )}
              {lead.email && (
                <InfoRow icon={Mail} label="Email">
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm font-medium text-text hover:text-primary transition-colors line-clamp-1"
                  >
                    {lead.email}
                  </a>
                </InfoRow>
              )}
              {lead.source && (
                <InfoRow icon={Building2} label="Nguồn">
                  <span className="text-sm font-medium text-text">
                    {SOURCE_MAP[lead.source]?.label || lead.source}
                  </span>
                </InfoRow>
              )}
              {lead.assigned_to && lead.employees && (
                <InfoRow icon={UserCircle} label="Người phụ trách">
                  <span className="text-sm font-medium text-text">
                    {lead.employees.full_name}
                  </span>
                </InfoRow>
              )}

              {/* Desktop 2-col pairs — SSOT: form-grid-2col (auto 1-col mobile) */}
              <div className="form-grid-2col">
                {lead.deal_value > 0 && (
                  <InfoRow icon={Banknote} label="Giá trị dự kiến">
                    <span className="text-sm font-medium text-primary">
                      {lead.deal_value.toLocaleString("vi-VN")}đ
                    </span>
                  </InfoRow>
                )}
                {lead.potential && (
                  <InfoRow icon={AlertCircle} label="Tiềm năng">
                    <Badge variant={getPotentialVariant(lead.potential)} solid>
                      {POTENTIAL_MAP[lead.potential as LeadPotential]?.label ||
                        lead.potential}
                    </Badge>
                  </InfoRow>
                )}
              </div>

              <div className="form-grid-2col">
                {lead.score > 0 && (
                  <InfoRow icon={CheckCircle2} label="Điểm (Score)">
                    <Badge variant={getScoreBadge(lead.score).variant} solid>
                      {lead.score} — {getScoreBadge(lead.score).label}
                    </Badge>
                  </InfoRow>
                )}
                {lead.next_contact_date && (
                  <InfoRow icon={CalendarPlus} label="Lịch hẹn tiếp">
                    <Badge variant="primary">
                      {format(
                        new Date(lead.next_contact_date),
                        "dd/MM/yyyy",
                      )}
                    </Badge>
                  </InfoRow>
                )}
              </div>

              {/* Address — multiline variant */}
              {lead.address && (
                <div className="flex flex-col gap-1.5 p-3.5 border-b border-border/50">
                  <div className="flex items-center gap-2.5 text-text-muted">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Địa chỉ</span>
                  </div>
                  <span className="text-sm font-medium text-text pl-[26px]">
                    {lead.address}
                  </span>
                </div>
              )}

              {/* Stage dropdown — compact inside card */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5 text-text-muted shrink-0">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">Giai đoạn</span>
                </div>
                <div className="w-full max-w-[200px]">
                  <SelectForm
                    options={statusOptions}
                    value={lead.status}
                    onChange={handleStageChange}
                    disabled={isStageUpdating}
                    placeholder="Chuyển giai đoạn..."
                  />
                </div>
              </div>
            </div>

            {/* Notes — SSOT: label-base */}
            {lead.notes && (
              <div className="space-y-1.5">
                <label className="label-base">Ghi chú & Nhu cầu</label>
                <div className="text-sm text-text bg-bg-base/50 border border-border/30 shadow-xs p-3.5 rounded-lg whitespace-pre-wrap">
                  {lead.notes}
                </div>
              </div>
            )}

            {/* Care History */}
            <div className="pt-1">
              <LeadCareLog leadId={lead.id} history={lead.care_history} />
            </div>
          </div>

          {/* 5. Sticky Footer — Gold Standard (Printing L504) */}
          <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
            {isLosing ? (
              <div className="w-full space-y-3">
                <label className="label-base text-error">
                  Lý do huỷ Lead
                </label>
                <Textarea
                  placeholder="Nhập lý do..."
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLosing(false)}
                  >
                    Đóng
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleMarkLost}
                    disabled={!lostReason.trim()}
                  >
                    Xác nhận Huỷ
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="danger"
                  onClick={() => setIsLosing(true)}
                  disabled={
                    isConverting || isStageUpdating || lead.status === "huy"
                  }
                >
                  <XOctagon className="w-4 h-4" />
                  Huỷ Lead
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="ghost" onClick={onClose}>
                    Đóng
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsConvertConfirmOpen(true)}
                    disabled={isConverting || isStageUpdating}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Chốt
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConvertConfirmOpen}
        onClose={() => setIsConvertConfirmOpen(false)}
        onConfirm={handleConvert}
        title="Xác nhận chốt Deal"
        message={`Bạn có chắc chắn muốn chuyển Lead "${lead?.contact_name}" thành Khách hàng? Bấm Xác nhận, hệ thống sẽ mở màn hình tạo Hợp đồng mới.`}
        confirmLabel="Chốt & Tạo HĐ"
        variant="default"
      />

      {/* ── Form Modal for Editing ── */}
      {lead && (
        <LeadFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initialData={lead}
          onSaved={() => {
            globalMutate(cacheKeys.leads());
            globalMutate(cacheKeys.leadDetail(lead.id));
            setIsEditOpen(false);
          }}
        />
      )}
    </Drawer>
  );
}
