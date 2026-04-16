"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import type { SalaryItem } from "@/types/finance-operations";

interface PayslipTask {
    id: string;
    work_type: string;
    status: string;
    deadline: string;
    cost: number;
    notes: string | null;
    contracts: { contract_code: string } | null;
}

interface PayslipModalProps {
    salary: SalaryItem;
    onClose: () => void;
}

export function PayslipModal({
    salary,
    onClose,
}: PayslipModalProps) {
    const [tasks, setTasks] = useState<PayslipTask[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchDetails = async () => {
            const year = salary.year;
            const month = salary.month;

            const startOfMonth = new Date(year, month - 1, 1).toISOString();
            const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

            const { data, error } = await supabase
                .from("work_tasks")
                .select(
                    `
                    id,
                    work_type,
                    status,
                    deadline,
                    cost,
                    notes,
                    contracts (
                        contract_code
                    )
                `,
                )
                .eq("assigned_to", salary.employee_id)
                .eq("status", "Hoàn thành")
                .gte("deadline", startOfMonth)
                .lte("deadline", endOfMonth);

            if (error) console.error("Error fetching payslip details:", error);
            setTasks((data as any) || []);
            setLoading(false);
        };

        if (salary) {
            fetchDetails();
        }
    }, [salary, supabase]);

    const handlePrint = () => {
        window.print();
    };

    const totalTaskCost = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    const fmt = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);

    const workLabel = (type: string) => {
        const map: Record<string, string> = {
            PHOTO: "Chụp Ảnh",
            CAMERAMAN: "Quay Phim",
            MAKEUP: "Trang Điểm",
            EDITOR: "Hậu Kỳ",
        };
        return map[type] || type;
    };

    return (
        <UnifiedModal
            isOpen={true}
            onClose={onClose}
            title="Phiếu lương"
            size="lg"
            footer={
                <Button
                    onClick={handlePrint}
                    className="w-full print:hidden"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    In phiếu lương
                </Button>
            }
        >
            <div className="print:p-0 print:overflow-visible">
                {/* Title + Month */}
                <div className="text-center mb-3 print:mb-6">
                    <h1 className="text-base lg:text-xl font-bold text-primary">
                        Phiếu Thanh Toán Lương
                    </h1>
                    <p className="label-base text-center mt-0.5">
                        Tháng {salary.month}/{salary.year}
                    </p>
                </div>

                {/* Employee Info - Compact 2x2 */}
                <div className="card-base p-4 grid grid-cols-2 gap-x-4 gap-y-3 mb-4 text-xs">
                    <div>
                        <span className="block text-text-secondary mb-1">Nhân viên</span>
                        <p className="font-bold text-sm">
                            {salary.employee_name}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="block text-text-secondary mb-1">Mã NV</span>
                        <p className="font-semibold text-xs font-mono">
                            {salary.employee_code || "N/A"}
                        </p>
                    </div>
                    <div>
                        <span className="block text-text-secondary mb-1">Chức vụ</span>
                        <p className="font-bold">{salary.position || "N/A"}</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-text-secondary mb-1">Ngày in</span>
                        <p className="font-bold">
                            {format(new Date(), "dd/MM/yyyy")}
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <hr className="my-2 border-dashed border-border" />

                {/* Tasks Breakdown */}
                <div className="mb-3">
                    <h4 className="label-base mb-2">Lương SP / Khoán / KPI</h4>

                    {loading ? (
                        <div className="flex justify-center py-3">
                            <span className="material-symbols-outlined animate-spin text-primary text-lg">
                                sync
                            </span>
                        </div>
                    ) : tasks.length > 0 ? (
                        <div className="space-y-1">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between py-1.5 px-2 rounded-soft bg-bg-sidebar/50 text-xs"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-text-main text-xs">
                                                {task.contracts?.contract_code || "Hợp đồng (Không mã)"}
                                            </span>
                                            <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 font-semibold rounded-soft">
                                                {workLabel(task.work_type)}
                                            </span>
                                        </div>
                                        {task.deadline && (
                                            <span className="text-xs text-text-secondary">
                                                {format(new Date(task.deadline), "dd/MM")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold text-purple-600 text-xs tabular-nums shrink-0 ml-2">
                                        {fmt(task.cost || 0)}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between px-2 pt-1.5 border-t border-dashed border-border text-xs">
                                <span className="font-bold text-text-secondary">
                                    Tổng SP/Khoán
                                </span>
                                <span className="font-bold text-purple-700">
                                    {fmt(totalTaskCost)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center py-2 text-text-secondary italic text-xs">
                            Không có công việc hoàn thành.
                        </p>
                    )}
                </div>

                {/* Divider */}
                <hr className="my-2 border-dashed border-border" />

                {/* Salary Summary */}
                <div className="card-base p-4 mb-3">
                    <h4 className="label-base mb-2">Tổng kết</h4>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-text-secondary">Lương cứng</span>
                            <span className="font-bold tabular-nums">
                                {fmt(salary.base_salary)}
                            </span>
                        </div>
                        <div className="flex justify-between text-purple-700">
                            <span className="font-bold">Lương SP/Khoán (+)</span>
                            <span className="font-bold tabular-nums">
                                {fmt(salary.product_salary || 0)}
                            </span>
                        </div>
                        {(salary.bonus || 0) > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Thưởng (+)</span>
                                <span className="font-bold tabular-nums">
                                    {fmt(salary.bonus)}
                                </span>
                            </div>
                        )}
                        {(salary.penalty || 0) > 0 && (
                            <div className="flex justify-between text-rose-500">
                                <span>Phạt (−)</span>
                                <span className="font-bold tabular-nums">
                                    −{fmt(salary.penalty)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1">
                            <span className="text-text-main">Tổng thu nhập</span>
                            <span className="tabular-nums">{fmt(salary.total_salary)}</span>
                        </div>
                        {(salary.advance_payment || 0) > 0 && (
                            <div className="flex justify-between text-amber-600">
                                <span>Tạm ứng (−)</span>
                                <span className="font-bold tabular-nums">
                                    −{fmt(salary.advance_payment)}
                                </span>
                            </div>
                        )}
                    </div>
                    {/* NET */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-primary/20">
                        <span className="text-xs font-bold text-primary">
                            Thực lĩnh (Tổng Phải Trả)
                        </span>
                        <span className="text-lg font-bold text-primary tabular-nums">
                            {fmt(salary.net_salary)}
                        </span>
                    </div>

                    <div className="flex justify-between flex-col items-end mt-2 pt-2 border-t border-border border-dashed">
                        <div className="flex justify-between w-full text-success">
                            <span className="text-xs font-bold">Đã thanh toán:</span>
                            <span className="text-xs font-bold tabular-nums">
                                {fmt(salary.paid_amount)}
                            </span>
                        </div>
                        {salary.remaining_amount > 0 && (
                            <div className="flex justify-between w-full text-error mt-1">
                                <span className="text-xs font-bold">Còn lại:</span>
                                <span className="text-xs font-bold tabular-nums">
                                    {fmt(salary.remaining_amount)}
                                </span>
                            </div>
                        )}
                    </div>

                </div>

                {/* Signature - compact on mobile, full on print */}
                <div className="grid grid-cols-2 mt-4 lg:mt-8 text-center text-[10px] lg:text-sm gap-4 print:mt-16 print:text-sm">
                    <div>
                        <p className="font-bold mb-6 lg:mb-16 text-text-secondary">
                            Người lập phiếu
                        </p>
                        <p className="italic text-text-secondary opacity-60">
                            (Ký, họ tên)
                        </p>
                    </div>
                    <div>
                        <p className="font-bold mb-6 lg:mb-16 text-text-secondary">
                            Nhân viên xác nhận
                        </p>
                        <p className="italic text-text-secondary opacity-60">
                            {salary.employee_name}
                        </p>
                    </div>
                </div>

                <div className="mt-4 text-center text-[9px] text-text-secondary opacity-40 print:block hidden">
                    Mood Wedding Studio - In từ hệ thống quản lý
                </div>
            </div>
        </UnifiedModal>
    );
}
