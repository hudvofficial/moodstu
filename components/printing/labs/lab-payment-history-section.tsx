"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Receipt, RefreshCw, Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { fetchLabPaymentHistory } from "@/app/actions/lab-queries";
import { formatCurrency, CURRENCY_SYMBOL, cn } from "@/lib/utils";
import type { LabPaymentHistoryItem } from "@/types/printing";

const EMPTY_PAYMENTS: LabPaymentHistoryItem[] = [];

interface PaymentHistorySectionProps {
  labId: string;
  isOpen?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  other: "Khác",
};

export function LabPaymentHistorySection({
  labId,
  isOpen: defaultOpen = false,
}: PaymentHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: historyResult, isLoading, mutate } = useSWR(
    isExpanded ? ["lab-payment-history", labId] : null,
    () => fetchLabPaymentHistory(labId),
    { revalidateOnMount: true }
  );

  const allPayments: LabPaymentHistoryItem[] = historyResult?.success
    ? historyResult.data.items
    : EMPTY_PAYMENTS;

  // Filter payments based on search and date range
  const payments = useMemo(() => {
    let filtered = [...allPayments];

    // Search filter (order code or note)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.allocations.some(alloc =>
          alloc.orderCode.toLowerCase().includes(query)
        ) ||
        (payment.note && payment.note.toLowerCase().includes(query))
      );
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(payment =>
        new Date(payment.paymentDate) >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(payment =>
        new Date(payment.paymentDate) <= toDate
      );
    }

    return filtered;
  }, [allPayments, searchQuery, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const togglePayment = (paymentId: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const exportToExcel = () => {
    if (payments.length === 0) return;

    // Create CSV content
    const headers = [
      "Ngày thanh toán",
      "Phương thức",
      "Số tiền",
      "Mã đơn",
      "Số tiền phân bổ",
      "Ghi chú",
      "Người tạo",
    ];

    const rows = payments.flatMap(payment =>
      payment.allocations.map((alloc, index) => [
        index === 0 ? formatDate(payment.paymentDate) : "",
        index === 0 ? PAYMENT_METHOD_LABELS[payment.paymentMethod] : "",
        index === 0 ? payment.amount.toString() : "",
        alloc.orderCode,
        alloc.amount.toString(),
        index === 0 ? payment.note || "" : "",
        index === 0 ? payment.createdBy || "" : "",
      ])
    );

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Add BOM for UTF-8
    const blob = new Blob(["﻿" + csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    // Download
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `lich-su-thanh-toan-lab-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <Button unstyled
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-bg-hover hover:bg-bg-base transition-colors"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-text-secondary" />
          <h3 className="font-semibold text-text-main">Lịch sử thanh toán</h3>
          {payments.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {payments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                mutate();
              }}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          )}
        </div>
      </Button>

      {/* Filters */}
      {isExpanded && (
        <div className="border-t border-border p-3 bg-bg-base space-y-3">
          {/* Search & Date Range */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo mã đơn hoặc ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <Button unstyled
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-hover rounded"
                >
                  <X className="w-3.5 h-3.5 text-text-muted" />
                </Button>
              )}
            </div>

            {/* Date From */}
            <div className="w-full sm:w-36 shrink-0">
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Từ ngày"
                compact
              />
            </div>

            {/* Date To */}
            <div className="w-full sm:w-36 shrink-0">
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="Đến ngày"
                compact
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Xóa bộ lọc
                </Button>
              )}
              <span className="text-xs text-text-muted">
                {payments.length} / {allPayments.length} giao dịch
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={payments.length === 0}
              className="h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {isLoading && payments.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              Đang tải...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              Chưa có giao dịch thanh toán
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((payment) => {
                const isPaymentExpanded = expandedPayments.has(payment.id);

                return (
                  <div key={payment.id} className="hover:bg-bg-hover transition-colors">
                    {/* Payment Summary Row */}
                    <Button unstyled
                      type="button"
                      onClick={() => togglePayment(payment.id)}
                      className="w-full p-4 flex items-start justify-between gap-4 text-left block"
                    >
                      {/* Left: Date & Method */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-text-main">
                            {formatDate(payment.paymentDate)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-info/10 text-info">
                            {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                          <span>{payment.allocations.length} đơn được thanh toán</span>
                          {payment.createdBy && (
                            <>
                              <span>•</span>
                              <span>Bởi: {payment.createdBy}</span>
                            </>
                          )}
                        </div>
                        {payment.note && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-1">
                            {payment.note}
                          </p>
                        )}
                      </div>

                      {/* Right: Amount & Expand Icon */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-base text-success">
                            {formatCurrency(payment.amount)}
                            <span className="text-xs ml-1">{CURRENCY_SYMBOL}</span>
                          </p>
                        </div>
                        {isPaymentExpanded ? (
                          <ChevronUp className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        )}
                      </div>
                    </Button>

                    {/* Allocation Details (Expanded) */}
                    {isPaymentExpanded && payment.allocations.length > 0 && (
                      <div className="px-4 pb-4 space-y-1 bg-bg-base">
                        <p className="text-xs font-medium text-text-secondary mb-2">
                          Chi tiết phân bổ:
                        </p>
                        {payment.allocations.map((alloc) => (
                          <div
                            key={alloc.orderId}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className="text-text-secondary">
                              {alloc.orderCode}
                            </span>
                            <span className="font-medium text-text-main">
                              {formatCurrency(alloc.amount)} {CURRENCY_SYMBOL}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
