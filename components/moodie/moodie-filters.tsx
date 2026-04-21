"use client";

import { SearchBar } from "@/components/ui/search-bar";
import { TabsFilter } from "@/components/ui/tabs-filter";
import type { MoodieConversationScope } from "@/types/moodie";

interface MoodieFiltersProps {
  scope: MoodieConversationScope;
  search: string;
  counts: {
    all: number;
    active: number;
    locked: number;
  };
  variant?: "panel" | "embedded";
  onScopeChange: (value: MoodieConversationScope) => void;
  onSearchChange: (value: string) => void;
}

export function MoodieFilters({
  scope,
  search,
  counts,
  variant = "panel",
  onScopeChange,
  onSearchChange,
}: MoodieFiltersProps) {
  const searchPlaceholder = variant === "embedded"
    ? "T\u00ecm h\u1ed9i tho\u1ea1i..."
    : "T\u00ecm theo ti\u00eau \u0111\u1ec1 ho\u1eb7c n\u1ed9i dung g\u1ea7n nh\u1ea5t...";

  const tabs = [
    { label: "T\u1ea5t c\u1ea3", value: "all", count: counts.all },
    { label: "Ho\u1ea1t \u0111\u1ed9ng", value: "active", count: counts.active },
    { label: "\u0110ang x\u1eed l\u00fd", value: "locked", count: counts.locked },
  ];

  const content = variant === "embedded" ? (
    <div className="space-y-3">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <div className="overflow-x-auto scrollbar-hide lg:overflow-visible">
        <TabsFilter
          tabs={tabs}
          activeTab={scope}
          variant="pills"
          size="compact"
          className="w-max lg:flex lg:w-full lg:flex-wrap"
          onChange={(value) => onScopeChange(value as MoodieConversationScope)}
        />
      </div>
    </div>
  ) : (
    <>
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <TabsFilter
          tabs={tabs}
          activeTab={scope}
          onChange={(value) => onScopeChange(value as MoodieConversationScope)}
        />
        <div className="w-full max-w-sm">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsFilter
            tabs={tabs}
            activeTab={scope}
            onChange={(value) => onScopeChange(value as MoodieConversationScope)}
          />
        </div>
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </div>
    </>
  );

  if (variant === "embedded") return content;

  return (
    <section className="card-base px-4 py-3 entrance entrance-1">
      {content}
    </section>
  );
}
