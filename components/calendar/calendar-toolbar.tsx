import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { SelectPill } from "@/components/ui/select";

interface CalendarToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  filters: {
    selectedEmployees: string[];
    setSelectedEmployees: (val: string[]) => void;
    selectedStatuses: string[];
    setSelectedStatuses: (val: string[]) => void;
    availableEmployees: { label: string; value: string }[];
    availableStatuses: { label: string; value: string }[];
  };
  onNewEvent: () => void;
}

export function CalendarToolbar({ currentDate, onDateChange, filters, onNewEvent }: CalendarToolbarProps) {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => {
    onDateChange(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          Tháng {month}, {year}
        </h2>
        <div className="flex items-center ml-4 rounded-md border shadow-sm bg-white overflow-hidden">
          <Button variant="ghost" className="h-8 w-8 p-0 rounded-none border-r" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" className="h-8 px-3 rounded-none font-medium" onClick={handleToday}>
            Hôm nay
          </Button>
          <Button variant="ghost" className="h-8 w-8 p-0 rounded-none border-l" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SelectPill 
          value={filters.selectedStatuses[0] || "all"}
          onChange={(val) => filters.setSelectedStatuses(val && val !== "all" ? [val] : [])}
          placeholder="Tất cả Trạng thái"
          options={[
            { label: "Tất cả Trạng thái", value: "all" },
            ...filters.availableStatuses
          ]}
        />
        
        <SelectPill 
          value={filters.selectedEmployees[0] || "all"}
          onChange={(val) => filters.setSelectedEmployees(val && val !== "all" ? [val] : [])}
          placeholder="Tất cả Nhân sự"
          options={[
            { label: "Tất cả Nhân sự", value: "all" },
            ...filters.availableEmployees
          ]}
        />
        
        <Button onClick={onNewEvent} className="ml-2 font-medium">
          Tạo lịch trình
        </Button>
      </div>
    </div>
  );
}
