"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { TagsInput } from "@/components/ui/tags-input";
import { ZodLeadCreate } from "@/lib/validations/crm.schema";

import { POTENTIAL_MAP, SOURCE_MAP } from "@/types/crm";
import type { CrmLead, LeadPotential } from "@/types/crm";
import { cacheKeys } from "@/lib/swr";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import { createLead, updateLead } from "@/app/actions/lead-actions";

// ════════════════════════════════════════════════════════════
// LeadFormModal — Core UI form for creating and updating Leads
// Phase 03: Strictly enforces SSOT style inputs (.form-grid-2col)
// using standard React state since react-hook-form is avoided in V2.
// ════════════════════════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: CrmLead | null;
}

export default function LeadFormModal({ isOpen, onClose, onSaved, initialData }: Props) {
  const isEditing = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [source, setSource] = useState("");
  const [needs, setNeeds] = useState("");
  const [address, setAddress] = useState("");
  const [potential, setPotential] = useState("");
  const [notes, setNotes] = useState("");
  const [dealValue, setDealValue] = useState(0);
  const [score, setScore] = useState(0);
  const [nextContactDate, setNextContactDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [tagsArray, setTagsArray] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch employees for assignment (only when modal is open to prevent SWR leaks)
  const { data: employeesResult } = useSWR(isOpen ? cacheKeys.employees() : null, () => getActiveEmployees());
  const employees = employeesResult && "success" in employeesResult && employeesResult.success ? employeesResult.data : [];
  const employeeOptions = employees.map((e: { id: string; full_name: string }) => ({
    label: e.full_name,
    value: e.id,
  }));

  const sourceOptions = Object.entries(SOURCE_MAP).map(([key, val]) => ({
    label: val.label,
    value: key,
  }));

  const potentialOptions = Object.entries(POTENTIAL_MAP).map(([key, val]) => ({
    label: val.label,
    value: key,
  }));

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setContactName(initialData.contact_name);
        setPhone(initialData.phone || "");
        setEmail(initialData.email || "");
        setSocialLink(initialData.social_link || "");
        setSource(initialData.source || "");
        setNeeds(initialData.needs || "");
        setAddress(initialData.address || "");
        setPotential(initialData.potential || "");
        setNotes(initialData.notes || "");
        setDealValue(initialData.deal_value || 0);
        setScore(initialData.score || 0);
        setNextContactDate(initialData.next_contact_date || "");
        setAssignedTo(initialData.assigned_to || "");
        setTagsArray(initialData.tags || []);
        setErrors({});
      } else {
        setContactName("");
        setPhone("");
        setEmail("");
        setSocialLink("");
        setSource("");
        setNeeds("");
        setAddress("");
        setPotential("");
        setNotes("");
        setDealValue(0);
        setScore(0);
        setNextContactDate("");
        setAssignedTo("");
        setTagsArray([]);
        setErrors({});
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, unknown> = {
      contact_name: contactName,
      phone: phone || undefined,
      email: email || undefined,
      social_link: socialLink || undefined,
      source: source || undefined,
      needs: needs || undefined,
      address: address || undefined,
      potential: (potential as LeadPotential) || undefined,
      notes: notes || undefined,
      deal_value: dealValue,
      score,
      next_contact_date: nextContactDate || undefined,
      assigned_to: assignedTo || undefined,
      tags: tagsArray,
    };

    // Immediate Client-Side Validation against Gold Standard Schema
    const parsed = ZodLeadCreate.safeParse(payload);
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      parsed.error.issues.forEach(issue => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }
    setErrors({});

    // Đóng modal NGAY (close + revalidate) — create sinh lead_id + dup-phone check ở server.
    if (isEditing && initialData) {
      payload.expectedUpdatedAt = initialData.updated_at || undefined;
    } else {
      payload.status = "moi";
      payload.contact_date = format(new Date(), "yyyy-MM-dd");
    }
    const editId = isEditing && initialData ? initialData.id : null;
    setIsSubmitting(true);
    onClose();
    try {
      const result = editId
        ? await updateLead(editId, payload)
        : await createLead(payload);
      if (!result.success) throw new Error(result.error);
      onSaved();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message || "Đã xảy ra lỗi khi lưu khách hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Cập nhật Lead" : "Thêm Lead mới"}
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="lead-form" variant="primary" disabled={isSubmitting}>
            {isEditing ? "Cập nhật Lead" : "Tạo Lead"}
          </Button>
        </div>
      }
    >
      <form id="lead-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 */}
        <div className="form-grid-2col">
          <Input
            label="Tên liên hệ *"
            placeholder="VD: Nguyễn Văn A"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={errors.contact_name}
            required
          />
          <Input
            label="Số điện thoại"
            placeholder="VD: 09..."
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
        </div>

        {/* Row 2 */}
        <div className="form-grid-2col">
          <Input
            label="Email"
            placeholder="VD: email@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            label="Link MXH (Facebook/Zalo)"
            placeholder="VD: https://facebook.com/..."
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            error={errors.social_link}
          />
        </div>

        {/* Row 3 */}
        <div className="form-grid-2col">
          <SelectForm
            label="Nguồn khách"
            options={sourceOptions}
            value={source}
            onChange={(val) => setSource(val || "")}
            placeholder="Chọn nguồn..."
          />
          <SelectForm
            label="Mức tiềm năng"
            options={potentialOptions}
            value={potential}
            onChange={(val) => setPotential(val || "")}
            placeholder="Chọn..."
          />
        </div>

        {/* Row 4 */}
        <Textarea
          label="Nhu cầu"
          placeholder="VD: Quan tâm đến..."
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          rows={2}
          className="col-span-2"
        />

        {/* Row 4 */}
        <div className="form-grid-2col">
          <CurrencyInput
            label="Deal Value (Ước tính)"
            value={dealValue}
            onChange={setDealValue}
            error={errors.deal_value}
          />
          <Input
            label="Chấm điểm (0-100)"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value) || 0)}
            error={errors.score}
          />
        </div>

        {/* Row 5 */}
        <div className="form-grid-2col">
          <DatePicker
            label="Ngày liên hệ tiếp theo"
            value={nextContactDate}
            onChange={setNextContactDate}
          />
          <SelectForm
            label="Nhân viên phụ trách"
            options={employeeOptions}
            value={assignedTo}
            onChange={(val) => setAssignedTo(val || "")}
            placeholder="Chọn nhân viên..."
          />
        </div>

        {/* Row 6 */}
        <Textarea
          label="Ghi chú"
          placeholder="Thêm ghi chú nội bộ..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="col-span-2"
        />

        {/* Row 7 */}
        <div className="flex flex-col gap-1 w-full min-w-0">
          <TagsInput
            label="Tags"
            placeholder="VD: vip, refer, event"
            value={tagsArray}
            onChange={setTagsArray}
            error={errors.tags}
          />
        </div>
      </form>
    </UnifiedModal>
  );
}
