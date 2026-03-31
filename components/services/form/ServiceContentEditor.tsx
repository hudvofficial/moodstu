"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Plus, Trash2, X, FolderOpen } from "lucide-react";
import type { ContentSection } from "@/types/service";
import { parseContentStructure, sectionsToJson } from "@/lib/utils/service-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ═══════════════════════════════════════════
// ServiceContentEditor — Structured Description
// Port of V1 ServiceContentEditor.tsx (224 lines)
//
// JSON-based section editor: title + items list
// @see Phase 1c / Task 5
// ═══════════════════════════════════════════

interface Props {
  value: string;
  onChange: (value: string) => void;
}

interface EditableSection extends ContentSection {
  _id: string; // Client-side key for React rendering
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function initSections(value: string): EditableSection[] {
  const parsed = parseContentStructure(value);
  return parsed.map((s) => ({ ...s, _id: generateId() }));
}

function ServiceContentEditorInner({ value, onChange }: Props) {
  // Init from value once — no setState in effect
  const [sections, setSections] = useState<EditableSection[]>(() => initSections(value));
  const isUserEditing = useRef(false);

  // ── Sync sections → parent (only when user edits) ──
  useEffect(() => {
    if (!isUserEditing.current) return;
    isUserEditing.current = false;

    const json = sectionsToJson(sections);
    if (json !== value) {
      onChange(json);
    }
  }, [sections, onChange, value]);

  // ── Wrapper to mark user edits ──
  const update = useCallback((updater: (prev: EditableSection[]) => EditableSection[]) => {
    isUserEditing.current = true;
    setSections(updater);
  }, []);

  // ── Section actions ──
  const addSection = useCallback(() => {
    update((prev) => [
      ...prev,
      { _id: generateId(), title: "", items: [""] },
    ]);
  }, [update]);

  const removeSection = useCallback((index: number) => {
    update((prev) => prev.filter((_, i) => i !== index));
  }, [update]);

  const updateTitle = useCallback((index: number, title: string) => {
    update((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title };
      return next;
    });
  }, [update]);

  // ── Item actions ──
  const addItem = useCallback((sectionIndex: number) => {
    update((prev) => {
      const next = [...prev];
      next[sectionIndex] = {
        ...next[sectionIndex],
        items: [...next[sectionIndex].items, ""],
      };
      return next;
    });
  }, [update]);

  const removeItem = useCallback((sectionIndex: number, itemIndex: number) => {
    update((prev) => {
      const next = [...prev];
      next[sectionIndex] = {
        ...next[sectionIndex],
        items: next[sectionIndex].items.filter((_, i) => i !== itemIndex),
      };
      return next;
    });
  }, [update]);

  const updateItem = useCallback(
    (sectionIndex: number, itemIndex: number, text: string) => {
      update((prev) => {
        const next = [...prev];
        const items = [...next[sectionIndex].items];
        items[itemIndex] = text;
        next[sectionIndex] = { ...next[sectionIndex], items };
        return next;
      });
    },
    [update],
  );

  return (
    <div className="card-base p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-label text-primary flex items-center gap-2">
          📝 Nội dung mô tả
        </h3>
        <span className="text-caption text-text-muted bg-bg-hover px-2 py-0.5 rounded-md">
          Trình soạn cấu trúc
        </span>
      </div>

      {/* Sections List */}
      {sections.map((section, sIdx) => (
        <div
          key={section._id}
          className="bg-bg-hover rounded-lg p-4 shadow-xs group hover:shadow-sm transition-all"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <Input
              type="text"
              placeholder="Tiêu đề mục (VD: Ngày chụp)"
              value={section.title}
              onChange={(e) => updateTitle(sIdx, e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold border-b border-transparent focus:border-primary px-1 py-1 h-auto"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSection(sIdx)}
              className="text-text-muted hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Xóa mục"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Items */}
          <div className="space-y-2 pl-11">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
                <Input
                  type="text"
                  placeholder="Nội dung dòng..."
                  value={item}
                  onChange={(e) => updateItem(sIdx, iIdx, e.target.value)}
                  className="flex-1 input-base text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(sIdx, iIdx)}
                  className="text-text-muted hover:text-error p-1 transition-colors"
                  title="Xóa dòng"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addItem(sIdx)}
              className="flex items-center gap-1 text-caption font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 px-2 py-1 rounded-md transition-colors w-fit"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng
            </Button>
          </div>
        </div>
      ))}

      {/* Add Section Button */}
      <Button
        type="button"
        variant="ghost"
        onClick={addSection}
        className="w-full py-3 bg-surface/50 rounded-lg text-text-muted font-semibold text-body-sm hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 h-auto shadow-inner"
      >
        <Plus className="w-4 h-4" />
        Thêm Mục Mới
      </Button>

      {/* Empty state placeholder */}
      {sections.length === 0 && (
        <p className="text-center text-caption text-text-muted py-4">
          Thêm nội dung mô tả chi tiết cho dịch vụ
        </p>
      )}
    </div>
  );
}

export default memo(ServiceContentEditorInner);
