"use client";

import { useRef, useEffect } from "react";
import { Search, UserPlus, UserCheck, Phone, MapPin, Heart, User, X } from "lucide-react";
import type { UseContractCustomerReturn } from "./hooks/useContractCustomer";
import type { ContractFormData } from "@/types/contract-form";

// ═══════════════════════════════════════════
// ContractCustomerSection — Search + Select + Couple Fields
// 3 states: empty → searching → selected
// ═══════════════════════════════════════════

interface Props {
  customer: UseContractCustomerReturn;
  showCoupleFields: boolean;
  formData: ContractFormData;
  updateField: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
  error?: string;
}

export function ContractCustomerSection({
  customer,
  showCoupleFields,
  formData,
  updateField,
  error,
}: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        customer.setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [customer]);

  // ── State: Customer selected ──
  if (customer.selectedCustomer) {
    return (
      <section className="space-y-4">
        <div className="section-header-gold">
          <h3 className="text-body font-semibold text-text-primary">
            2. Khách hàng
          </h3>
        </div>

        {/* Selected card */}
        <div className="card-base flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary truncate">
              {customer.selectedCustomer.full_name}
              {customer.isNewCustomer && (
                <span className="badge badge-success ml-2">Mới</span>
              )}
            </p>
            {customer.selectedCustomer.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-body-sm text-text-secondary">
                <Phone className="h-3.5 w-3.5" />
                {customer.selectedCustomer.phone}
              </p>
            )}
            {customer.selectedCustomer.address && (
              <p className="mt-1 flex items-center gap-1.5 text-body-sm text-text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{customer.selectedCustomer.address}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={customer.clearCustomer}
            className="btn btn-ghost text-body-sm ml-3"
          >
            Đổi
          </button>
        </div>

        {/* Couple fields (conditional) */}
        {showCoupleFields && (
          <CoupleFields formData={formData} updateField={updateField} />
        )}
      </section>
    );
  }

  // ── State: Searching / Empty ──
  return (
    <section className="space-y-4">
      {/* H3 + search + create btn — 1 row (Stitch L119-132) */}
      <div className="section-header-row">
        <h3 className="form-section-heading whitespace-nowrap">
          2. Khách hàng
        </h3>
        <div className="section-search-inline">
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              {/* Dynamic icon — V1 pattern: search→selected→new */}
              {customer.selectedCustomer ? (
                <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-interactive" />
              ) : customer.isNewCustomer ? (
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              )}
              <input
                type="text"
                value={customer.searchQuery}
                onChange={(e) => customer.setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm khách hàng..."
                readOnly={!!customer.selectedCustomer}
                className={`input-base pl-10 pr-10 ${customer.selectedCustomer ? "input-selected" : ""}`}
              />
              {/* T3: Clear button — V1 pattern */}
              {(customer.selectedCustomer || customer.isNewCustomer) && (
                <button
                  type="button"
                  onClick={customer.clearCustomer}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-error transition-colors"
                  title="Bỏ chọn"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {/* Spinner khi đang search */}
              {customer.isSearching && !customer.selectedCustomer && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-interactive" />
                </div>
              )}
            </div>

            {/* T4: Dropdown V1-style — header + results + sticky create */}
            {customer.showDropdown && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-radius-md bg-bg-card shadow-lg">
                {customer.searchResults.length > 0 && (
                  <>
                    <div className="dropdown-section-label">Khách hàng cũ</div>
                    <ul className="max-h-48 overflow-y-auto">
                      {customer.searchResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => customer.selectCustomer(c)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-body-sm font-medium text-text-primary truncate">
                                {c.full_name}
                              </p>
                              {c.phone && (
                                <p className="text-caption text-text-secondary">
                                  {c.phone}
                                </p>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {customer.searchResults.length === 0 && (
                  <p className="px-4 py-3 text-body-sm text-text-muted">
                    Không tìm thấy khách hàng
                  </p>
                )}

                {/* Sticky bottom: "Tạo KH mới" với context — V1 pattern */}
                <button
                  type="button"
                  onClick={customer.openCreateCustomer}
                  className="dropdown-create-action"
                >
                  <span className="dropdown-create-icon">
                    <UserPlus className="h-3.5 w-3.5 text-interactive" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Xác nhận tạo khách hàng mới</p>
                    {customer.searchQuery && (
                      <p className="text-caption text-text-secondary">
                        với tên &quot;{customer.searchQuery}&quot;
                      </p>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* T5: Inline button — chỉ hiện khi dropdown đóng */}
          {!customer.showDropdown && (
            <button
              type="button"
              onClick={customer.openCreateCustomer}
              className="flex items-center gap-1.5 text-interactive text-sm font-semibold hover:underline whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span className="max-lg:hidden">Tạo khách hàng mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="error-text">{error}</p>
      )}

      {/* Couple fields (show before selection if service type needs it) */}
      {showCoupleFields && (
        <CoupleFields formData={formData} updateField={updateField} />
      )}
    </section>
  );
}

// ── Couple Fields Sub-component ──
// Layout: 2 cards side-by-side (desktop) / stacked (mobile)
// Each card: Row1 [Tên + SĐT], Row2 [Cao + Nặng + Size giày]
function CoupleFields({
  formData,
  updateField,
}: {
  formData: ContractFormData;
  updateField: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Cô dâu card */}
      <div className="accent-card accent-card-rose space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 accent-icon-rose" />
          <span className="text-body-sm font-semibold accent-text-rose">
            Thông tin Cô dâu
          </span>
        </div>

        {/* Row 1: Tên + SĐT */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-base">Họ và tên</label>
            <input
              type="text"
              value={formData.bride_name}
              onChange={(e) => updateField("bride_name", e.target.value)}
              placeholder="Tên cô dâu"
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Số điện thoại</label>
            <input
              type="tel"
              value={formData.bride_phone}
              onChange={(e) => updateField("bride_phone", e.target.value)}
              placeholder="09..."
              className="input-base"
            />
          </div>
        </div>

        {/* Row 2: Cao + Nặng + Size giày */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label-base">Chiều cao</label>
            <div className="input-with-suffix">
              <input
                type="text"
                inputMode="numeric"
                value={formData.bride_height}
                onChange={(e) => updateField("bride_height", e.target.value)}
                className="input-base input-suffix-field"
              />
              <span className="input-suffix">cm</span>
            </div>
          </div>
          <div>
            <label className="label-base">Cân nặng</label>
            <div className="input-with-suffix">
              <input
                type="text"
                inputMode="numeric"
                value={formData.bride_weight}
                onChange={(e) => updateField("bride_weight", e.target.value)}
                className="input-base input-suffix-field"
              />
              <span className="input-suffix">kg</span>
            </div>
          </div>
          <div>
            <label className="label-base">Size giày</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.bride_shoe_size}
              onChange={(e) => updateField("bride_shoe_size", e.target.value)}
              className="input-base"
            />
          </div>
        </div>
      </div>

      {/* Chú rể card */}
      <div className="accent-card accent-card-sky space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 accent-icon-sky" />
          <span className="text-body-sm font-semibold accent-text-sky">
            Thông tin Chú rể
          </span>
        </div>

        {/* Row 1: Tên + SĐT */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-base">Họ và tên</label>
            <input
              type="text"
              value={formData.groom_name}
              onChange={(e) => updateField("groom_name", e.target.value)}
              placeholder="Tên chú rể"
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Số điện thoại</label>
            <input
              type="tel"
              value={formData.groom_phone}
              onChange={(e) => updateField("groom_phone", e.target.value)}
              placeholder="09..."
              className="input-base"
            />
          </div>
        </div>

        {/* Row 2: Cao + Nặng + Size giày */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label-base">Chiều cao</label>
            <div className="input-with-suffix">
              <input
                type="text"
                inputMode="numeric"
                value={formData.groom_height}
                onChange={(e) => updateField("groom_height", e.target.value)}
                className="input-base input-suffix-field"
              />
              <span className="input-suffix">cm</span>
            </div>
          </div>
          <div>
            <label className="label-base">Cân nặng</label>
            <div className="input-with-suffix">
              <input
                type="text"
                inputMode="numeric"
                value={formData.groom_weight}
                onChange={(e) => updateField("groom_weight", e.target.value)}
                className="input-base input-suffix-field"
              />
              <span className="input-suffix">kg</span>
            </div>
          </div>
          <div>
            <label className="label-base">Size giày</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.groom_shoe_size}
              onChange={(e) => updateField("groom_shoe_size", e.target.value)}
              className="input-base"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

