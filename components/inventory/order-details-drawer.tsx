"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Edit2, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InventoryTransaction } from "@/types/inventory";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { useOrderFulfillments } from "@/lib/hooks/use-order-fulfillments";
import { addFulfillmentTransaction } from "@/app/actions/inventory-mutations";
import { toast } from "sonner";

interface OrderDetailsDrawerProps {
  txn: InventoryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function fmt(value: number | null | undefined) {
  return `${formatCurrency(value || 0)} ${CURRENCY_SYMBOL}`;
}

export function OrderDetailsDrawer({
  txn,
  isOpen,
  onClose,
}: OrderDetailsDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState<number>(50);
  const [unitCost, setUnitCost] = useState<number>(txn?.unit_cost || 0);

  const { fulfillments, isLoading, mutate } = useOrderFulfillments(txn?.id);

  if (!txn) return null;

  const totalQuantity = fulfillments.reduce((sum, f) => sum + f.quantity, 0);
  const totalAmount = fulfillments.reduce((sum, f) => sum + (f.quantity * f.unit_cost), 0);

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
          quantity,
          unitCost
        });
        toast.success("Bổ sung phát sinh thành công");
        setShowAddForm(false);
        mutate(); // refresh SWR
      } catch (err: any) {
        toast.error(err.message || "Đã có lỗi xảy ra");
      }
    });
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
      <div className="flex flex-col gap-8 h-full pb-8">
        
        {/* --- Customer Reference --- */}
        <section className="bg-bg-base/40 rounded-xl p-5">
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <div>
              <p className="text-micro uppercase tracking-wider text-text-muted mb-1.5 font-medium">Khách hàng / Đối tác</p>
              <p className="text-body-sm text-text-primary font-semibold">
                {txn.customer_name || txn.supplier || "Khách lẻ"}
              </p>
            </div>
            <div>
              <p className="text-micro uppercase tracking-wider text-text-muted mb-1.5 font-medium">Loại chứng từ</p>
              <p className="text-body-sm text-text-primary font-semibold capitalize">
                {txn.transaction_type.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-micro uppercase tracking-wider text-text-muted mb-1.5 font-medium">Người tạo</p>
              <p className="text-body-sm text-text-primary font-semibold truncate">
                {txn.performer_name || txn.created_by || "Hệ thống"}
              </p>
            </div>
            <div>
              <p className="text-micro uppercase tracking-wider text-text-muted mb-1.5 font-medium">Ghi chú</p>
              <p className="text-body-sm text-text-primary font-medium truncate opacity-80">
                {txn.notes || "-"}
              </p>
            </div>
          </div>
        </section>

        {/* --- Fulfillment History --- */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-body-sm uppercase tracking-wider font-semibold text-text-secondary">Lịch sử xuất / in ấn</h3>
          </div>
          
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="size-6 animate-spin text-interactive" />
              </div>
            ) : (
            <div className="relative pl-6 space-y-6">
              {/* Vertical line */}
              <div className="absolute top-4 bottom-8 left-[7px] w-[2px] bg-border-light rounded-full" />
              
              {fulfillments.map((f, idx) => (
                <div key={f.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[29px] top-5 size-[10px] rounded-full ring-4 ring-bg-card bg-border group-hover:bg-interactive transition-colors z-10" />
                  
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
                      <Badge variant={"success"} className="font-medium px-2.5 py-0.5">
                        Đã xuất
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-body-sm text-text-primary">
                      <div className="col-span-2">
                        <span className="text-micro uppercase tracking-wider text-text-muted block mb-1">Sản phẩm</span>
                        <span className="truncate block font-medium">{f.item_name || txn.item_name || "Vật tư"}</span>
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
                    
                    {/* Hover actions (Desktop only) */}
                    <div className="hidden lg:flex absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1.5">
                      <Button unstyled className="p-1.5 text-text-muted hover:text-interactive bg-bg-card rounded-md shadow-xs border border-border/50 hover:border-interactive/30 transition-all">
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button unstyled className="p-1.5 text-text-muted hover:text-status-error bg-bg-card rounded-md shadow-xs border border-border/50 hover:border-status-error/30 transition-all">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Button / Inline Form */}
              <div className="relative pt-2">
                <div className="absolute -left-[29px] top-6 size-[10px] rounded-full ring-4 ring-bg-card bg-interactive-light z-10" />
                
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
                    <div className="grid grid-cols-2 gap-4 mb-5">
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

        {/* --- Summary / Hóa đơn --- */}
        <section className="bg-bg-card rounded-xl p-5 border border-border/50 shadow-xs shrink-0">
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-text-secondary font-medium">Tổng số lượng</span>
              <span className="text-text-primary font-semibold">{totalQuantity}</span>
            </div>
            <div className="w-full border-t border-dashed border-border/60 my-1" />
            
            <div className="flex flex-col gap-1.5">
              {fulfillments.map((f, idx) => (
                <div key={f.id} className="flex justify-between items-center text-caption">
                  <span className="text-text-muted">Tiền in đợt {idx + 1}</span>
                  <span className="text-text-secondary font-medium">{fmt(f.quantity * f.unit_cost)}</span>
                </div>
              ))}
            </div>
            
            <div className="w-full border-t border-border/40 mt-1 mb-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-body-sm uppercase tracking-wider font-bold text-text-primary">Tổng Tiền</span>
              <span className="text-[22px] tracking-tight font-bold text-text-primary">{fmt(totalAmount)}</span>
            </div>
          </div>
        </section>

      </div>
    </Drawer>
  );
}
