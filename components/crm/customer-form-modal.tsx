"use client";

import { useEffect, useState } from "react";

import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

import { SOURCE_MAP } from "@/types/crm";
import type { Customer } from "@/types/crm";
import { createCustomer, updateCustomer } from "@/app/actions/customer-actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (customerId?: string) => void;
  customer?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, onSaved, customer }: Props) {
  const isEditing = !!customer;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");

  const sourceOptions = Object.entries(SOURCE_MAP).map(([key, val]) => ({
    label: val.label,
    value: key,
  }));

  const genderOptions = [
    { label: "Nam (Chú rể)", value: "male" },
    { label: "Nữ (Cô dâu)", value: "female" },
    { label: "Khác", value: "other" }
  ];

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFullName(customer.full_name || "");
        setPhone(customer.phone || "");
        setEmail(customer.email || "");
        setAltPhone(customer.alt_phone || "");
        setAddress(customer.address || "");
        setGender(customer.gender || "");
        setSource(customer.source || "");
        setTags(customer.tags?.join(", ") || "");
        setNotes(customer.notes || "");
        
        setDateOfBirth(customer.date_of_birth ? customer.date_of_birth.split("T")[0] : "");
        setWeddingDate(customer.wedding_date ? customer.wedding_date.split("T")[0] : "");
        setBrideName(customer.bride_name || "");
        setGroomName(customer.groom_name || "");
      } else {
        setFullName("");
        setPhone("");
        setEmail("");
        setAltPhone("");
        setAddress("");
        setGender("");
        setSource("");
        setTags("");
        setNotes("");
        setDateOfBirth("");
        setWeddingDate("");
        setBrideName("");
        setGroomName("");
      }
    }
  }, [isOpen, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("Vui lòng nhập Tên khách hàng");
      return;
    }
    if (!phone.trim()) {
      alert("Vui lòng nhập Số điện thoại");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: fullName,
        phone,
        email: email || undefined,
        alt_phone: altPhone || undefined,
        address: address || undefined,
        gender: gender || undefined,
        source: source || undefined,
        notes: notes || undefined,
        date_of_birth: dateOfBirth || undefined,
        wedding_date: weddingDate || undefined,
        bride_name: brideName || undefined,
        groom_name: groomName || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      if (isEditing && customer) {
        payload.expectedUpdatedAt = customer.updated_at || undefined;
        const result = await updateCustomer(customer.id, payload);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await createCustomer(payload);
        if (!result.success) throw new Error(result.error);
        if (result.data.duplicate) {
          alert(`So dien thoai da ton tai trong ho so ${result.data.customer_name || "khach hang"}. Dang mo ho so hien co.`);
          onClose();
          onSaved?.(result.data.customer_id);
          return;
        }
      }
      
      onClose();
      onSaved?.();
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
      title={isEditing ? "Cập nhật Khách Hàng" : "Thêm Khách Hàng Mới"}
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="customer-form" variant="primary" disabled={isSubmitting}>
            {isEditing ? "Cập nhật KH" : "Tạo Khách Hàng"}
          </Button>
        </div>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 */}
        <div className="form-grid-2col">
          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Số điện thoại"
            placeholder="VD: 09..."
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
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
          />
          <Input
            label="SĐT Khác"
            placeholder="VD: 09..."
            type="tel"
            value={altPhone}
            onChange={(e) => setAltPhone(e.target.value)}
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
            label="Giới tính đại diện"
            options={genderOptions}
            value={gender}
            onChange={(val) => setGender(val || "")}
            placeholder="Chọn giới tính..."
          />
        </div>

        {/* Row 4 */}
        <div className="form-grid-2col">
          <DatePicker
            label="Ngày cưới"
            value={weddingDate}
            onChange={setWeddingDate}
          />
          <DatePicker
            label="Ngày sinh"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />
        </div>

        {/* Row 5 */}
        <div className="form-grid-2col">
          <Input
            label="Tên Cô dâu"
            placeholder="VD: Nguyễn Thị B"
            value={brideName}
            onChange={(e) => setBrideName(e.target.value)}
          />
          <Input
            label="Tên Chú rể"
            placeholder="VD: Lê Văn C"
            value={groomName}
            onChange={(e) => setGroomName(e.target.value)}
          />
        </div>

        {/* Row 6 */}
        <Textarea
          label="Địa chỉ"
          placeholder="VD: 123 Đường A..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="col-span-2"
        />

        {/* Row 7 */}
        <Textarea
          label="Ghi chú thêm"
          placeholder="..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="col-span-2"
        />

        {/* Row 8 */}
        <div className="flex flex-col gap-1 w-full min-w-0">
          <Input
            label="Tags (Cách nhau bằng dấu phẩy)"
            placeholder="VD: vip, refer..."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </form>
    </UnifiedModal>
  );
}


