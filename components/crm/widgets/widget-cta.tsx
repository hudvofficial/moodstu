import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WidgetCTA() {
  return (
    <div className="card-base bg-linear-to-br from-primary to-primary-dark text-white border-none p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Decorative gradient / sparkles */}
      <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 -translate-y-1/4 translate-x-1/4 group-hover:scale-110 transition-transform duration-500">
        <Sparkles className="w-24 h-24 text-white" />
      </div>
      
      <div className="relative z-10 flex flex-col gap-4">
        <div>
          <h4 className="text-h4 text-white mb-1">Cần hỗ trợ chốt Sales?</h4>
          <p className="text-caption text-white/80 leading-relaxed">
            Xem ngay 5 kịch bản chốt deal phân nhánh từ dữ liệu thực tế để tăng 15% tỷ lệ chốt tháng này.
          </p>
        </div>
        <Link href="/crm/leads" className="w-fit">
          <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md px-4 py-2 h-9 text-sm font-medium flex items-center transition-colors">
            Xem kịch bản <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
