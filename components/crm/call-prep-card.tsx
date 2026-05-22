"use client";

import { PhoneCall, Target, AlertTriangle, Briefcase } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { formatCurrency } from "@/lib/utils";
import { SOURCE_MAP } from "@/types/crm";

interface Props {
  lead: CrmLead;
}

export default function CallPrepCard({ lead }: Props) {
  const sourceLabel = lead.source ? (SOURCE_MAP[lead.source]?.label || lead.source) : "Nguồn khác";

  return (
    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 text-primary font-semibold">
        <PhoneCall className="w-5 h-5" />
        <h4 className="text-body font-semibold">Call Prep Summary</h4>
      </div>

      <div className="text-sm space-y-3">
        {/* THU THẬP THÔNG TIN */}
        <div className="space-y-1">
          <p className="font-medium text-text-main flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-text-muted" /> 
            Thông tin cơ bản
          </p>
          <ul className="list-disc pl-5 text-text-secondary">
            <li><strong>Khách hàng:</strong> {lead.contact_name}</li>
            <li><strong>Ngân sách dự kiến:</strong> {lead.deal_value > 0 ? formatCurrency(lead.deal_value) : "Chưa xác định"}</li>
            <li><strong>Kênh liên hệ:</strong> {sourceLabel}</li>
          </ul>
        </div>

        {/* YÊU CẦU */}
        {(lead.needs || lead.notes) && (
          <div className="space-y-1">
            <p className="font-medium text-text-main flex items-center gap-1.5">
              <Target className="w-4 h-4 text-text-muted" />
              Yêu cầu / Ghi chú
            </p>
            <p className="pl-5 text-text-secondary whitespace-pre-wrap">{lead.needs || lead.notes}</p>
          </div>
        )}

        {/* MỤC TIÊU & DỰ ĐOÁN PHẢN ĐỐI */}
        <div className="space-y-1">
          <p className="font-medium text-text-main flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Chiến lược chốt & Xử lý phản đối
          </p>
          <div className="pl-5 text-text-secondary space-y-2 mt-1">
            <p><strong>Mục tiêu:</strong> {lead.deal_value > 0 ? `Chốt gói ~${formatCurrency(lead.deal_value)}` : "Tìm hiểu ngân sách & chốt gói phù hợp"}</p>
            {lead.source === "facebook" || lead.source === "zalo" ? (
              <p><strong>Chiến lược kênh ({sourceLabel}):</strong> Gửi portfolio ngay, mời đến studio trải nghiệm thực tế.</p>
            ) : lead.source === "referral" ? (
              <p><strong>Chiến lược kênh ({sourceLabel}):</strong> Cảm ơn người giới thiệu, đưa ra ưu đãi đặc biệt.</p>
            ) : lead.source === "walk_in" ? (
              <p><strong>Chiến lược kênh ({sourceLabel}):</strong> Khách có quan tâm cao, tư vấn ngay tại studio, cho xem sample thực tế.</p>
            ) : (
              <p><strong>Chiến lược chung:</strong> Phản hồi nhanh chóng, nêu bật điểm khác biệt của Studio.</p>
            )}
            <p><strong>Dự đoán phản đối:</strong> Nếu chê giá cao → Đề xuất chia nhỏ thanh toán; Nếu cần hỏi ý kiến → Xin lịch hẹn mời cả 2 vợ chồng.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
