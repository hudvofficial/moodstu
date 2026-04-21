"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { createDebt } from "@/app/actions/debt-actions";
import { fetchCreditCards } from "@/app/actions/finance-operations-queries";
import type { CreditCardOption } from "@/app/actions/finance-operations-queries";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CreditCard, Calculator } from "lucide-react";

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ENTITY_TYPE_OPTIONS = [
  { value: "khach_hang", label: "Khách hàng" },
  { value: "nha_cung_cap", label: "Nhà cung cấp" },
  { value: "nhan_vien", label: "Nhân viên" },
  { value: "khac", label: "Khác" },
];

const DEBT_TYPE_OPTIONS = [
  { value: "Phải thu", label: "Phải thu" },
  { value: "Phải trả", label: "Phải trả" },
];

const PLATFORM_OPTIONS = [
  { value: "none", label: "Chọn sàn..." },
  { value: "shopee_spaylater", label: "Shopee SpayLater" },
  { value: "kredivo", label: "Kredivo" },
  { value: "momo", label: "MoMo" },
  { value: "home_credit", label: "Home Credit" },
  { value: "fe_credit", label: "FE Credit" },
  { value: "tiki", label: "Tiki" },
  { value: "lazada", label: "Lazada" },
  { value: "khac", label: "Khác" },
];

const PRESET_PERIODS = [3, 6, 9, 12, 18, 24];

type DebtMode = "standard" | "installment";

interface FormState {
  entity_name: string;
  entity_type: string;
  type: string;
  amount: number;
  due_date: string;
  notes: string;
  // Installment fields
  platform: string;
  card_id: string;
  installment_total: number;
  installment_amount: number;
}

const INITIAL_FORM: FormState = {
  entity_name: "",
  entity_type: "khach_hang",
  type: "Phải trả",
  amount: 0,
  due_date: "",
  notes: "",
  platform: "none",
  card_id: "none",
  installment_total: 0,
  installment_amount: 0,
};

