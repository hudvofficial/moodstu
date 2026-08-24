"use client";

import { useRef, useEffect } from "react";
import { Search, UserPlus, UserCheck, Phone, MapPin, X } from "lucide-react";
import type { UseContractCustomerReturn } from "./hooks/useContractCustomer";
import type { ContractFormData } from "@/types/contract-form";
import { CoupleDetailFields } from "./CoupleDetailFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        customer.setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [customer]);

  if (customer.selectedCustomer) {
    return (
      <section className="space-y-4">
        <div className="section-header-gold">
          <h3 className="text-body font-semibold text-text-primary">
            2. Khách hàng
          </h3>
        </div>

        <div className="card-base flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-text-primary">
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
          <Button
            unstyled
            type="button"
            onClick={customer.clearCustomer}
            className="btn btn-ghost ml-3 text-body-sm"
          >
            Đổi
          </Button>
        </div>

        {showCoupleFields && (
          <CoupleDetailFields formData={formData} updateField={updateField} />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="section-header-row">
        <h3 className="form-section-heading whitespace-nowrap">
          2. Khách hàng
        </h3>

        <div className="section-search-inline">
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              {customer.selectedCustomer ? (
                <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-interactive" />
              ) : customer.isNewCustomer ? (
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              )}
              <Input
                unstyled
                type="text"
                value={customer.searchQuery}
                onChange={(event) => customer.setSearchQuery(event.target.value)}
                onFocus={customer.reopenSearchDropdown}
                placeholder="Tìm hoặc tạo mới..."
                readOnly={!!customer.selectedCustomer}
                className={`input-base input-elevated pl-10 pr-10 ${customer.selectedCustomer ? "input-selected" : ""}`}
              />

              {(customer.selectedCustomer || customer.isNewCustomer) && (
                <Button
                  unstyled
                  type="button"
                  onClick={customer.clearCustomer}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-error"
                  title="Bỏ chọn"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {customer.isSearching && !customer.selectedCustomer && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-interactive" />
                </div>
              )}
            </div>

            {customer.showDropdown && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-radius-md bg-bg-card shadow-lg">
                {customer.searchResults.length > 0 && (
                  <>
                    <div className="dropdown-section-label">Khách hàng cũ</div>
                    <ul className="max-h-48 overflow-y-auto">
                      {customer.searchResults.map((item) => (
                        <li key={item.id}>
                          <Button
                            unstyled
                            type="button"
                            onClick={() => customer.selectCustomer(item)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-hover"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-body-sm font-medium text-text-primary">
                                {item.full_name}
                              </p>
                              {item.phone && (
                                <p className="text-caption text-text-secondary">
                                  {item.phone}
                                </p>
                              )}
                            </div>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {customer.isSearching && customer.searchResults.length === 0 && (
                  <p className="px-4 py-3 text-body-sm text-text-muted">
                    Đang tìm khách hàng...
                  </p>
                )}

                {!customer.isSearching && customer.searchError && (
                  <p className="px-4 py-3 text-body-sm text-warning">
                    {customer.searchError}
                  </p>
                )}

                {!customer.isSearching && !customer.searchError && customer.searchResults.length === 0 && (
                  <p className="px-4 py-3 text-body-sm text-text-muted">
                    Chưa có khách hàng trùng khớp
                  </p>
                )}

                <Button
                  unstyled
                  type="button"
                  onClick={customer.openCreateCustomer}
                  className="dropdown-create-action"
                >
                  <span className="dropdown-create-icon">
                    <UserPlus className="h-3.5 w-3.5 text-interactive" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Tạo khách hàng mới</p>
                    {customer.searchQuery && (
                      <p className="text-caption text-text-secondary">
                        với tên &quot;{customer.searchQuery}&quot;
                      </p>
                    )}
                  </div>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="error-text">{error}</p>
      )}

      {showCoupleFields && customer.selectedCustomer && (
        <CoupleDetailFields formData={formData} updateField={updateField} />
      )}
    </section>
  );
}
