"use client";

import { usePathname, useRouter } from "next/navigation";
import { TabsFilter } from "@/components/ui/tabs-filter";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Navigation tabs for CRM module
  const tabs = [
    { value: "/crm/leads", label: "DS Sale (Leads)" },
    { value: "/crm/customers", label: "Hồ sơ Khách hàng" }
  ];

  // Active tab based on current route
  const activeTab = pathname.startsWith("/crm/customers") ? "/crm/customers" : "/crm/leads";

  return (
    <div className="flex flex-col h-full bg-bg-main relative">
      {/* Module Header / Tab Navigation */}
      <div className="px-5 pt-4 pb-2 bg-bg-card border-b border-border/40 z-10 sticky top-0">
        <h1 className="text-h2 font-semibold text-text-main mb-3">CRM & Khách hàng</h1>
        <TabsFilter 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={(id) => router.push(id)} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
}
