"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { getExpenseDetail } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { readMoney } from "@/lib/finance-utils";
import type { ExpensePrintData } from "@/components/finance/expenses/print-expense-client";
import type { StudioInfo } from "@/types/settings";

interface ExpenseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenseId: string | null;
}

export function ExpenseDetailModal({ isOpen, onClose, expenseId }: ExpenseDetailModalProps) {
    const [data, setData] = useState<{ expense: ExpensePrintData; studio: StudioInfo | null } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset data if modal transitions to closed
        if (!isOpen) {
            const timer = setTimeout(() => {
                setData(null);
                setError(null);
            }, 300);
            return () => clearTimeout(timer);
        }

        if (!expenseId) return;

        let isMounted = true;
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [expenseRes, studioRes] = await Promise.all([
                    getExpenseDetail(expenseId),
                    getStudioInfo()
                ]);

                if (!isMounted) return;

                if (!expenseRes.success) {
                    setError(typeof expenseRes.error === 'string' ? expenseRes.error : "Không tìm thấy phiếu chi hoặc phiếu chi đã bị xóa.");
                    return;
                }
                if (!expenseRes.data) {
                    setError("Không tìm thấy phiếu chi hoặc phiếu chi đã bị xóa.");
                    return;
                }

                setData({
                    expense: expenseRes.data as ExpensePrintData,
                    studio: studioRes.success ? studioRes.data : null
                });
            } catch (err: unknown) {
                if (isMounted) setError("Đã xảy ra lỗi hệ thống: " + (err as Error).message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, [isOpen, expenseId]);

    let content;

    if (isLoading) {
        content = (
            <div className="flex flex-col items-center justify-center py-20 w-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-text-secondary text-sm">Đang tải phiếu chi...</p>
            </div>
        );
    } else if (error) {
        content = (
            <div className="flex flex-col items-center justify-center py-20 w-full min-h-[400px]">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
                    <span className="text-error font-bold">!</span>
                </div>
                <p className="text-error text-center font-medium px-6">{error}</p>
            </div>
        );
    } else if (data) {
        const { expense, studio } = data;
        const expenseDate = new Date(expense.expense_date);
        const formattedDate = `Ngày ${format(expenseDate, "dd")} tháng ${format(expenseDate, "MM")} năm ${format(expenseDate, "yyyy")}`;

        const statusColorMap: Record<string, string> = {
            error: "border-error text-error",
            success: "border-success text-success",
            warning: "border-warning text-warning",
            default: "border-border text-text-secondary"
        };

        const statusVariant = financeStatusVariant(expense.approved_by ? "approved" : "pending");
        const statusColor = statusColorMap[statusVariant] || statusColorMap.default;

        const refCode = `EXP-${expense.id.slice(0, 8).toUpperCase()}`;
        const expenseCode = expense.contract_code
            ? `PC-${expense.contract_code}`
            : `PC-${format(expenseDate, "yyMM")}-${expense.id.slice(0, 3).toUpperCase()}`;

        content = (
            <div className="relative overflow-hidden pt-8 sm:pt-10 pb-2 w-full min-h-[400px]">
                {/* Custom Close Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="absolute top-0 right-0 w-8 h-8 p-0 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 z-50"
                    aria-label="Đóng"
                >
                    <X className="w-4 h-4" />
                </Button>

                {/* Stamp */}
                <div className="absolute top-10 right-0 z-0 pointer-events-none select-none">
                    <div
                        className={`border-2 px-4 py-1.5 rounded font-bold text-xs md:text-sm transform -rotate-12 opacity-70 ${statusColor}`}
                    >
                        {financeStatusLabel(expense.approved_by ? "approved" : "pending")}
                    </div>
                </div>

                {/* Branding & Header */}
                <div className="relative z-10 flex justify-between items-start border-b border-border pb-4 mb-5 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-12 h-12 bg-surface-base border border-border rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                            <Image
                                src={studio?.logo_url || "/logo.png"}
                                alt={studio?.name || "Mood Studio"}
                                fill
                                className="object-contain p-1.5"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-bold text-text-primary leading-tight truncate">
                                {studio?.name || "Mood Studio"}
                            </h2>
                            <div className="text-xs text-text-secondary mt-0.5">
                                {studio?.address && <p className="truncate">{studio.address}</p>}
                                {studio?.hotline && <p className="truncate">Hotline: {studio.hotline}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:block text-right text-xs text-text-secondary min-w-fit">
                        <p className="font-bold text-text-primary">Mẫu số 02-TT</p>
                        <p className="italic">Phiếu chi hệ thống</p>
                    </div>
                </div>

                {/* Document Title */}
                <div className="text-center mb-5 relative z-10">
                    <h1 className="text-xl font-bold text-text-primary uppercase tracking-tight">
                        Phiếu Chi
                    </h1>
                    <p className="text-text-secondary italic text-xs mt-0.5">
                        {formattedDate}
                    </p>
                    <div className="mt-2 inline-block bg-surface px-3 py-1 rounded-full border border-border">
                        <p className="text-xs text-text-secondary">
                            Số phiếu: <span className="text-text-primary font-bold">{expenseCode}</span>
                        </p>
                    </div>
                </div>

                {/* Content Fields */}
                <div className="space-y-3 text-sm relative z-10 px-1">
                    {/* Người nhận */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-dashed border-border">
                        <div className="text-text-secondary text-xs sm:w-28 shrink-0">Người nhận tiền:</div>
                        <div className="font-bold text-text-primary">{expense.recipient || "Không xác định"}</div>
                    </div>

                    {/* Nội dung */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-dashed border-border">
                        <div className="text-text-secondary text-xs sm:w-28 shrink-0">Lý do chi:</div>
                        <div className="text-text-primary">
                            {expense.category_name || "Chi khác"}
                            {expense.description && (
                                <span className="block text-text-secondary text-xs italic mt-0.5">
                                    {expense.description}
                                </span>
                            )}
                            {expense.contract_code && (
                                <span className="block text-text-secondary text-xs italic mt-0.5">
                                    Theo HĐ: <strong>{expense.contract_code}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Số tiền */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 pb-2 border-b border-dashed border-border bg-error/5 p-2 rounded -mx-2 px-3">
                        <div className="text-text-secondary text-xs sm:w-24 shrink-0 font-medium">Số tiền:</div>
                        <div>
                            <div className="text-lg font-bold text-error leading-none">
                                {formatVnd(expense.amount)}
                            </div>
                            <div className="text-text-secondary italic text-xs mt-1">
                                (Bằng chữ: <span className="font-medium text-text-primary">{readMoney(expense.amount)}</span>)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-6 grid grid-cols-4 gap-2 text-center pt-4">
                    <div className="flex flex-col items-center">
                        <p className="font-bold text-text-primary text-[11px] mb-0.5 leading-tight">Ban giám đốc</p>
                        <p className="text-[10px] text-text-secondary italic mb-2">(Ký, họ tên)</p>
                        <div className="h-10 w-full flex items-center justify-center opacity-80">
                            {expense.approved_by && (
                                <div className="border border-success text-success px-1.5 py-0.5 rounded font-semibold text-[10px] transform -rotate-12">
                                    ĐÃ DUYỆT
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="font-bold text-text-primary text-[11px] mb-0.5 leading-tight">Kế toán</p>
                        <p className="text-[10px] text-text-secondary italic mb-2">(Ký, họ tên)</p>
                        <div className="h-10 w-full flex items-center justify-center text-text-muted">
                            {/* Chưa ký */}
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="font-bold text-text-primary text-[11px] mb-0.5 leading-tight">Thủ quỹ</p>
                        <p className="text-[10px] text-text-secondary italic mb-2">(Ký, đóng dấu)</p>
                        <div className="h-10 w-full flex items-center justify-center">
                            <div className="border border-error text-error px-1.5 py-0.5 rounded font-semibold text-[10px] transform rotate-6">
                                ĐÃ CHI
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="font-bold text-text-primary text-[11px] mb-0.5 leading-tight">Người nhận</p>
                        <p className="text-[10px] text-text-secondary italic mb-2">(Ký, họ tên)</p>
                        <div className="h-10 w-full flex items-center justify-center">
                            <span className="font-serif italic text-xs max-w-full truncate px-0.5">{expense.recipient || "K/H"}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="mt-8 text-center border-t border-dashed border-border pt-3 opacity-50 flex flex-col gap-1">
                    <p className="text-[10px] text-text-secondary font-mono">
                        ID: {expense.id.split("-")[0]} • Ref: {refCode} • Created: {expense.created_at ? format(new Date(expense.created_at), "dd/MM/yyyy HH:mm") : "N/A"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <UnifiedModal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            showCloseButton={false}
        >
            {content}
        </UnifiedModal>
    );
}
