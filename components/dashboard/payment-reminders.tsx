import { AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaymentReminder {
  id: string;
  contractCode: string;
  customerName: string;
  remainingAmount: number;
}

const MOCK_REMINDERS: PaymentReminder[] = [
  { id: "1", contractCode: "HD-2026-003", customerName: "Chị Trang", remainingAmount: 8500000 },
  { id: "2", contractCode: "HD-2026-007", customerName: "Anh Hoàng & Chị Vy", remainingAmount: 12000000 },
  { id: "3", contractCode: "HD-2026-011", customerName: "Chị Phương", remainingAmount: 3200000 },
];

export function PaymentReminders() {
  return (
    <div className="card-base p-5 entrance entrance-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-h3">Cần thu tiền</h3>
        </div>
        <Button variant="ghost" className="text-caption link-base flex items-center p-0 h-auto">Xem tất cả</Button>
      </div>

      <div className="space-y-3">
        {MOCK_REMINDERS.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              "bg-bg-base/60 hover:bg-bg-hover transition-colors cursor-pointer"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium truncate">{item.customerName}</p>
              <p className="text-caption">{item.contractCode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-body-sm font-bold text-warning">{formatCurrency(item.remainingAmount)} ₫</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
