"use client";

/**
 * 🏷️ MissingInfoBadge — Checklist completeness indicator
 *
 * Port from V1 MissingInfoBadge.tsx → V2 (Lucide icons, earth-tone)
 *
 * States:
 * - Empty checklist → "—" (pending)
 * - All complete → "Đầy đủ" (green)
 * - Missing items → "Thiếu tin" + count (red) + hover tooltip
 */

import { useRef, useState, useEffect } from "react";
import { CheckCircle, Clock, ChevronDown } from "lucide-react";
import { getCategoryColor } from "@/constants/service-colors";

interface ContractChecklist {
  id: string;
  contract_id: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── STAGE SORT ORDER ───────────────────────────────────

const STAGE_ORDER = ["chụp", "ảnh", "phóng", "ăn hỏi", "hỏi", "lễ", "cưới"];

function sortStages(stages: string[]) {
  return [...stages].sort((a, b) => {
    const ia = STAGE_ORDER.findIndex((s) => a.toLowerCase().includes(s));
    const ib = STAGE_ORDER.findIndex((s) => b.toLowerCase().includes(s));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// ─── COMPONENT ──────────────────────────────────────────

export default function MissingInfoBadge({ items = [] }: { items: ContractChecklist[] }) {
  // Auto-flip tooltip (hooks must be before any early return)
  const badgeRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  useEffect(() => {
    const el = badgeRef.current;
    if (!el) return;
    const handleMouseEnter = () => {
      const rect = el.getBoundingClientRect();
      setFlipUp(rect.bottom + 320 > window.innerHeight);
    };
    el.addEventListener("mouseenter", handleMouseEnter);
    return () => el.removeEventListener("mouseenter", handleMouseEnter);
  }, []);

  if (items.length === 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tighter bg-bg-hover text-text-muted">
        <Clock className="w-3 h-3 mr-1" />—
      </div>
    );
  }

  const missing = items.filter((i) => !i.is_completed);
  if (missing.length === 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tighter bg-success/10 text-success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Đầy đủ
      </div>
    );
  }

  // Group by stage → category
  const grouped = missing.reduce(
    (acc, item) => {
      const stage = item.event_stage || "NGÀY CHỤP";
      if (!acc[stage]) acc[stage] = {} as Record<string, ContractChecklist[]>;
      if (!acc[stage][item.category]) acc[stage][item.category] = [];
      acc[stage][item.category].push(item);
      return acc;
    },
    {} as Record<string, Record<string, ContractChecklist[]>>,
  );

  return (
    <div ref={badgeRef} className="relative group/tooltip inline-block">
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-tiny font-bold uppercase tracking-tight bg-error/10 text-error cursor-help transition-all">
        <span>Thiếu tin</span>
        <span className="bg-error/20 text-error rounded px-1 py-0.5 text-tiny font-bold">
          {missing.length}
        </span>
        <ChevronDown className="w-3 h-3 opacity-40" />
      </div>

      {/* Hover Tooltip — auto-flip */}
      <div className={`absolute left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto bg-bg-card rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 p-3 text-left ${
        flipUp ? "bottom-full mb-2" : "top-full mt-2"
      }`}>
        {sortStages(Object.keys(grouped)).map((stage, si) => (
          <div key={stage} className={si > 0 ? "pt-3 mt-3" : ""}>
            <div className="text-tiny font-black uppercase tracking-widest text-primary/60 mb-2 flex items-center gap-2">
              <span>{stage}</span>
              <span className="h-px flex-1 bg-primary/10" />
            </div>
            {Object.entries(grouped[stage]).map(([cat, catItems]) => {
              const style = getCategoryColor(cat);
              return (
                <div key={`${stage}-${cat}`} className="mb-2">
                  <span className={`text-tiny font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} capitalize`}>
                    {cat}
                  </span>
                  <ul className="mt-1 ml-3 space-y-1">
                    {catItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs text-text-secondary leading-tight">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-border shrink-0" />
                        <span>{item.item_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
        <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-bg-card rotate-45 shadow-tooltip-arrow ${
          flipUp ? "-bottom-1.5" : "-top-1.5"
        }`} />
      </div>
    </div>
  );
}
