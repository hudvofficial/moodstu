"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Check, Edit2, Trash2, Loader2, Printer, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import type { ComboboxOption } from "@/components/ui/combobox-search";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InventoryTransaction } from "@/types/inventory";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { useOrderFulfillments } from "@/lib/hooks/use-order-fulfillments";
import { addFulfillmentTransaction, requestFulfillmentAction } from "@/app/actions/inventory-mutations";
import { toast } from "sonner";
import { fetchInventoryForSale, type InventorySaleOption } from "@/app/actions/inventory-queries";
import { useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";

interface OrderDetailsDrawerProps {
  txn: InventoryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

function fmt(value: number | null | undefined) {
  return `${formatCurrency(value || 0)} ${CURRENCY_SYMBOL}`;
}

export function OrderDetailsDrawer({
  txn,
  isOpen,
  onClose,
  userRole = "viewer"
}: OrderDetailsDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState<number>(50);
  const [unitCost, setUnitCost] = useState<number>(txn?.unit_cost || 0);

  const [itemId, setItemId] = useState<string>(txn?.item_id || "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [items, setItems] = useState<InventorySaleOption[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [showAllFulfillments, setShowAllFulfillments] = useState(true);

  // Hybrid Approval states
  const [actionItem, setActionItem] = useState<{ id: string, type: "delete_fulfillment" | "update_fulfillment" } | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const { fulfillments, isLoading, mutate } = useOrderFulfillments(txn?.id);

  useEffect(() => {
    if (showAddForm && items.length === 0) {
      setIsLoadingItems(true);
      fetchInventoryForSale().then((data) => {
        setItems(data);
        setIsLoadingItems(false);
      }).catch(() => {
        setIsLoadingItems(false);
        toast.error("Không thể tải danh sách vật tư");
      });
    }
  }, [showAddForm, items.length]);

  // Convert items to ComboboxOptions
  const itemOptions: ComboboxOption[] = useMemo(() =>
    items.map(item => ({
      value: item.id,
      label: `${item.item_code} - ${item.name}`,
      meta: `Tồn: ${item.current_stock}`,
    })),
    [items]
  );

  if (!txn) return null;

  // Calculate totals - use txn values as fallback if fulfillments not loaded yet
  const totalQuantity = fulfillments.length > 0
    ? fulfillments.reduce((sum, f) => sum + f.quantity, 0)
    : txn.quantity || 0;

  const totalAmount = fulfillments.length > 0
    ? fulfillments.reduce((sum, f) => sum + (f.quantity * (f.sale_unit_price || f.unit_cost)), 0)
    : (txn.quantity || 0) * (txn.sale_unit_price || txn.unit_cost || 0);

  // Số đợt: nếu có fulfillments thì count, nếu không có nhưng có data thì ít nhất 1
  const dotCount = fulfillments.length > 0 ? fulfillments.length : (totalQuantity > 0 ? 1 : 0);

  // Filter notes: bỏ những notes chỉ chứa địa chỉ (đã move lên header)
  const actualNotes = txn.notes && !txn.notes.toLowerCase().includes("địa chỉ khách lẻ")
    ? txn.notes
    : null;

  const handleAddFulfillment = () => {
    if (!txn) return;
    if (quantity <= 0) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }
    
    startTransition(async () => {
      try {
        await addFulfillmentTransaction({
          parentTxnId: txn.id,
          itemId: itemId || txn.item_id,
          quantity,
          unitCost,
          paymentMethod,
        });
        toast.success("Bổ sung phát sinh thành công");
        setShowAddForm(false);
        mutate(); // refresh SWR
      } catch (err: any) {
        toast.error(err.message || "Đã có lỗi xảy ra");
      }
    });
  };

  const handleActionConfirm = async () => {
    if (!actionItem) return;
    const isDirect = userRole === "admin" || userRole === "manager";
    
    if (!isDirect && !reason.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await requestFulfillmentAction({
        target_id: actionItem.id,
        action_type: actionItem.type,
        reason: isDirect ? "Direct action" : reason.trim(),
        payload: actionItem.type === "update_fulfillment" ? { 
          // For MVP Edit, we don't implement full form here, just a placeholder. 
        } : undefined
      });
      
      if (!res.success) {
        throw new Error(res.error || "Lỗi xử lý yêu cầu");
      }

      if (res.data?.direct) {
        toast.success(actionItem.type === "delete_fulfillment" ? "Xoá phát sinh thành công" : "Cập nhật thành công");
      } else {
        toast.success("Đã gửi yêu cầu chờ duyệt");
      }
      setActionItem(null);
      setReason("");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePrintReceipt = (item: InventoryTransaction | null) => {
    if (!item) return;
    let routeId = "";
    if (item.receipt_id) {
      // Regular receipt from receipts table
      routeId = item.receipt_id;
    } else if (item.source_type === 'contract_addon_sale' && item.source_id) {
      // Payment receipt from contract addon sale
      routeId = `payment:${item.source_id}`;
    } else if (item.source_id && item.source_id !== item.parent_transaction_id && item.source_id !== item.id) {
      // Other payment receipt
      routeId = `payment:${item.source_id}`;
    }

    if (routeId) {
      window.open(`/finance/receipts/${routeId}/print`, "_blank");
    } else {
      toast.error("Không tìm thấy dữ liệu phiếu thu / thanh toán.");
    }
  };

  const titleBadge = (
    <Badge variant="warning" dot>
      ĐANG THỰC HIỆN
    </Badge>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={txn.contract_code ? `Đơn ${txn.contract_code}` : `Phiếu #${txn.id.slice(0, 8)}`}
      titleBadge={titleBadge}
      size="md"
    >
      <div className="flex flex-col min-h-full">
        <div className="flex-1 space-y-5">

          {/* --- Header Info Card --- */}
          <div className="p-4 bg-bg-hover rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
                  {txn.contract_code ? `HĐ ${txn.contract_code}` : "Bán lẻ"}
                </p>
                <p className="text-h3 text-primary">{txn.customer_name || txn.supplier || "Khách lẻ"}</p>
                {txn.customer_address && (
                  <p className="text-sm text-text-secondary mt-2 flex items-start gap-1.5">
                    <span className="opacity-60">📍</span>
                    <span>{txn.customer_address}</span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-muted">#{txn.id.slice(0, 8)}</p>
              </div>
            </div>
            {txn.performer_name && (
              <div className="pt-3 border-t border-border/30">
                <p className="text-xs text-text-muted">
                  Tạo bởi <span className="font-medium text-text-secondary">{txn.performer_name}</span>
                </p>
              </div>
            )}
          </div>

          {/* --- Stats Grid --- */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tổng số lượng</p>
              <p className="text-h3 text-text-main tabular-nums">{totalQuantity}</p>
            </div>
            <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Số đợt</p>
              <div className="flex items-center gap-2">
                <p className="text-h3 text-info">{dotCount}</p>
                <Badge variant="info" className="text-tiny">đợt</Badge>
              </div>
            </div>
            <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tổng tiền</p>
              <p className="text-h3 text-success tabular-nums">{fmt(totalAmount)}</p>
            </div>
          </div>

          {/* --- Ghi chú (chỉ notes thật, không bao gồm địa chỉ) --- */}
          {actualNotes && (
            <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Ghi chú</p>
              <p className="text-sm text-text-secondary">{actualNotes}</p>
            </div>
          )}

          {/* --- Fulfillment History --- */}
          <section className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mt-4 border-t border-border pt-5 mb-5">
              <h4 className="section-heading">Lịch sử xuất / in ấn</h4>
              {fulfillments.length > 3 && (
                <Button
                  unstyled
                  onClick={() => setShowAllFulfillments(!showAllFulfillments)}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-interactive transition-colors"
                >
                  <span>{showAllFulfillments ? 'Thu gọn' : `Xem tất cả (${fulfillments.length})`}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllFulfillments ? 'rotate-180' : ''}`} />
                </Button>
              )}
            </div>


          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="size-6 animate-spin text-interactive" />
              </div>
            ) : (
            <div className="relative pl-[30px] space-y-6">
              {/* Vertical line */}
              <div className="absolute top-4 bottom-8 left-[8px] w-[2px] bg-border-light rounded-full" />

              {(showAllFulfillments ? fulfillments : fulfillments.slice(0, 3)).map((f, idx) => (
                <div key={f.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[26px] top-5 size-[10px] rounded-full ring-4 ring-bg-card bg-border group-hover:bg-interactive transition-colors z-10" />
                  
                  {/* Fulfillment Card */}
                  <div className="bg-bg-card rounded-xl border border-border/40 p-5 shadow-xs hover:shadow-sm transition-all group-hover:border-interactive/20">
                    <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-body-sm text-text-primary">
                          Đợt {idx + 1} {idx === 0 ? "(Gốc)" : "(Phát sinh)"}
                        </span>
                        <span className="text-caption text-text-muted">
                          {formatDate(f.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={"success"} className="font-medium px-2.5 py-0.5 mr-1">
                          Đã xuất
                        </Badge>
                        {(f.receipt_id || f.source_type === 'contract_addon_sale' || f.unit_cost > 0) && (
                          <Button 
                            unstyled 
                            onClick={() => handlePrintReceipt(f)}
                            className="text-text-muted hover:text-interactive p-1.5 bg-bg-base/50 hover:bg-interactive-light/50 rounded-md border border-border/50 hover:border-interactive/50 transition-all"
                            title="In phiếu thu phát sinh"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button 
                          unstyled 
                          onClick={() => toast.info('Tính năng chỉnh sửa phát sinh đang được hoàn thiện, vui lòng xoá tạo lại nếu cần')}
                          className="text-text-muted hover:text-interactive p-1.5 bg-bg-base/50 hover:bg-interactive-light/50 rounded-md border border-border/50 hover:border-interactive/50 transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button 
                          unstyled 
                          onClick={() => {
                            if (userRole === "admin" || userRole === "manager") {
                              setActionItem({ id: f.id, type: "delete_fulfillment" });
                            } else {
                              setActionItem({ id: f.id, type: "delete_fulfillment" });
                            }
                          }}
                          className="text-text-muted hover:text-status-error p-1.5 bg-bg-base/50 hover:bg-status-error/10 rounded-md border border-border/50 hover:border-status-error/50 transition-all"
                          title={userRole === "admin" || userRole === "manager" ? "Xoá" : "Yêu cầu Xoá"}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-body-sm text-text-primary">
                      <div className="col-span-2">
                        <span className="text-micro uppercase tracking-wider text-text-muted block mb-1">Sản phẩm</span>
                        <span className="truncate block font-medium">
                          {f.item_name || txn.item_name || "Vật tư"} 
                          {f.item_id !== txn.item_id && f.item_id && (
                             <Badge variant="neutral" className="ml-2 text-[10px] py-0">Đổi mã</Badge>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-micro uppercase tracking-wider text-text-muted block mb-1">Số lượng</span>
                        <span className="font-semibold">{f.quantity}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-micro uppercase tracking-wider text-text-muted block mb-1">Đơn giá</span>
                        <span className="font-medium">{formatCurrency(f.unit_cost)}</span>
                      </div>
                    </div>
                    

                  </div>
                </div>
              ))}

              {/* Add Button / Inline Form */}
              <div className="relative pt-2">
                <div className="absolute -left-[26px] top-6 size-[10px] rounded-full ring-4 ring-bg-card bg-interactive-light z-10" />
                
                {!showAddForm ? (
                  <Button 
                    unstyled 
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-border hover:border-interactive/40 text-text-secondary hover:text-interactive hover:bg-interactive-light/30 transition-all group"
                  >
                    <Plus className="size-4 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Bổ sung phát sinh</span>
                  </Button>
                ) : (
                  <div className="bg-bg-card rounded-xl border border-interactive/20 p-5 shadow-md shadow-interactive/5 animate-in slide-in-from-top-2">
                    <h4 className="text-body-sm font-semibold text-text-primary mb-4">Thêm đợt phát sinh mới</h4>
                    
                    <div className="space-y-4 mb-5">
                      <ComboboxSearch
                        label="Chọn mã vật tư"
                        options={itemOptions}
                        onChange={(value) => setItemId(value)}
                        placeholder="Tìm theo mã hoặc tên vật tư..."
                        isLoading={isLoadingItems}
                        className="w-full"
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-micro uppercase tracking-wider text-text-muted mb-1.5 block">Số lượng</label>
                          <input 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-bg-base/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-interactive focus:ring-1 focus:ring-interactive focus:bg-bg-card transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-micro uppercase tracking-wider text-text-muted mb-1.5 block">Đơn giá (VND)</label>
                          <input 
                            type="number" 
                            value={unitCost}
                            onChange={(e) => setUnitCost(Number(e.target.value))}
                            className="w-full bg-bg-base/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-interactive focus:ring-1 focus:ring-interactive focus:bg-bg-card transition-all" 
                          />
                        </div>
                      </div>

                      {unitCost > 0 && (
                        <div>
                          <label className="text-micro uppercase tracking-wider text-text-muted mb-1.5 block">Phương thức thanh toán</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full bg-bg-base/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-interactive focus:ring-1 focus:ring-interactive focus:bg-bg-card transition-all"
                          >
                            <option value="cash">Tiền mặt</option>
                            <option value="transfer">Chuyển khoản</option>
                            <option value="card">Quẹt thẻ</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button disabled={isPending} unstyled onClick={() => setShowAddForm(false)} className="h-9 px-4 text-sm font-medium text-text-secondary hover:bg-bg-base rounded-lg transition-colors">
                        Hủy
                      </Button>
                      <Button disabled={isPending} unstyled onClick={handleAddFulfillment} className="h-9 px-4 text-sm font-medium bg-interactive text-white hover:bg-interactive-hover rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Lưu bổ sung
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </section>

        </div>

        {/* --- Sticky Footer --- */}
        <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex items-center justify-end gap-3 z-10 shrink-0">
          <Button onClick={onClose} variant="ghost">
            Đóng
          </Button>
        </div>
      </div>
      
      {/* Action Modal (Delete/Edit) */}
      <UnifiedModal 
        isOpen={!!actionItem} 
        onClose={() => setActionItem(null)}
        title={actionItem?.type === "delete_fulfillment" 
          ? (userRole === "admin" || userRole === "manager" ? "Xác nhận xoá phát sinh" : "Yêu cầu xoá phát sinh")
          : "Cập nhật phát sinh"}
      >
        <div className="space-y-4">
          <p className="text-body-sm text-text-secondary">
            {userRole === "admin" || userRole === "manager" 
              ? "Bạn có chắc chắn muốn thực hiện hành động này? Hệ thống sẽ tự động điều chỉnh lại số lượng tồn kho và công nợ."
              : "Vui lòng nhập lý do để Quản lý phê duyệt yêu cầu của bạn."}
          </p>
          
          {userRole !== "admin" && userRole !== "manager" && (
            <div className="space-y-2">
              <label className="text-body-sm font-medium text-text-primary">Lý do (Bắt buộc)</label>
              <Input 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="Khách đổi ý, nhập sai số lượng..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setActionItem(null)} disabled={isSubmittingAction}>Hủy</Button>
            <Button 
              variant={userRole === "admin" || userRole === "manager" ? "danger" : "interactive"} 
              onClick={handleActionConfirm} 
              disabled={isSubmittingAction || (userRole !== "admin" && userRole !== "manager" && !reason.trim())}
            >
              {isSubmittingAction && <Loader2 className="mr-2 size-4 animate-spin" />}
              {userRole === "admin" || userRole === "manager" ? "Xác nhận" : "Gửi yêu cầu"}
            </Button>
          </div>
        </div>
      </UnifiedModal>
    </Drawer>
  );
}
