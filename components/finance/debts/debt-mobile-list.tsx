"use client";

import { DebtMobileSwipeCard } from "@/components/finance/debts/debt-mobile-swipe-card";
import type { DebtListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface DebtMobileListProps {
    items: DebtListItem[];
    bankInfo: BankInfo | null;
    busyId: string | null;
    onMarkPaid: (item: DebtListItem) => void;
    onViewHistory: (item: DebtListItem) => void;
    onDelete: (item: DebtListItem) => void;
}

export function DebtMobileList({ items, bankInfo, busyId, onMarkPaid, onViewHistory, onDelete }: DebtMobileListProps) {
    return (
        <div className="space-y-3 pb-32">
            {items.length === 0 ? (
                <div className="card-base p-5 text-center text-text-muted">
                    Chưa có công nợ.
                </div>
            ) : (
                items.map((item) => (
                    <DebtMobileSwipeCard
                        key={item.id}
                        receipt={item}
                        bankInfo={bankInfo}
                        busyId={busyId}
                        onMarkPaid={onMarkPaid}
                        onViewHistory={onViewHistory}
                        onDelete={onDelete}
                    />
                ))
            )}
        </div>
    );
}
