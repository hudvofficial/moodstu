"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { CircleMinus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { createInventoryContractAddonSale, createInventoryRetailSale, stockOut } from "@/app/actions/inventory-mutations";
import {
  fetchInventoryContractOptions,
  fetchInventoryPickerItems,
} from "@/app/actions/inventory-queries";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { invalidateFinanceAfterWrite, invalidateInventoryAfterWrite } from "@/lib/cache-invalidation";
import { cn, formatVnd } from "@/lib/utils";
import { PAYMENT_METHOD_OPTIONS } from "@/types/contract-constants";
import type { InventoryContractOption, InventoryItem } from "@/types/inventory";

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  items?: InventoryItem[];
}

type OperationMode = "retail_sale" | "contract_fulfillment" | "contract_addon_sale" | "internal_use";
type PaymentMethod = "tien_mat" | "chuyen_khoan";

const modes: Array<{
  value: OperationMode;
  label: string;
}> = [
  { value: "retail_sale", label: "Bán lẻ" },
  { value: "contract_fulfillment", label: "Xuất HĐ" },
  { value: "contract_addon_sale", label: "Bán thêm HĐ" },
  { value: "internal_use", label: "Nội bộ" },
];

const today = () => format(new Date(), "yyyy-MM-dd");
const quantityFormatter = new Intl.NumberFormat("vi-VN");


function contractLabel(contract: InventoryContractOption) {
  return `${contract.contract_code} - ${contract.customer_name}`;
}

function stockLabel(item: InventoryItem) {
  return `${quantityFormatter.format(item.current_stock)}${item.unit ? ` ${item.unit}` : ""}`;
}

