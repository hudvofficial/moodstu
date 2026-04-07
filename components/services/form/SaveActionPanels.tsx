"use client";

import { useState } from "react";
import { Loader2, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuotePreview from "../quote/quote-preview";

interface ActionPanelProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: () => void;
  
  serviceName: string;
  sellingPrice: number;
  description: string;
  unit: string;
}

/**
 * Desktop (Right Sidebar) Panel
 * Displayed via FullpageFormShell's rightPanel (lg:flex)
 */
export function DesktopSidebarPanel(props: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-text-secondary pl-1">
          Bản xem trước báo giá
        </h3>
        <QuotePreview
          serviceName={props.serviceName || ""}
          sellingPrice={props.sellingPrice || 0}
          description={props.description || ""}
          unit={props.unit || ""}
        />
      </div>

      <div className="card-base p-5 flex flex-col gap-3">
        <Button
          type="button"
          variant="interactive"
          onClick={props.onSubmit}
          disabled={props.isSubmitting}
          className="w-full flex justify-center gap-2 font-bold"
        >
          {props.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {props.isEditMode ? "Lưu thay đổi" : "Tạo dịch vụ mới"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={props.onCancel}
          disabled={props.isSubmitting}
          className="w-full text-text-secondary"
        >
          Quay về
        </Button>

        {props.isEditMode && props.onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác.")) {
                props.onDelete!();
              }
            }}
            disabled={props.isSubmitting}
            className="w-full mt-2 text-error hover:bg-error/10 hover:text-error h-8"
          >
            Xóa vĩnh viễn dịch vụ
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile Sticky Panel
 * Fixed at the bottom of the viewport, handles iOS safe-areas and collapsible QuotePreview
 */
export function MobileStickyPanel(props: ActionPanelProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card shadow-lg rounded-t-2xl flex flex-col">
      
      <div className="relative">
        {/* Toggle Button for Preview */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-bg-card rounded-t-xl rounded-b-none shadow-sm flex items-center gap-2 text-caption font-semibold text-text-secondary h-10 px-4"
        >
          Báo giá
          <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${showPreview ? "rotate-180" : ""}`} />
        </Button>

        {/* Collapsible Quote Preview */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-bg-body ${
            showPreview ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 pt-6">
            <QuotePreview
              serviceName={props.serviceName || ""}
              sellingPrice={props.sellingPrice || 0}
              description={props.description || ""}
              unit={props.unit || ""}
            />
          </div>
        </div>
      </div>

      {/* Main Actions Bar */}
      <div className="px-4 py-3 flex flex-col gap-3 bg-bg-card pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-row items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={props.onCancel}
            disabled={props.isSubmitting}
            className="shrink-0 px-4 text-text-secondary"
          >
            Huỷ
          </Button>
          
          <Button
            type="button"
            variant="interactive"
            onClick={props.onSubmit}
            disabled={props.isSubmitting}
            className="flex-1 flex justify-center gap-2 font-semibold"
          >
            {props.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {props.isEditMode ? "Lưu" : "Tạo mới"}
          </Button>
        </div>

        {props.isEditMode && props.onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác.")) {
                props.onDelete!();
              }
            }}
            disabled={props.isSubmitting}
            className="w-full text-error hover:bg-error/10 hover:text-error h-8 text-sm"
          >
            Xóa dịch vụ
          </Button>
        )}
      </div>
    </div>
  );
}
