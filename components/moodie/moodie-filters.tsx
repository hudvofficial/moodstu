"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { TierSwitch } from "@/components/ui/tier-switch";
import type { MoodieConversationScope } from "@/types/moodie";

interface MoodieFiltersProps {
  scope: MoodieConversationScope;
  search: string;
  counts: { all: number; active: number; locked: number };
  variant?: "panel" | "embedded";
  onScopeChange: (value: MoodieConversationScope) => void;
  onSearchChange: (value: string) => void;
}

export function MoodieFilters({ scope, search, counts, variant = "panel", onScopeChange, onSearchChange }: MoodieFiltersProps) {
  const tabs = variant === "embedded"
    ? [
        { label: "Tất cả", value: "all", count: counts.all },
        { label: "Mở", value: "active", count: counts.active },
        { label: "Đang chạy", value: "locked", count: counts.locked },
      ]
    : [
        { label: "Tất cả", value: "all", count: counts.all },
        { label: "Hoạt động", value: "active", count: counts.active },
        { label: "Đang xử lý", value: "locked", count: counts.locked },
      ];

  if (variant === "embedded") {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm trong lịch sử" unstyled className="h-9 w-full rounded-xl border border-transparent bg-bg-subtle pl-9 pr-9 text-sm text-text-primary outline-none transition placeholder:text-text-muted hover:border-border focus:border-primary/25 focus:bg-white" />
          {search ? <Button type="button" variant="ghost" size="sm" className="absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md px-0 text-text-muted" onClick={() => onSearchChange("")} aria-label="Xóa tìm kiếm"><X className="h-3.5 w-3.5" /></Button> : null}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg-subtle p-1">
          {tabs.map((tab) => <Button key={tab.value} type="button" unstyled className={`h-7 rounded-lg px-1 text-micro font-medium transition ${scope === tab.value ? "bg-white text-text-primary shadow-xs" : "text-text-muted hover:text-text-primary"}`} onClick={() => onScopeChange(tab.value as MoodieConversationScope)}>{tab.label}<span className="ml-1 opacity-60">{tab.count}</span></Button>)}
        </div>
      </div>
    );
  }

  const content = (
    <TierSwitch
      phone={<div className="space-y-3"><div className="overflow-x-auto scrollbar-hide"><TabsFilter tabs={tabs} activeTab={scope} onChange={(value) => onScopeChange(value as MoodieConversationScope)} /></div><SearchBar value={search} onChange={onSearchChange} placeholder="Tìm theo tiêu đề hoặc nội dung gần nhất..." /></div>}
      desktop={<div className="flex items-center justify-between gap-4"><TabsFilter tabs={tabs} activeTab={scope} onChange={(value) => onScopeChange(value as MoodieConversationScope)} /><div className="w-full max-w-sm"><SearchBar value={search} onChange={onSearchChange} placeholder="Tìm theo tiêu đề hoặc nội dung gần nhất..." /></div></div>}
    />
  );

  return <section className="card-base px-4 py-3 entrance entrance-1">{content}</section>;
}