export function DebtFormModal({ isOpen, onClose, onSaved }: DebtFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<DebtMode>("standard");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [cards, setCards] = useState<CreditCardOption[]>([]);

  // Load credit cards when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchCreditCards().then((r) => {
      if (r.success) setCards(r.data);
    });
  }, [isOpen]);

  // Auto-calc tổng tiền khi mode installment
  const autoTotal = mode === "installment" && form.installment_total > 0 && form.installment_amount > 0
    ? form.installment_total * form.installment_amount
    : 0;

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((c) => ({ ...c, [key]: value }));
  }, []);

  const switchMode = useCallback((newMode: DebtMode) => {
    setMode(newMode);
    if (newMode === "standard") {
      setForm((c) => ({ ...c, platform: "none", card_id: "none", installment_total: 0, installment_amount: 0 }));
    }
  }, []);

  const handlePresetPeriod = useCallback((period: number) => {
    setForm((c) => ({ ...c, installment_total: period }));
  }, []);

  const resetAndClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setMode("standard");
    onClose();
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const finalAmount = mode === "installment" ? autoTotal : form.amount;
    if (finalAmount <= 0) {
      toast.error("Số tiền công nợ phải lớn hơn 0.");
      return;
    }

    setSaving(true);
    const result = await createDebt({
      entity_name: form.entity_name,
      entity_type: form.entity_type as "nha_cung_cap" | "khach_hang" | "nhan_vien" | "khac",
      type: form.type as "Phải thu" | "Phải trả",
      amount: finalAmount,
      due_date: form.due_date || null,
      notes: form.notes || null,
      // Installment fields
      ...(mode === "installment"
        ? {
          installment_total: form.installment_total || null,
          installment_paid: 0,
          installment_amount: form.installment_amount || null,
          platform: form.platform === "none" ? null : form.platform,
          card_id: form.card_id === "none" ? null : form.card_id,
        }
        : {}),
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo công nợ.");
    resetAndClose();
    onSaved();
  };

  const cardOptions = [
    { value: "none", label: "Không liên kết thẻ" },
    ...cards.map((c) => ({
      value: c.id,
      label: `${c.bank_name}${c.last_4 ? ` ****${c.last_4}` : ""}${c.due_day ? ` (hạn ${c.due_day})` : ""}`,
    })),
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Thêm công nợ"
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={resetAndClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="debt-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu công nợ"}
          </Button>
        </div>
      }
    >
      <form id="debt-form" onSubmit={submit} className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 rounded-lg bg-bg-input">
          <Button unstyled
            type="button"
            onClick={() => switchMode("standard")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${mode === "standard"
              ? "bg-bg-card text-primary shadow-sm"
              : "text-muted hover:text-secondary"
              }`}
          >
            Khoản thường
          </Button>
          <Button unstyled
            type="button"
            onClick={() => switchMode("installment")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === "installment"
              ? "bg-bg-card text-primary shadow-sm"
              : "text-muted hover:text-secondary"
              }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Trả góp
          </Button>
        </div>

        {/* Common fields */}
        <div className="form-grid-2col">
          <Input
            label="Đối tượng"
            value={form.entity_name}
            onChange={(e) => handleChange("entity_name", e.target.value)}
            required
          />
          <SimpleSelect
            label="Nhóm"
            value={form.entity_type}
            onChange={(v) => handleChange("entity_type", v)}
            options={ENTITY_TYPE_OPTIONS}
          />
          <SimpleSelect
            label="Loại công nợ"
            value={form.type}
            onChange={(v) => handleChange("type", v)}
            options={DEBT_TYPE_OPTIONS}
          />
          <DatePicker
            label="Hạn thanh toán"
            value={form.due_date}
            onChange={(v) => handleChange("due_date", v)}
          />
        </div>

        {/* Standard mode: simple amount */}
        {mode === "standard" && (
          <CurrencyInput
            label="Số tiền"
            value={form.amount}
            onChange={(v) => handleChange("amount", v)}
            required
          />
        )}

        {/* Installment mode */}
        {mode === "installment" && (
          <div className="space-y-4">
            {/* Platform + Credit Card */}
            <div className="form-grid-2col">
              <SimpleSelect
                label="Sàn / Đơn vị tín dụng"
                value={form.platform}
                onChange={(v) => handleChange("platform", v)}
                options={PLATFORM_OPTIONS.filter(o => o.value && o.value !== "")}
              />
              <SimpleSelect
                label="Thẻ tín dụng"
                value={form.card_id}
                onChange={(v) => handleChange("card_id", v)}
                options={cardOptions.filter(o => o.value && o.value !== "")}
              />
            </div>

            {/* Preset period chips */}
            <div>
              <label className="label-base mb-1.5 block">Số kỳ trả góp</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_PERIODS.map((p) => (
                  <Button unstyled
                    key={p}
                    type="button"
                    onClick={() => handlePresetPeriod(p)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${form.installment_total === p
                      ? "border-interactive bg-interactive/10 text-interactive font-medium"
                      : "border-border-primary bg-bg-card text-secondary hover:border-interactive/50"
                      }`}
                  >
                    {p} kỳ
                  </Button>
                ))}
                <Input
                  value={form.installment_total > 0 && !PRESET_PERIODS.includes(form.installment_total) ? String(form.installment_total) : ""}
                  onChange={(e) => handleChange("installment_total", Number(e.target.value) || 0)}
                  placeholder="Tùy chỉnh..."
                  className="!w-24 !py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Amount per installment */}
            <CurrencyInput
              label="Số tiền mỗi kỳ"
              value={form.installment_amount}
              onChange={(v) => handleChange("installment_amount", v)}
              required
            />

            {/* Auto-calc total card */}
            {autoTotal > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-interactive/5 border border-interactive/20">
                <Calculator className="w-5 h-5 text-interactive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">Tổng tiền trả góp</p>
                  <p className="text-base font-semibold text-primary">
                    {form.installment_total} kỳ × {form.installment_amount.toLocaleString("vi-VN")}₫ ={" "}
                    <span className="text-interactive">{autoTotal.toLocaleString("vi-VN")}₫</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Textarea
          label="Ghi chú"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
        />
      </form>
    </UnifiedModal>
  );
}
