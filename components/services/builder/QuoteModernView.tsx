"use client";

import React from "react";
import { Paintbrush, X, Image as LucideImage, ImageIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalculationResult } from "@/lib/logic/bundle-calculator";
import Image from "next/image";

interface QuoteItem {
  service_name: string;
  selling_price: number;
  quantity: number;
  unit?: string;
  image_url?: string;
}

interface ParentServiceInfo {
  service_name?: string;
  image_url?: string;
}

interface QuoteModernViewProps {
  items: QuoteItem[];
  calculation: CalculationResult;
  onClose: () => void;
  parentService?: ParentServiceInfo;
}

export default function QuoteModernView({
  items,
  calculation,
  onClose,
  parentService,
}: QuoteModernViewProps) {
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-background/60 animate-fadeIn p-0 md:p-6">
        {/* eslint-disable-next-line no-restricted-syntax -- Artistic print preview: intentional rounded corner */}
        <div className="bg-elevated w-full max-w-lg h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20">
        {/* Header / Branding */}
        <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center bg-linear-to-b from-elevated/90 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Paintbrush size={20} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-text-main uppercase italic">
              Moodstudio
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-elevated/80 shadow-lg flex items-center justify-center text-text-secondary hover:text-text-main transition-all p-0 border-0"
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
          {/* Hero Section */}
          <div className="relative h-64 bg-surface flex items-center justify-center overflow-hidden">
            {parentService?.image_url ? (
              <Image
                src={parentService.image_url}
                alt="Cover"
                fill
                className="object-cover"
                unoptimized={
                  parentService.image_url.startsWith("data:") ||
                  parentService.image_url.startsWith("blob:")
                }
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center text-primary/40">
                <LucideImage size={48} className="mb-2" />
                <span className="text-caption uppercase font-black">
                  Official Quotation
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="text-caption font-black text-primary bg-elevated px-2 py-1 rounded-md uppercase tracking-widest mb-2 inline-block">
                Báo giá dịch vụ
              </span>
              <h1 className="text-2xl font-black text-white leading-none">
                {parentService?.service_name || "Gói Dịch Vụ Moodstudio"}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Summary Box */}
            <div className="bg-surface p-4 rounded-soft-2xl border border-border flex justify-between items-center -mt-12 relative z-20 shadow-xl shadow-primary/5">
              <div>
                <p className="text-caption text-text-muted font-bold uppercase tracking-wider">
                  Tổng giá trị gói
                </p>
                <p className="text-2xl font-black text-primary tracking-tighter">
                  {calculation.finalTotal.toLocaleString()} VNĐ
                </p>
              </div>
              <div className="text-right">
                <p className="text-caption text-text-muted font-bold uppercase">
                  Ngày lập
                </p>
                <p className="text-caption font-bold text-text-main">
                  {new Date().toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-[2px] bg-primary/30" />
                Chi tiết các hạng mục
              </h3>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-2 rounded-soft-lg hover:bg-surface transition-colors"
                  >
                    <div className="relative w-14 h-14 bg-surface rounded-soft-md overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.service_name}
                          fill
                          className="object-cover"
                          unoptimized={
                            item.image_url.startsWith("data:") ||
                            item.image_url.startsWith("blob:")
                          }
                        />
                      ) : (
                        <ImageIcon size={20} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-text-main leading-tight">
                          {item.service_name}
                        </h4>
                        <span className="text-caption font-black text-text-main">
                          {(
                            item.selling_price * item.quantity
                          ).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-caption text-text-muted mt-0.5">
                        SL: {item.quantity} x{" "}
                        {item.selling_price.toLocaleString()}{" "}
                        {item.unit || "món"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note & Branding */}
            <div className="p-6 bg-primary/5 rounded-4xl border border-primary/10">
              <h4 className="text-caption font-black text-primary uppercase mb-2">
                Cam kết chất lượng
              </h4>
              <p className="text-caption text-text-secondary italic leading-relaxed">
                &ldquo;Từng khoảnh khắc tại Moodstudio đều được chăm chút tỉ mỉ
                từ khâu ý tưởng đến thành phẩm cuối cùng. Chúng tôi cam kết mang
                lại trải nghiệm chuyên nghiệp và xứng tầm với kỳ vọng của
                bạn.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-border bg-elevated shadow-2xl relative z-10">
          <div className="flex gap-3">
            <Button
              variant="primary"
              className="flex-1 py-4 bg-background text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 h-auto"
              onClick={() => window.print()}
            >
              <Send size={20} />
              Liên hệ tư vấn
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
            {/* eslint-disable-next-line no-restricted-syntax -- Artistic print preview: intentional micro branding text */}
            <span className="text-[8px] font-black tracking-[0.2em] uppercase">
              Built with heart by Moodstudio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
