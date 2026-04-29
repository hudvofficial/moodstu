"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from "@/app/actions/debt-actions";
import type { CreditCardOption } from "@/app/actions/finance-operations-queries";

interface CreditCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CreditCardOption | null;
  onSuccess: () => void;
}

export default function CreditCardFormModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: CreditCardFormModalProps) {
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();

  const [bankName, setBankName] = useState(initialData?.bank_name || "");
  const [last4, setLast4] = useState(initialData?.last_4 || "");
  const [statementDay, setStatementDay] = useState<string | number>(
    initialData?.statement_day || 10,
  );
  const [dueDay, setDueDay] = useState<string | number>(
    initialData?.due_day || 25,
  );
  const [creditLimit, setCreditLimit] = useState<number | null>(
    initialData?.credit_limit ?? null,
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!bankName || !last4 || !statementDay || !dueDay) {
      toast.error("Vui lòng nhập đầy đủ các trường bắt buộc");
      return;
    }

    if (last4.length !== 4) {
      toast.error("4 số cuối thẻ phải đúng 4 ký tự");
      return;
    }

    startTransition(async () => {
      try {
        const submitData = {
          bank_name: bankName,
          last_4: last4,
          statement_day: Number(statementDay) || 10,
          due_day: Number(dueDay) || 25,
          credit_limit: creditLimit,
        };

        if (isEditing && initialData) {
          const response = await updateCreditCard(
            initialData.id,
            submitData,
            initialData.updated_at,
          );
          if (!response.success) {
            throw new Error(response.error || "Cập nhật lỗi");
          }
          toast.success("Đã cập nhật thẻ");
        } else {
          const response = await createCreditCard(submitData);
          if (!response.success) {
            throw new Error(response.error || "Thêm thẻ bị lỗi");
          }
          toast.success("Đã thêm thẻ mới");
        }

        onSuccess();
        onClose();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object" &&
                error !== null &&
                "message" in error
              ? String((error as { message: unknown }).message)
              : "Đã xảy ra lỗi";
        toast.error(message);
      }
    });
  };

  const handleDelete = () => {
    if (!isEditing || !initialData) return;
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa thẻ tín dụng này? Hành động này sẽ không thể hoàn tác nếu không có khoản trả góp nào đang liên kết.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await deleteCreditCard(initialData.id);
        if (!response.success) {
          throw new Error(response.error || "Xóa lỗi");
        }
        toast.success("Đã xóa thẻ");
        onSuccess();
        onClose();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object" &&
                error !== null &&
                "message" in error
              ? String((error as { message: unknown }).message)
              : "Đã xảy ra lỗi khi xóa";
        toast.error(message);
      }
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Cập nhật thẻ tín dụng" : "Thêm thẻ tín dụng mới"}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {isEditing && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isPending}
                className="text-error border-error/50 hover:bg-error/10 hover:text-error"
                type="button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa thẻ
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              type="button"
            >
              Hủy
            </Button>
            <Button onClick={onSubmit} disabled={isPending} type="submit">
              {isPending ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="credit-card-form" onSubmit={onSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tên ngân hàng <span className="text-error">*</span>
            </label>
            <Input
              placeholder="VD: Techcombank, VIB"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              4 số cuối <span className="text-error">*</span>
            </label>
            <Input
              placeholder="VD: 5432"
              maxLength={4}
              value={last4}
              onChange={(event) =>
                setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Ngày sao kê <span className="text-error">*</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="VD: 10"
              value={statementDay}
              onChange={(event) =>
                setStatementDay(event.target.value.replace(/\D/g, "").slice(0, 2))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Ngày thanh toán <span className="text-error">*</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="VD: 25"
              value={dueDay}
              onChange={(event) =>
                setDueDay(event.target.value.replace(/\D/g, "").slice(0, 2))
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Hạn mức tín dụng (Tùy chọn)
          </label>
          <CurrencyInput
            value={creditLimit ?? 0}
            onChange={(value) => setCreditLimit(value || null)}
            placeholder="Nhập hạn mức..."
          />
        </div>
      </form>
    </UnifiedModal>
  );
}
