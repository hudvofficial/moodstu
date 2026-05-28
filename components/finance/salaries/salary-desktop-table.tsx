import { SalaryRowActions } from "./salary-row-actions";
import { formatVnd } from "@/components/finance/finance-format";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryDesktopTableProps {
    items: SalaryItem[];
    onView: (item: SalaryItem) => void;
    onAdjust: (item: SalaryItem) => void;
    onPay: (item: SalaryItem) => void;
    onPrint: (item: SalaryItem) => void;
    onDelete: (item: SalaryItem) => void;
}

export function SalaryDesktopTable({ items, onView, onAdjust, onPay, onPrint, onDelete }: SalaryDesktopTableProps) {
    return (
        <div className="hidden lg:block">
            <TableWrapper>
                <THead>
                    <TR>
                        <TH>Nhân viên</TH>
                        <TH className="text-right">Cơ bản</TH>
                        <TH className="text-right">Sản phẩm</TH>
                        <TH className="text-right">Thưởng</TH>
                        <TH className="text-right">Phạt</TH>
                        <TH className="text-right">Thực nhận</TH>
                        <TH className="text-right">Đã trả</TH>
                        <TH className="text-right">Còn lại</TH>
                        <TH className="text-right w-48">Thao tác</TH>
                    </TR>
                </THead>
                <TBody>
                    {items.map((item) => (
                        <TR key={item.id}>
                            <TD>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-text-primary">{item.employee_name}</span>
                                    {item.role === "ctv" && (
                                        <Badge variant="neutral" className="text-micro px-1.5 py-0">CTV</Badge>
                                    )}
                                </div>
                                <div className="text-caption text-text-muted">
                                    {item.employee_code || "-"} · {item.position || "Chưa có vị trí"}
                                </div>
                            </TD>
                            <TD className="text-right tabular-nums">{formatVnd(item.base_salary)}</TD>
                            <TD className="text-right tabular-nums">{formatVnd(item.product_salary)}</TD>
                            <TD className="text-right tabular-nums text-success">{formatVnd(item.bonus)}</TD>
                            <TD className="text-right tabular-nums text-error">{formatVnd(item.penalty)}</TD>
                            <TD className="text-right tabular-nums font-bold">{formatVnd(item.net_salary)}</TD>
                            <TD className="text-right tabular-nums text-success">{formatVnd(item.paid_amount)}</TD>
                            <TD className={cn("text-right tabular-nums", item.remaining_amount > 0 ? "text-error font-medium" : "text-text-muted")}>
                                {formatVnd(item.remaining_amount)}
                            </TD>
                            <TD className="text-right">
                                <SalaryRowActions
                                    item={item}
                                    onPay={onPay}
                                    onPrint={onPrint}
                                    onView={onView}
                                    onAdjust={onAdjust}
                                    onDelete={onDelete}
                                />
                            </TD>
                        </TR>
                    ))}
                    {items.length === 0 && (
                        <TR>
                            <TD colSpan={9} className="py-7 text-center text-text-muted">
                                Chưa có dữ liệu lương tháng này.
                            </TD>
                        </TR>
                    )}
                </TBody>
            </TableWrapper>
        </div>
    );
}
