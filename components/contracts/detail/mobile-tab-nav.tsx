"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { CONTRACT_DETAIL_TABS } from "./top-action-bar";

// ═══════════════════════════════════════════
// MobileTabNav — Section tabs for mobile
// Phase 04f → Merge: tabs merge into header on scroll
// Props-driven: state hoisted to parent (contract-detail-client)
// Only visible on mobile (lg:hidden)
// ═══════════════════════════════════════════

interface Props {
  headerVisible: boolean;
  tabsMerged: boolean;
  activeTab: string;
  onTabClick: (tab: { key: string; sectionId: string }) => void;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

export default function MobileTabNav({
  tabsMerged,
  activeTab,
  onTabClick,
  setActiveTab,
}: Props) {
  // Auto-highlight based on scroll position (IntersectionObserver)
  useEffect(() => {
    const scrollEl = document.getElementById("main-scroll");
    if (!scrollEl) return;

    const sectionIds = CONTRACT_DETAIL_TABS.map((t) => t.sectionId);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const tab = CONTRACT_DETAIL_TABS.find(
              (t) => t.sectionId === entry.target.id
            );
            if (tab) setActiveTab(tab.key);
          }
        }
      },
      {
        root: scrollEl,
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0.1,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [setActiveTab]);

  return (
    <div
      className={`lg:hidden py-3
        transition-all duration-200 ease-out
        ${tabsMerged
          ? "opacity-0 pointer-events-none h-0 overflow-hidden py-0"
          : "opacity-100"
        }`}
    >
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CONTRACT_DETAIL_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabClick(tab)}
              className={`tab-pill ${isActive ? "tab-pill-active" : "tab-pill-inactive"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
