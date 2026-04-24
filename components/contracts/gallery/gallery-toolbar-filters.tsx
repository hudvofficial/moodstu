import { TabsFilter } from "@/components/ui/tabs-filter";

// ═══════════════════════════════════════════
// Gallery Filters — Extracted from gallery-toolbar
// Mobile pill tabs + Desktop inline filter group
// ═══════════════════════════════════════════

export function GalleryFilterTabs({
  tabs,
  activeTab,
  onChange,
  trailing,
}: {
  tabs: Array<{ label: string; value: string; count?: number }>;
  activeTab: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide lg:hidden">
        <TabsFilter tabs={tabs} activeTab={activeTab} onChange={onChange} variant="pills" size="compact" />
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      <div className="hidden lg:flex lg:items-center lg:gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <TabsFilter tabs={tabs} activeTab={activeTab} onChange={onChange} className="min-w-max" />
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </>
  );
}

export function GalleryDesktopFilterGroup({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ label: string; value: string; count?: number }>;
  activeTab: string;
  onChange: (value: string) => void;
}) {
  return (
    <TabsFilter
      tabs={tabs}
      activeTab={activeTab}
      onChange={onChange}
      className="min-w-max rounded-none bg-transparent p-0 shadow-none"
    />
  );
}

export function DesktopFilterDivider() {
  return <div className="h-6 w-px shrink-0 bg-border/70" />;
}
