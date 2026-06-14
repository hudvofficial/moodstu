"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Banknote, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { formatVnd, formatFinanceDate } from "@/components/finance/finance-format";
import { fetchVendorPaymentHistory, voidVendorPayment, type VendorPaymentHistoryItem } from "@/app/actions/vendor-payment-actions";

export interface VendorPaymentHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string | null;
  vendorName: string;
  onVoidSuccess?: () => void;
}

export function VendorPaymentHistoryDrawer({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  onVoidSuccess,
}: VendorPaymentHistoryDrawerProps) {
  const [history, setHistory] = useState<VendorPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const res = await fetchVendorPaymentHistory(vendorId);
      if (!res.success) {
        throw new Error(res.error || "Lỗi tải lịch sử");
      }
      setHistory(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Không tải được lịch sử thanh toán");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (open && vendorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [open, vendorId, loadHistory]);

  const handleVoidPayment = async (paymentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy giao dịch thanh toán này không? Số tiền đã phân bổ sẽ được hoàn lại cho công nợ.")) {
      return;
    }

    setVoidingId(paymentId);
    try {
      const result = await voidVendorPayment({ payment_id: paymentId });
      if (result.success) {
        toast.success("Đã hủy giao dịch thanh toán");
        setHistory((prev) => prev.filter((p) => p.id !== paymentId));
        if (onVoidSuccess) {
          onVoidSuccess();
        }
      } else {
        toast.error(result.error || "Không thể hủy giao dịch");
      }
    } catch (error: any) {
      toast.error(error.message || "Đã xảy ra lỗi hệ thống");
    } finally {
      setVoidingId(null);
    }
  };

  if (!vendorId) return null;

  return (
    <Drawer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Lịch sử thanh toán"
      size="md"
      titleBadge={
        <div className="badge badge-success">
          Đã chi
        </div>
      }
    >
      <div className="space-y-6">
        {/* Vendor Info Summary */}
        <div className="card-base p-4 bg-surface-elevated flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Đối tác</span>
            <span className="text-label text-text-primary font-semibold">{vendorName}</span>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-h4 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-brand" />
            Chi tiết các lần thanh toán
          </h3>

          {loading ? (
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <SkeletonText lines={2} />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-text-muted flex flex-col items-center gap-2 border border-dashed border-border rounded-lg">
              <History className="w-8 h-8 opacity-20" />
              <p className="text-body-sm">Chưa có giao dịch thanh toán nào</p>
            </div>
          ) : (
            <div className="relative pl-3 space-y-5 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/50">
              {history.map((item) => (
                <div key={item.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute left-[-5px] top-1 w-[11px] h-[11px] rounded-full bg-surface-elevated border-2 border-brand" />
                  
                  <div className="card-base p-3 hover:border-brand/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {item.payment_method === "tien_mat" ? (
                          <Banknote className="w-3.5 h-3.5 text-text-muted" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-text-muted" />
                        )}
                        <span className="text-body-sm font-medium text-text-primary">
                          {formatVnd(item.amount)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-caption text-text-muted">
                          {formatFinanceDate(item.payment_date)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-caption text-error hover:text-error/80 disabled:opacity-50 p-0 h-auto"
                          onClick={() => handleVoidPayment(item.id)}
                          disabled={voidingId === item.id}
                        >
                          {voidingId === item.id ? "Đang hủy..." : "Hủy giao dịch"}
                        </Button>
                      </div>
                    </div>
                    {item.note && (
                      <p className="text-caption text-text-secondary mt-1">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
