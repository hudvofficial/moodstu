"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Badge } from "@/components/ui/badge";
import { LabPaymentHistorySection } from "./lab-payment-history-section";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import type { Lab } from "@/types/printing";
import { MapPin, Phone, Mail, Factory } from "lucide-react";

interface LabDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lab: Lab | null;
  debt?: number;
}

type TabValue = "info" | "history";

export function LabDetailDrawer({ isOpen, onClose, lab, debt = 0 }: LabDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("info");

  if (!lab) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Lab: ${lab.lab_name}`}
      width="650px"
      titleBadge={
        debt > 0 ? (
          <Badge variant="error">
            Nợ: {formatCurrency(debt)} {CURRENCY_SYMBOL}
          </Badge>
        ) : (
          <Badge variant="success">Đã thanh toán</Badge>
        )
      }
    >
      {/* Tabs */}
      <div className="mb-4">
        <TabsFilter
          tabs={[
            { value: "info", label: "Thông tin", count: undefined },
            { value: "history", label: "Thanh toán", count: undefined },
          ]}
          activeTab={activeTab}
          onChange={(val) => setActiveTab(val as TabValue)}
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "info" && (
          <div className="space-y-4">
            {/* Lab Info */}
            <div className="p-4 bg-bg-hover rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Factory className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-main text-lg mb-1">
                    {lab.lab_name}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {lab.contact_person || "Chưa có người liên hệ"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {lab.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="text-text-secondary font-medium">{lab.phone}</span>
                  </div>
                )}

                {lab.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{lab.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-bg-hover rounded-lg border-l-4 border-info">
                <p className="text-overline text-text-muted mb-1">Đơn chưa trả</p>
                <p className="text-h3 font-bold text-info tabular-nums">
                  {lab.unpaidOrders}
                </p>
              </div>

              <div className="p-4 bg-bg-hover rounded-lg border-l-4 border-primary">
                <p className="text-overline text-text-muted mb-1">Dịch vụ</p>
                <p className="text-h3 font-bold text-primary tabular-nums">
                  {lab.serviceCount}
                </p>
              </div>
            </div>

            {/* Debt Summary */}
            <div className={`p-4 bg-bg-hover rounded-lg border-l-4 ${debt > 0 ? 'border-error' : 'border-success'}`}>
              <h3 className="font-semibold mb-2 text-text-main">Công nợ</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Tổng nợ:</span>
                <span className={`text-2xl font-bold tabular-nums ${debt > 0 ? 'text-error' : 'text-success'}`}>
                  {formatCurrency(debt)} {CURRENCY_SYMBOL}
                </span>
              </div>
            </div>

            {/* Services Preview */}
            {lab.services && lab.services.length > 0 && (
              <div className="p-4 bg-bg-hover rounded-lg">
                <h3 className="font-semibold mb-3 text-text-main">Bảng giá ({lab.serviceCount})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lab.services.slice(0, 5).map((service) => (
                    <div key={service.id} className="flex justify-between items-center text-sm py-1">
                      <span className="text-text-secondary">{service.item_name}</span>
                      <span className="font-semibold text-text-main tabular-nums">
                        {formatCurrency(service.cost_price)} {CURRENCY_SYMBOL}
                      </span>
                    </div>
                  ))}
                  {lab.serviceCount > 5 && (
                    <p className="text-xs text-text-muted text-center pt-2">
                      + {lab.serviceCount - 5} dịch vụ khác
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <LabPaymentHistorySection labId={lab.id} isOpen={true} />
        )}
      </div>
    </Drawer>
  );
}
