"use client";

import { SOURCE_MAP, TAG_PRESETS } from "@/types/crm";
import { Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { Button } from "@/components/ui/button";
import { TierSwitch } from "@/components/ui/tier-switch";

// ═══════════════════════════════════════════
// CustomerFilters — Gold Standard (No inline search)
// Search is handled by Global Header — matching Printing pattern
// ═══════════════════════════════════════════

export default function CustomerFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateFilters = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const activeSource = searchParams.get("source") || "all";
  const activeTags = searchParams.get("tags") || "all";

  const sourceOptions = useMemo(() => {
    const opts = [{ value: "all", label: "Tất cả nguồn" }];
    Object.entries(SOURCE_MAP).forEach(([key, val]) => {
      opts.push({ value: key, label: val.label });
    });
    return opts;
  }, []);

  const tagOptions = useMemo(() => {
    const opts = [{ value: "all", label: "Tất cả Tags" }];
    TAG_PRESETS.forEach((tag) => {
      opts.push({ value: tag.label, label: tag.label });
    });
    return opts;
  }, []);

  const hasActiveFilters = activeSource !== "all" || activeTags !== "all";

  const clearAllFilters = () => {
    startTransition(() => {
      router.push("?");
    });
  };

  return (
    <TierSwitch
      phone={
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        <SelectPill
          options={sourceOptions}
          value={activeSource}
          onChange={(val) => updateFilters("source", val === "all" ? null : val)}
          placeholder="Nguồn"
          defaultValue="all"
        />
        <SelectPill
          options={tagOptions}
          value={activeTags}
          onChange={(val) => updateFilters("tags", val === "all" ? null : val)}
          placeholder="Tags"
          defaultValue="all"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 shrink-0"
          >
            Xóa
          </Button>
        )}
        </div>
      }
      desktop={
        <div className="flex items-center justify-between gap-3">
        <div /> {/* Empty left — filters right-aligned */}
        <div className="flex items-center gap-2">
          <SelectPill
            options={sourceOptions}
            value={activeSource}
            onChange={(val) => updateFilters("source", val === "all" ? null : val)}
            placeholder="Nguồn"
            defaultValue="all"
          />
          <SelectPill
            options={tagOptions}
            value={activeTags}
            onChange={(val) => updateFilters("tags", val === "all" ? null : val)}
            placeholder="Tags"
            defaultValue="all"
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 px-3 hover:bg-destructive/10 hover:text-destructive gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Xoá lọc</span>
            </Button>
          )}
        </div>
      </div>
      }
    />
  );
}
