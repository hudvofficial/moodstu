"use client";
import { useState } from "react";
import { formatVnd } from "@/components/finance/finance-format";
import { CurrencyInput } from "@/components/ui/currency-input";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import type { SalaryItem } from "@/types/finance-operations";

interface PaymentConfirmModalProps {
    salary: SalaryItem;
    onConfirm: (amount: number) => void;
    onClose: () => void;
}

export function PaymentConfirmModal({
    salary,
    onConfirm,
    onClose,
}: PaymentConfirmModalProps) {
    const currentDebt = salary.remaining_amount;
    const employeeName = salary.employee_name;

    const [amount, setAmount] = useState(currentDebt);

    return (
        <UnifiedModal
            isOpen={true}
            onClose={onClose}
            title="Xác nhận thanh toán lương"
            size="md"
            footer={
                <div className="flex gap-3 w-full mt-2">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                        Hủy bỏ
                    </Button>
                    <Button
                        type="button"
                        onClick={() => onConfirm(amount)}
                        disabled={amount <= 0 || amount > currentDebt}
                        className="flex-[2]"
                    >
                        Xác nhận chi tiền
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="card-base p-3 text-body-sm space-y-2">
                    <div className="flex justify-between gap-3 items-center">
                        <span className="text-text-secondary">Nhân viên</span>
                        <span className="font-bold">{employeeName}</span>
                    </div>
                    <div className="flex justify-between gap-3 items-center">
                        <span className="text-text-secondary">Số tiền còn nợ</span>
                        <span className="font-bold text-error tabular-nums">{formatVnd(currentDebt)}</span>
                    </div>
                </div>

                <div>
                    <label className="label-base">Số tiền thanh toán lần này</label>
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        className="w-full text-xl font-bold border-2 border-primary/20 rounded-soft-lg py-3 pl-4 text-primary min-h-[44px]"
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-text-secondary italic">
                            Còn lại sau thanh toán:{" "}
                            <span className="font-bold text-text-main">
                                {formatVnd(Math.max(0, currentDebt - amount))}
                            </span>
                        </p>
                        <Button unstyled
                            type="button"
                            onClick={() => setAmount(currentDebt)}
                            className="text-xs font-semibold text-primary hover:underline hover:text-primary-dark transition-colors"
                        >
                            Tất toán
                        </Button>
                    </div>
                </div>
            </div>
        </UnifiedModal>
    );
}
