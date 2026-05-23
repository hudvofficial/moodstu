"use client";

import { useState } from "react";
import { 
  Pencil, Trash2, Phone, Mail, Calendar, MapPin, 
  User, Copy, MessageCircle, AlertTriangle, 
  Clock, CheckCircle2, FileText, Send, Heart
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatVnd, getInitials } from "@/lib/utils";
import type { Customer } from "@/types/crm";
import { SOURCE_MAP } from "@/types/crm";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"wedding" | "care" | "contracts">("wedding");
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  if (!customer || !isOpen) return null;

  const handleSaveNote = async () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;

    setIsSavingNote(true);
    const timestamp = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const newEntry = `[${timestamp}] ${trimmed}`;
    const updatedNotes = customer.notes 
      ? `${newEntry}\n\n${customer.notes}`
      : newEntry;

    try {
      const { updateCustomer } = await import("@/app/actions/customer-actions");
      await updateCustomer(customer.id, { notes: updatedNotes });
      toast.success("Đã lưu ghi chú");
      setNoteInput("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu ghi chú");
    } finally {
      setIsSavingNote(false);
    }
  };

  const sourceInfo = customer.source
    ? SOURCE_MAP[customer.source] || { label: customer.source }
    : null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

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
      width="540px" // Gọn gàng vừa phải, rộng hơn xíu so với md mặc định để chứa đủ thông tin
    >
      <div className="flex flex-col gap-5">
        
        {/* ── Section: Khách hàng (Profile) - Mobile First / Desktop Optimized ── */}
        <section className="card-base p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full text-left">
            
            {/* INFO ROW (Avatar + Text) */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-full sm:rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl sm:text-lg font-black shrink-0 border border-primary/5">
                {getInitials(customer.full_name)}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-body-sm font-bold text-text-main truncate">
                  {customer.full_name}
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-tiny text-text-muted mt-1 sm:mt-0.5">
                  {customer.phone && (
                    <span className="flex items-center gap-1.5 sm:gap-1 font-medium text-text-secondary">
                      <Phone className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1.5 sm:gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS 
                Mobile: Full width row, 44px touch targets (Apple HIG)
                Desktop: Compact inline 32px icon buttons 
            */}
            {customer.phone && (
              <div className="flex items-center gap-2 sm:gap-1 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-border/40 sm:border-none">
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none h-11 sm:w-8 sm:h-8 sm:px-0 flex items-center justify-center rounded-xl sm:rounded-full bg-primary/5 sm:bg-transparent sm:hover:bg-primary/10 text-primary border-primary/10 sm:border-transparent transition-colors shadow-none sm:shadow-none gap-2 sm:gap-0" 
                  onClick={() => window.open(`tel:${customer.phone}`)}
                  title="Gọi điện"
                >
                  <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="sm:hidden text-xs font-semibold uppercase tracking-wider">Gọi điện</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none h-11 sm:w-8 sm:h-8 sm:px-0 flex items-center justify-center rounded-xl sm:rounded-full bg-slate-50 sm:bg-transparent sm:hover:bg-slate-100 text-text-secondary sm:text-text-muted border-border/60 sm:border-transparent transition-colors shadow-none sm:shadow-none gap-2 sm:gap-0" 
                  onClick={() => handleCopy(customer.phone!, "SĐT")}
                  title="Copy SĐT"
                >
                  <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="sm:hidden text-xs font-semibold uppercase tracking-wider">Copy SĐT</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Section: Giao dịch & Hệ thống chuẩn Phase 1 ── */}
        <section className="card-base p-4">
          <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Giao dịch
          </h4>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100/50 flex flex-col justify-center">
              <span className="text-tiny font-bold text-emerald-600/70 uppercase tracking-wide block mb-0.5">Tổng chi tiêu (LTV)</span>
              <span className="text-body-sm font-black text-emerald-700 truncate block">
                {customer.ltv && customer.ltv > 0 ? formatVnd(customer.ltv) : "0 VND"}
              </span>
            </div>
            <div className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-center">
              <span className="text-tiny font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Ngày tạo hồ sơ</span>
              <span className="text-body-sm font-bold text-slate-700 truncate block">
                {formatDate(customer.created_at)}
              </span>
            </div>
          </div>
        </section>

        {/* ── TABS NGHIỆP VỤ ── */}
        <div className="flex flex-col flex-1 min-h-[300px]">
          {/* Tabs Header */}
          <div className="flex gap-1 mb-3 bg-neutral-100/60 rounded-lg p-1 shrink-0">
            <TabButton active={activeTab === "wedding"} onClick={() => setActiveTab("wedding")} icon={<Heart className="w-4 h-4" />}>
              Hồ sơ Cưới
            </TabButton>
            <TabButton active={activeTab === "care"} onClick={() => setActiveTab("care")} icon={<Clock className="w-4 h-4" />}>
              CSKH
            </TabButton>
            <TabButton active={activeTab === "contracts"} onClick={() => setActiveTab("contracts")} icon={<FileText className="w-4 h-4" />}>
              Hợp đồng
            </TabButton>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* TAB: HỒ SƠ CƯỚI */}
            {activeTab === "wedding" && (
              <section className="card-base p-5">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                    Hồ sơ Cưới hỏi
                  </h4>
                  {customer.wedding_date && (
                    <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1">
                      Cưới: {formatDate(customer.wedding_date)}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
                  {/* Cô Dâu */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-pink-600">
                      <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide">Cô Dâu</span>
                    </div>
                    
                    <div className="pl-9 space-y-3">
                      <div>
                        <div className="text-sm font-bold text-text-main mb-1">{customer.bride_name || "Chưa cập nhật"}</div>
                        <div className="text-xs text-text-secondary flex items-center gap-2">
                          <Phone className="w-3 h-3 text-text-muted" /> {customer.bride_phone || "—"}
                        </div>
                      </div>
                      
                      {/* Measurements grouped */}
                      <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-lg p-2">
                        <MeasurementGroup value={customer.bride_height} unit="cm" label="Cao" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <MeasurementGroup value={customer.bride_weight} unit="kg" label="Nặng" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <MeasurementGroup value={customer.bride_shoe_size} unit="" label="Giày" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Chú Rể */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide">Chú Rể</span>
                    </div>
                    
                    <div className="pl-9 space-y-3">
                      <div>
                        <div className="text-sm font-bold text-text-main mb-1">{customer.groom_name || "Chưa cập nhật"}</div>
                        <div className="text-xs text-text-secondary flex items-center gap-2">
                          <Phone className="w-3 h-3 text-text-muted" /> {customer.groom_phone || "—"}
                        </div>
                      </div>
                      
                      {/* Measurements grouped */}
                      <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-lg p-2">
                        <MeasurementGroup value={customer.groom_height} unit="cm" label="Cao" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <MeasurementGroup value={customer.groom_weight} unit="kg" label="Nặng" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <MeasurementGroup value={customer.groom_shoe_size} unit="" label="Giày" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: LỊCH SỬ CSKH */}
            {activeTab === "care" && (
              <div className="space-y-4">
                {/* Add Note Input (Mock UI) */}
                <div className="flex gap-3 items-start mb-6">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-xs mt-0.5 border border-primary/5">
                    NV
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea 
                      placeholder="Ghi chú tương tác / CSKH..." 
                      className="input-base w-full min-h-[80px] p-3 text-body-sm resize-none"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveNote();
                        }
                      }}
                      disabled={isSavingNote}
                    ></textarea>
                    <div className="flex justify-end">
                      <Button 
                        unstyled 
                        className="btn btn-primary h-8 px-4 text-xs font-semibold gap-1.5 rounded-lg flex items-center shadow-sm"
                        onClick={handleSaveNote}
                        disabled={!noteInput.trim() || isSavingNote}
                      >
                        <Send className="w-3.5 h-3.5" /> {isSavingNote ? "Đang lưu..." : "Lưu ghi chú"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timeline / Notes */}
                <div className="card-base p-0 overflow-hidden relative">
                  <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-main">Nhật ký chăm sóc</h4>
                  </div>
                  <div className="p-4">
                    {customer.notes ? (
                      <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            Hệ thống • {formatDate(customer.created_at)}
                          </div>
                          <div className="bg-bg-subtle p-3 rounded-lg text-sm text-text-secondary whitespace-pre-wrap border border-border/50 shadow-sm">
                            {customer.notes}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="text-sm text-slate-500 font-medium">Chưa có lịch sử chăm sóc</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HỢP ĐỒNG */}
            {activeTab === "contracts" && (
              <div className="space-y-4">
                <div className="card-base p-8 text-center border-dashed">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-text-main mb-1">Chưa có hợp đồng nào</h4>
                  <p className="text-xs text-text-muted mb-4">Khách hàng này hiện chưa ký hợp đồng dịch vụ nào.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-medium h-8"
                    onClick={() => {
                      onClose();
                      router.push(`/contracts/create?customer_id=${customer.id}`);
                    }}
                  >
                    + Tạo hợp đồng mới
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────

function TabButton({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-md transition-all ${
        active 
          ? "bg-white text-text-main shadow-sm ring-1 ring-black/5" 
          : "text-text-muted hover:text-text-secondary hover:bg-black/5"
      }`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Measurement({ value, unit, label }: { value?: number | null; unit: string; label: string }) {
  return (
    <div className="w-[72px] bg-slate-50 border border-slate-100 rounded-md p-1.5 flex flex-col items-center justify-center text-center shrink-0">
      <span className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-xs font-bold text-text-main">
        {value ? (
          <>{value} <span className="font-medium text-tiny text-text-muted">{unit}</span></>
        ) : (
          <span className="text-text-muted/30">—</span>
        )}
      </span>
    </div>
  );
}

function MeasurementGroup({ value, unit, label }: { value?: number | null; unit: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <span className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-xs font-bold text-text-main">
        {value ? (
          <>{value} <span className="font-medium text-tiny text-text-muted">{unit}</span></>
        ) : (
          <span className="text-text-muted/30">—</span>
        )}
      </span>
    </div>
  );
}
