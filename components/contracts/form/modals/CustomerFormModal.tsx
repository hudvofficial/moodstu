"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { createCustomer } from "@/app/actions/customer-actions";
import { searchCustomers } from "@/app/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { CustomerFormData } from "@/types/crm";

// ═══════════════════════════════════════════
// CustomerFormModal — Quick Create from Contract Form
// Phone dedup check + auto-select on success
// ═══════════════════════════════════════════

interface CustomerResult {
  id: string;
  full_name: string;
  phone: string | null;
  bride_name: string | null;
  groom_name: string | null;
  bride_phone: string | null;
  bride_height: number | null;
  bride_weight: number | null;
  bride_shoe_size: number | null;
  groom_phone: string | null;
  groom_height: number | null;
  groom_weight: number | null;
  groom_shoe_size: number | null;
  wedding_date: string | null;
  address: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: CustomerResult) => void;
  showCoupleFields?: boolean;
  /** V1 pattern: pre-fill name from search query */
  initialName?: string;
}


export function CustomerFormModal({ isOpen, onClose, onCreated, showCoupleFields, initialName = "" }: Props) {
  // V1 pattern: key-based reset — form resets when modal reopens
  const formKey = initialName || (isOpen ? "open" : "closed");

  const [form, setForm] = useState<CustomerFormData>({
    full_name: initialName,
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phoneDupWarning, setPhoneDupWarning] = useState("");
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when the modal opens or the initial name changes. Depend only
  // on `initialName` (primitive) to avoid resetting on every realtime update.
  useEffect(() => {
    if (!isOpen) return;
    setForm({ full_name: initialName, phone: "" });
    setError("");
    setPhoneDupWarning("");
  }, [isOpen, initialName]);

  const updateField = useCallback(
    <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setError("");
    },
    []
  );

  // Phone dedup check
  const checkPhoneDuplicate = useCallback(async (phone: string) => {
    if (!phone || phone.length < 8) {
      setPhoneDupWarning("");
      return;
    }
    const result = await searchCustomers(phone);
    if (result.success && result.data.length > 0) {
      const match = result.data[0] as CustomerResult;
      setPhoneDupWarning(`SĐT đã tồn tại: ${match.full_name}`);
    } else {
      setPhoneDupWarning("");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.full_name.trim()) {
      setError("Tên khách hàng là bắt buộc");
      return;
    }

    if (!form.phone?.trim()) {
      setError("Số điện thoại là bắt buộc");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await createCustomer(form);
      if (!result.success) {
        setError(result.error);
        return;
      }

      // Handle duplicate phone case
      if (result.data.duplicate) {
        setError(`SĐT đã tồn tại cho khách hàng: ${result.data.customer_name}`);
        return;
      }

      // Build customer result for auto-select
      const newCustomer: CustomerResult = {
        id: result.data.customer_id,
        full_name: form.full_name.trim(),
        phone: form.phone?.trim() || null,
        bride_name: form.bride_name?.trim() || null,
        groom_name: form.groom_name?.trim() || null,
        bride_phone: null,
        bride_height: null,
        bride_weight: null,
        bride_shoe_size: null,
        groom_phone: null,
        groom_height: null,
        groom_weight: null,
        groom_shoe_size: null,
        wedding_date: form.wedding_date || null,
        address: form.address?.trim() || null,
      };

      onCreated(newCustomer);
      // Reset form
      setForm({ full_name: "", phone: "" });
      setPhoneDupWarning("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo khách hàng");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onCreated]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo khách hàng mới"
    >
      {/* V1 pattern: key-based reset — React remounts when formKey changes */}
      <div key={formKey} className="space-y-4 p-4">
        {/* V1 pattern: fieldset locks ALL inputs during submit */}
        <fieldset disabled={isSubmitting} className="space-y-4">
        {/* Full name */}
        <FormField label="Tên khách hàng *">
          <Input
            type="text"
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </FormField>

        {/* Phone + dedup */}
        <FormField label="Số điện thoại *">
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => {
              updateField("phone", e.target.value);
              // B10: Debounce 500ms — tránh spam API mỗi keystroke
              if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
              phoneDebounceRef.current = setTimeout(() => {
                checkPhoneDuplicate(e.target.value);
              }, 500);
            }}
            placeholder="0901234567"
          />
          {phoneDupWarning && (
            <p className="warning-text">
              <AlertTriangle className="h-3 w-3" />
              {phoneDupWarning}
            </p>
          )}
        </FormField>

        {/* Email + Address row */}
        <div className="form-grid-2col">
          <FormField label="Email">
            <Input
              type="email"
              value={form.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="email@example.com"
            />
          </FormField>
          <FormField label="Địa chỉ">
            <Input
              type="text"
              value={form.address || ""}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Quận, Thành phố"
            />
          </FormField>
        </div>

        {/* Source và Ngày cưới đã xóa — V1 pattern: quick-create chỉ cần thông tin cơ bản */}

        {/* Couple fields (conditional) */}
        {showCoupleFields && (
          <div className="form-grid-2col">
            <FormField label="Tên cô dâu">
              <Input
                type="text"
                value={form.bride_name || ""}
                onChange={(e) => updateField("bride_name", e.target.value)}
                placeholder="Tên cô dâu"
              />
            </FormField>
            <FormField label="Tên chú rể">
              <Input
                type="text"
                value={form.groom_name || ""}
                onChange={(e) => updateField("groom_name", e.target.value)}
                placeholder="Tên chú rể"
              />
            </FormField>
          </div>
        )}

        {/* Notes */}
        <FormField label="Ghi chú">
          <Textarea
            value={form.notes || ""}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Ghi chú thêm..."
            rows={2}
            className="resize-none"
          />
        </FormField>

        {/* Error */}
        {error && (
          <p className="error-text">{error}</p>
        )}
        </fieldset>

        {/* Actions */}
        <div className="form-actions">
          <Button
            type="button"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="interactive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo khách hàng
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

// ── Reusable form field wrapper ──
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">
        {label}
      </label>
      {children}
    </div>
  );
}
