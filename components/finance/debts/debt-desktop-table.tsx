"use client";

import { CheckCircle, Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { DebtListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";
import { DebtRowActions } from "./debt-row-actions";

interface DebtDesktopTableProps {
    items: DebtListItem[];
    bankInfo: BankInfo | null;
    busyId: string | null;
    onMarkPaid: (item: DebtListItem) => void;
    onDelete: (item: DebtListItem) => void;
}

export function getDebtBadge(item: DebtListItem) {
    if (item.status === "closed" || item.status === "da_thanh_toan") return { className: "badge badge-success", label: "Đã thanh toán" };
    if (item.days_overdue > 0) return { className: "badge badge-error", label: `Quá hạn ${item.days_overdue} ngày` };
    return { className: "badge badge-warning", label: "Đang nợ" };
}

export function DebtDesktopTable({ items, bankInfo, busyId, onMarkPaid, onDelete }: DebtDesktopTableProps) {
    return (
        <div className="hidden lg:block">
            <TableWrapper>
                <THead>
                    <TR>
                        <TH>Hạn thanh toán</TH>
                        <TH>Đối tượng</TH>
                        <TH>Loại</TH>
                        <TH className="text-right">Số tiền</TH>
                        <TH>Trạng thái</TH>
                        <TH className="text-right w-32">Thao tác</TH>
                    </TR>
                </THead>
                <TBody>
                    {items.length === 0 ? (
                        <TR>
                            <TD colSpan={6} className="py-7 text-center text-text-muted">
                                Chưa có công nợ.
                            </TD>
                        </TR>
                    ) : (
                        items.map((item) => {
                            const badge = getDebtBadge(item);
                            return (
                                <TR key={item.id} className={item.days_overdue > 0 && item.status !== "da_thanh_toan" ? "bg-error/5 hover:bg-error/10" : ""}>
                                    <TD>{formatFinanceDate(item.due_date)}</TD>
                                    <TD>
                                        <div className="text-body-sm font-medium mb-1.5">{item.entity_name}</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="tag-badge">{item.entity_type}</span>
                                            {item.notes && <span className="text-caption text-text-muted max-w-[200px] truncate">{item.notes}</span>}
                                        </div>
                                    </TD>
                                    <TD>
                                        <span className="text-body-sm block">{item.type}</span>
                                        {item.platform && (
                                            <div className="mt-1 flex items-center gap-1.5">
                                                <span className="tag-badge text-[10px] uppercase font-bold text-text-muted">{item.platform.replace("_", " ")}</span>
                                            </div>
                                        )}
                                    </TD>
                                    <TD className="text-right">
                                        <div className="tabular-nums font-bold text-h3">{formatVnd(item.remaining)}</div>
                                        <div className="text-caption text-text-muted">Gốc {formatVnd(item.amount)}</div>
                                    </TD>
                                    <TD>
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className={badge.className}>{badge.label}</span>
                                            {item.installment_total ? (
                                                <span className="text-[11px] font-medium text-text-muted bg-bg-hover px-1.5 py-0.5 rounded-sm border border-border/50">
                                                    Kỳ {(item.installment_paid || 0)}/{item.installment_total}
                                                </span>
                                            ) : null}
                                        </div>
                                    </TD>
                                    <TD className="text-right w-32">
                                        <div className="flex flex-row items-center justify-end gap-1.5 min-w-max">
                                            <DebtRowActions
                                                debt={item}
                                                bankInfo={bankInfo}
                                                busyId={busyId}
                                                onMarkPaid={onMarkPaid}
                                                onDelete={onDelete}
                                            />
                                        </div>
                                    </TD>
                                </TR>
                            );
                        })
                    )}
                </TBody>
            </TableWrapper>
        </div>
    );
}