export function StockOutModal({ isOpen, onClose, item, items }: StockOutModalProps) {
  const [isPending, startTransition] = useTransition();
  const contractDropdownRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<OperationMode>("retail_sale");
  const [pickedItem, setPickedItem] = useState<InventoryItem | null>(null);
  const activeItem = item || pickedItem;

  const [contractQuery, setContractQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<InventoryContractOption | null>(null);
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [contractOptions, setContractOptions] = useState<InventoryContractOption[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [contractError, setContractError] = useState("");
  const debouncedContractQuery = useDebounce(contractQuery, 250);

  const [quantityInput, setQuantityInput] = useState("");
  const [saleUnitPrice, setSaleUnitPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tien_mat");
  const [receiptDate, setReceiptDate] = useState(today());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const [pickerItems, setPickerItems] = useState<InventoryItem[]>(items || []);
  const [pickerSearch, setPickerSearch] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const debouncedPickerSearch = useDebounce(pickerSearch, 250);

  const quantity = Number(quantityInput);
  const hasValidQuantity = quantityInput.trim() !== "" && Number.isInteger(quantity) && quantity >= 1;
  const quantityExceedsStock = Boolean(activeItem && hasValidQuantity && quantity > activeItem.current_stock);
  const retailTotal = hasValidQuantity ? quantity * saleUnitPrice : 0;
  const canSell = mode === "retail_sale" && saleUnitPrice > 0 && Boolean(receiptDate);
  const canFulfillContract = mode === "contract_fulfillment" && Boolean(selectedContract);
  const canSellContractAddon = mode === "contract_addon_sale" && Boolean(selectedContract) && saleUnitPrice > 0 && Boolean(receiptDate);
  const canUseInternal = mode === "internal_use" && reason.trim().length >= 3;
  const canSubmit = Boolean(
    activeItem &&
      hasValidQuantity &&
      !quantityExceedsStock &&
      (canSell || canFulfillContract || canSellContractAddon || canUseInternal),
  );

  const resetForm = () => {
    setMode("retail_sale");
    setPickedItem(null);
    setContractQuery("");
    setSelectedContract(null);
    setShowContractDropdown(false);
    setContractError("");
    setQuantityInput("");
    setSaleUnitPrice(0);
    setPaymentMethod("tien_mat");
    setReceiptDate(today());
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setReason("");
    setNotes("");
    setError("");
    setPickerSearch("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectItem = (selected: InventoryItem | null) => {
    setPickedItem(selected);
    setQuantityInput("");
    setSaleUnitPrice(selected?.sale_price || 0);
    setError("");
  };

  const selectContract = (contract: InventoryContractOption) => {
    setSelectedContract(contract);
    setContractQuery(contractLabel(contract));
    setCustomerName(contract.customer_name);
    setCustomerPhone(contract.customer_phone || "");
    setShowContractDropdown(false);
    setContractError("");
    setError("");
  };

  const clearContract = () => {
    setSelectedContract(null);
    setContractQuery("");
    setCustomerName("");
    setCustomerPhone("");
    setShowContractDropdown(true);
  };

  const switchMode = (nextMode: OperationMode) => {
    setMode(nextMode);
    setError("");
    if (nextMode !== "contract_fulfillment" && nextMode !== "contract_addon_sale") {
      setSelectedContract(null);
      setContractQuery("");
      setShowContractDropdown(false);
    }
    if (nextMode !== "internal_use") {
      setReason("");
    }
  };

  const contractReason = () => {
    if (!selectedContract) return "";
    return `Xuất cho HĐ ${selectedContract.contract_code} - ${selectedContract.customer_name}`;
  };

  const internalReason = () => reason.trim();

  useEffect(() => {
    if (!activeItem) {
      setSaleUnitPrice(0);
      return;
    }
    setSaleUnitPrice(activeItem.sale_price || 0);
  }, [activeItem]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        contractDropdownRef.current &&
        !contractDropdownRef.current.contains(event.target as Node)
      ) {
        setShowContractDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen || (mode !== "contract_fulfillment" && mode !== "contract_addon_sale") || selectedContract) return;
    let cancelled = false;

    async function loadContracts() {
      setIsLoadingContracts(true);
      setContractError("");

      try {
        const data = await fetchInventoryContractOptions(debouncedContractQuery);
        if (!cancelled) setContractOptions(data);
      } catch (err) {
        if (!cancelled) {
          setContractOptions([]);
          setContractError(err instanceof Error ? err.message : "Không thể tải hợp đồng");
        }
      } finally {
        if (!cancelled) setIsLoadingContracts(false);
      }
    }

    void loadContracts();

    return () => {
      cancelled = true;
    };
  }, [debouncedContractQuery, isOpen, mode, selectedContract]);

  useEffect(() => {
    if (!isOpen || item || pickedItem) return;
    let cancelled = false;

    async function loadItems() {
      setIsLoadingItems(true);

      try {
        const data = await fetchInventoryPickerItems({
          search: debouncedPickerSearch,
          limit: 30,
          activeOnly: true,
        });
        if (!cancelled) setPickerItems(data.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải vật tư");
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [debouncedPickerSearch, isOpen, item, pickedItem]);

  const validateBase = () => {
    if (!activeItem) return "Chọn vật tư trước khi xử lý";
    if (activeItem.status !== "active") return "Vật tư đã ngưng, không thể xử lý";
    if (!hasValidQuantity) return "Số lượng phải >= 1";
    if (quantity > activeItem.current_stock) return `Không đủ tồn kho. Hiện có: ${activeItem.current_stock}`;
    return "";
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    const baseError = validateBase();
    if (baseError) {
      setError(baseError);
      return;
    }

    if (!activeItem) return;

    if (mode === "retail_sale" && saleUnitPrice <= 0) {
      setError("Bán lẻ bắt buộc nhập giá bán");
      return;
    }
    if ((mode === "contract_fulfillment" || mode === "contract_addon_sale") && !selectedContract) {
      setError("Luồng hợp đồng bắt buộc chọn hợp đồng");
      return;
    }
    if (mode === "contract_addon_sale" && saleUnitPrice <= 0) {
      setError("Bán thêm hợp đồng bắt buộc nhập giá bán");
      return;
    }
    if (mode === "internal_use" && reason.trim().length < 3) {
      setError("Xuất nội bộ/hao hụt bắt buộc nhập lý do");
      return;
    }

    setError("");
    startTransition(async () => {
      const result =
        mode === "retail_sale"
          ? await createInventoryRetailSale({
              itemId: activeItem.id,
              itemName: activeItem.name,
              quantity,
              saleUnitPrice,
              paymentMethod,
              receiptDate,
              customerName: customerName.trim() || undefined,
              customerPhone: customerPhone.trim() || undefined,
              customerAddress: customerAddress.trim() || undefined,
              notes: notes.trim() || undefined,
            })
          : mode === "contract_addon_sale" && selectedContract
            ? await createInventoryContractAddonSale({
                contractId: selectedContract.id,
                itemId: activeItem.id,
                itemName: activeItem.name,
                quantity,
                saleUnitPrice,
                paymentMethod,
                receiptDate,
                notes: notes.trim() || undefined,
              })
            : await stockOut({
              itemId: activeItem.id,
              quantity,
              contractId: selectedContract?.id,
              reason: mode === "contract_fulfillment" ? contractReason() : internalReason(),
              customerName: selectedContract?.customer_name,
              customerPhone: selectedContract?.customer_phone || undefined,
              notes: notes.trim() || undefined,
            });

      if (result && "success" in result && result.success) {
        if (mode === "retail_sale" || mode === "contract_addon_sale") {
          toast.success(mode === "contract_addon_sale" ? `Đã bán thêm ${quantity} ${activeItem.name}` : `Đã bán ${quantity} ${activeItem.name}`);
          await Promise.all([
            invalidateInventoryAfterWrite(activeItem.id),
            invalidateFinanceAfterWrite(),
          ]);
        } else {
          toast.success(`Đã xuất ${quantity} ${activeItem.name}`);
          const stockResult = result.data as { warning?: string | null } | undefined;
          if (stockResult?.warning) toast.warning(stockResult.warning);
          await invalidateInventoryAfterWrite(activeItem.id);
        }
        handleClose();
      } else {
        setError(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Không thể xử lý giao dịch kho",
        );
      }
    });
  };

  if (!isOpen) return null;

  const itemOptions = pickerItems.map((option) => ({
    value: option.id,
    label: `${option.item_code} - ${option.name}`,
    meta: `Tồn: ${stockLabel(option)}`,
  }));
  const modeOptions = modes.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const submitLabel =
    mode === "retail_sale"
      ? "Bán lẻ"
      : mode === "contract_fulfillment"
        ? "Xuất HĐ"
        : mode === "contract_addon_sale"
          ? "Bán thêm HĐ"
        : "Xuất nội bộ";

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Xuất kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) - Tồn: ${activeItem.current_stock}` : undefined}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            type="button"
            variant={mode === "retail_sale" ? "primary" : "danger"}
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
          >
            <CircleMinus className="h-4 w-4" />
            {isPending ? "Đang xử lý..." : submitLabel}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleSelect
            label="Loại xuất kho"
            value={mode}
            onChange={(value) => switchMode(value as OperationMode)}
            options={modeOptions}
          />

          <div>
            <label className="label-base">Vật tư *</label>
            {activeItem ? (
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-sm border border-border bg-bg-card px-3 py-2">
                <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text-primary">
                  {activeItem.item_code} - {activeItem.name}
                </p>
                {!item && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => selectItem(null)}
                  >
                    Đổi
                  </Button>
                )}
              </div>
            ) : (
              <ComboboxSearch
                onChange={(id) => selectItem(pickerItems.find((option) => option.id === id) || null)}
                onSearchChange={setPickerSearch}
                isLoading={isLoadingItems}
                options={itemOptions}
                placeholder="Tìm và chọn vật tư..."
              />
            )}
            {activeItem && (
              <p className="mt-1 ml-1 text-caption font-medium text-text-muted">
                Tồn kho hiện tại: {stockLabel(activeItem)}
              </p>
            )}
          </div>
        </div>

        {activeItem && activeItem.min_stock > 0 && activeItem.current_stock <= activeItem.min_stock && (
          <div className="rounded-lg bg-warning/10 px-4 py-2.5 text-body-sm font-medium text-warning">
            Tồn kho thấp. Hiện có {activeItem.current_stock}, tối thiểu {activeItem.min_stock}.
          </div>
        )}

        {(mode === "contract_fulfillment" || mode === "contract_addon_sale") && (
          <div ref={contractDropdownRef} className="relative">
            <label className="label-base">Hợp đồng *</label>

            {selectedContract ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2.5">
                <span className="badge badge-primary shrink-0">{selectedContract.contract_code}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-text-primary">
                    {selectedContract.customer_name}
                  </p>
                  {selectedContract.customer_phone && (
                    <p className="text-caption text-text-secondary">{selectedContract.customer_phone}</p>
                  )}
                </div>
                <Button
                  unstyled
                  type="button"
                  onClick={clearContract}
                  className="rounded-full p-1 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label="Bỏ chọn hợp đồng"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={contractQuery}
                  onChange={(event) => {
                    setContractQuery(event.target.value);
                    setShowContractDropdown(true);
                    setError("");
                  }}
                  onFocus={() => setShowContractDropdown(true)}
                  placeholder="Gõ mã HĐ hoặc tên khách..."
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            )}

            {showContractDropdown && !selectedContract && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-bg-card shadow-lg">
                <div className="dropdown-section-label">
                  {debouncedContractQuery.trim() ? "Hợp đồng khớp" : "Hợp đồng gần đây"}
                </div>

                {isLoadingContracts ? (
                  <p className="px-4 py-3 text-body-sm text-text-muted">Đang tải hợp đồng...</p>
                ) : contractError ? (
                  <p className="px-4 py-3 text-body-sm text-warning">{contractError}</p>
                ) : contractOptions.length === 0 ? (
                  <p className="px-4 py-3 text-body-sm text-text-muted">Không tìm thấy hợp đồng</p>
                ) : (
                  contractOptions.map((contract) => (
                    <Button
                      unstyled
                      key={contract.id}
                      type="button"
                      onClick={() => selectContract(contract)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-hover"
                    >
                      <span className="badge badge-primary shrink-0">{contract.contract_code}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-medium text-text-primary">
                          {contract.customer_name}
                        </p>
                        {contract.customer_phone && (
                          <p className="text-caption text-text-secondary">{contract.customer_phone}</p>
                        )}
                      </div>
                    </Button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {mode === "retail_sale" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">Tên khách</label>
              <Input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Khách lẻ"
              />
            </div>
            <div>
              <label className="label-base">SĐT</label>
              <Input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="0901234567"
              />
            </div>
            <div>
              <label className="label-base">Ngày thu</label>
              <DatePicker
                value={receiptDate}
                onChange={setReceiptDate}
              />
            </div>
            <div>
              <label className="label-base">Thanh toán</label>
              <SimpleSelect
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Địa chỉ</label>
              <Input
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder="Quận, thành phố"
              />
            </div>
          </div>
        )}

        {mode === "contract_addon_sale" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">Ngày thu</label>
              <DatePicker
                value={receiptDate}
                onChange={setReceiptDate}
              />
            </div>
            <div>
              <label className="label-base">Thanh toán</label>
              <SimpleSelect
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </div>
          </div>
        )}

        {mode === "internal_use" && (
          <div>
            <label className="label-base">Lý do xuất *</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="VD: hao hụt, dùng nội bộ, mẫu tặng..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label-base">Số lượng *</label>
            <Input
              type="number"
              min={1}
              max={activeItem?.current_stock}
              step={1}
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              placeholder="0"
            />
            {activeItem && (
              <p className={cn("mt-1 text-caption", quantityExceedsStock ? "text-error" : "text-text-muted")}>
                {quantityExceedsStock ? `Vượt tồn kho. Tối đa: ${activeItem.current_stock}` : `Tối đa: ${activeItem.current_stock}`}
              </p>
            )}
          </div>

          {mode === "retail_sale" || mode === "contract_addon_sale" ? (
            <CurrencyInput
              label="Giá bán"
              value={saleUnitPrice}
              onChange={setSaleUnitPrice}
              emptyWhenZero
            />
          ) : (
            <div>
              <label className="label-base">Giá vốn TB</label>
              <Input
                value={formatVnd(activeItem?.average_unit_price || 0)}
                readOnly
                className="text-right font-semibold"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-base px-3 py-2.5">
          <p className="text-caption font-semibold uppercase text-text-muted">Ảnh hưởng báo cáo</p>
          {mode === "retail_sale" ? (
            <p className="mt-1 text-body-sm text-text-secondary">
              Ghi phiếu thu {formatVnd(retailTotal)} và xuất tồn theo giá vốn.
            </p>
          ) : mode === "contract_addon_sale" ? (
            <p className="mt-1 text-body-sm text-text-secondary">
              Tăng phát sinh HĐ {formatVnd(retailTotal)}, ghi phiếu thu HĐ và xuất tồn theo giá vốn.
            </p>
          ) : mode === "contract_fulfillment" ? (
            <p className="mt-1 text-body-sm text-text-secondary">
              Chỉ ghi xuất tồn/giá vốn cho hợp đồng, không tạo doanh thu mới.
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-text-secondary">
              Chỉ ghi xuất tồn nội bộ/hao hụt, không tạo doanh thu.
            </p>
          )}
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <Textarea
            className="min-h-16"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ghi chú thêm..."
          />
        </div>
      </form>
    </UnifiedModal>
  );
}
