"use client";

import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SimpleSelect } from "@/components/ui/simple-select";
import DatePicker from "@/components/ui/date-picker";
import { EVENT_TYPE_MAP, isOnSetEvent } from "@/types/contract-constants";
import { addContractEvent } from "@/app/actions/contract-event-actions";
import type { EventType } from "@/types/contract";

// ═══════════════════════════════════════════
// AddEventModal — Hybrid Model: Admin tạo event tùy chỉnh
// SSOT: UnifiedModal, SimpleSelect, DatePicker, .input-base
// ═══════════════════════════════════════════

// ─── Event type options from SSOT ─────────
const EVENT_TYPE_OPTIONS = (
  Object.entries(EVENT_TYPE_MAP) as [EventType, { label: string }][]
).map(([value, { label }]) => ({ value, label }));

// ─── Props ────────────────────────────────
interface Props {
  isOpen: boolean;
  contractId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEventModal({
  isOpen,
  contractId,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("ngay_chup");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOnSet = isOnSetEvent(eventType);

  const resetForm = () => {
    setTitle("");
    setEventType("ngay_chup");
    setDate("");
    setLocation("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên sự kiện");
      return;
    }
    if (!date) {
      toast.error(isOnSet ? "Vui lòng chọn ngày diễn ra" : "Vui lòng chọn hạn hoàn thành");
      return;
    }

    setSubmitting(true);
    try {
      const result = await addContractEvent({
        contractId,
        eventType,
        title: title.trim(),
        ...(isOnSet ? { eventDate: date || undefined } : { deadline: date || undefined }),
        location: location || undefined,
        notes: notes || undefined,
      });

      if (!result.success) throw new Error(result.error);

      toast.success(`Đã thêm sự kiện "${title.trim()}"`);
      resetForm();
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi thêm sự kiện");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Footer ──────────────────────────────
  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <button onClick={onClose} className="btn btn-secondary" disabled={submitting}>
        Hủy
      </button>
      <button
        onClick={handleSubmit}
        disabled={submitting || !title.trim()}
        className="btn btn-primary"
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Đang thêm...
          </>
        ) : (
          <>
            <CalendarPlus size={14} />
            Thêm sự kiện
          </>
        )}
      </button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm sự kiện"
      footer={footer}
      size="md"
    >
      <div className="space-y-4">
        {/* Tên sự kiện — required */}
        <div>
          <label className="label-base">
            Tên sự kiện <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Engagement Party, After Party..."
            className="input-base"
            autoFocus
          />
        </div>

        {/* Loại sự kiện + Ngày — 2 col */}
        <div className="form-grid-2col">
          <SimpleSelect
            label="Loại sự kiện"
            value={eventType}
            onChange={(val) => setEventType(val as EventType)}
            options={EVENT_TYPE_OPTIONS}
          />
          <DatePicker
            label={isOnSet ? "Ngày diễn ra" : "Hạn hoàn thành"}
            required
            value={date || undefined}
            onChange={(val) => setDate(val || "")}
            placeholder="Chọn ngày"
          />
        </div>

        {/* Địa điểm — optional */}
        <div>
          <label className="label-base">Địa điểm</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="VD: Studio, Nhà thờ, Ngoại cảnh..."
            className="input-base"
          />
        </div>

        {/* Ghi chú — optional */}
        <div>
          <label className="label-base">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú cho sự kiện..."
            className="input-base min-h-18 resize-none"
            rows={2}
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
