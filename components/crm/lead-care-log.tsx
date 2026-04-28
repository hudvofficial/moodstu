"use client";

import { useState, useTransition } from "react";
import { Clock, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select";
import { addCareLog } from "@/app/actions/lead-lifecycle";
import type { CareLogEntry } from "@/types/crm";
import { useSWRConfig } from "swr";
import { cacheKeys } from "@/lib/swr";
import { Badge } from "@/components/ui/badge";

const extractTag = (text: string) => {
  const match = text.match(/^\[(.*?)\]\s*(.*)/);
  if (match) {
    // If there's another tag right after like [Date] [Tag], we can recursively or just take the first one
    return { tag: match[1], rest: match[2] };
  }
  return { tag: null, rest: text };
};

type ParsedCareHistoryEntry = {
  key: string;
  tag: string | null;
  rest: string;
};

function parseCareHistory(history: string | CareLogEntry[] | null): ParsedCareHistoryEntry[] {
  if (Array.isArray(history)) {
    return history.map((entry, index) => ({
      key: entry.id || `${entry.date}-${index}`,
      tag: entry.type || null,
      rest: entry.content,
    }));
  }

  if (typeof history !== "string" || !history.trim()) return [];

  const rawEntries = history.includes("\n---\n")
    ? history.split(/\n---\n/g)
    : history.split("\n");

  return rawEntries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      if (entry.startsWith("{")) {
        try {
          const parsed = JSON.parse(entry) as {
            type?: string;
            content?: string;
            timestamp?: string;
          };
          return {
            key: parsed.timestamp || `${index}`,
            tag: parsed.type || null,
            rest: parsed.content || entry,
          };
        } catch {
          // Fall through to legacy text parsing.
        }
      }

      const [firstLine, ...remainingLines] = entry.split("\n");
      const { tag, rest } = extractTag(firstLine);
      const body = [rest, ...remainingLines].filter(Boolean).join("\n");

      return {
        key: `${index}-${firstLine}`,
        tag,
        rest: body || entry,
      };
    });
}

// ════════════════════════════════════════════════════════════
// LeadCareLog — Display care history & add new logs (Phase 03)
// ════════════════════════════════════════════════════════════

interface Props {
  leadId: string;
  history: string | CareLogEntry[] | null; 
}

const CARE_TYPES = [
  { label: "Ghi chú", value: "note" },
  { label: "Gọi điện", value: "call" },
  { label: "Gặp mặt", value: "meeting" },
  { label: "Email", value: "email" },
];

export default function LeadCareLog({ leadId, history }: Props) {
  const { mutate: globalMutate } = useSWRConfig();
  const [content, setContent] = useState("");
  const [type, setType] = useState("call");
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddLog = async () => {
    if (!content.trim()) return;
    
    startTransition(async () => {
      try {
        const result = await addCareLog(leadId, content, type);
        if (!result || ("success" in result && !result.success)) {
          throw new Error(result?.error || "Đã xảy ra lỗi");
        }
        setContent("");
        setIsFocused(false);
        // Tối ưu Frontend SWR thay vì router.refresh toàn trang
        globalMutate(cacheKeys.leadDetail(leadId));
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message || "Lỗi khi thêm log");
      }
    });
  };

  const historyEntries = parseCareHistory(history);

  const showExpanded = isFocused || content.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center gap-1.5 label-base">
        <Clock className="w-4 h-4 text-primary" />
        Nhật ký chăm sóc
      </div>

      {/* ── Add New Log (Stripe-Like Editor Mode) ── */}
      <div 
        className="relative flex flex-col bg-bg-base border border-border/50 rounded-xl shadow-xs overflow-hidden transition-all duration-200"
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
      >
        <Textarea
          placeholder="Nhập nội dung tương tác..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={showExpanded ? 3 : 1}
          className={`w-full border-0 focus-visible:ring-0 focus:ring-0 bg-transparent resize-none p-3 text-sm transition-all duration-200 ${
            !showExpanded ? "pr-12" : ""
          }`}
        />
        
        {/* Inline Send Button when collapsed */}
        {!showExpanded && (
          <div className="absolute right-1 top-1 animate-fade-in">
            <Button 
              onClick={handleAddLog} 
              onMouseDown={(e) => e.preventDefault()}
              disabled={!content.trim() || isPending}
              variant="ghost" 
              size="sm"
              className="h-10 text-primary hover:bg-primary/10 px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Expanded Toolbar Footer */}
        {showExpanded && (
          <div className="flex justify-between items-center px-3 pb-3 pt-1 animate-fade-in bg-bg-base">
            <div className="w-36">
              <SelectForm
                options={CARE_TYPES}
                value={type}
                onChange={(val) => setType(val || "call")}
              />
            </div>
            <Button 
              onClick={handleAddLog} 
              disabled={!content.trim() || isPending}
              variant="primary" 
              size="sm"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Lưu nhật ký
            </Button>
          </div>
        )}
      </div>

      {/* ── History Timeline ── */}
      <div className="px-1">
        {historyEntries.length > 0 ? (
          <div className="space-y-3">
            {historyEntries.map((entry, idx) => {
              return (
              <div key={entry.key} className="flex gap-3 text-sm">
                <div className="relative flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {idx !== historyEntries.length - 1 && (
                    <div className="w-px h-full bg-border/50 absolute top-3.5" />
                  )}
                </div>
                <div className="flex-1 bg-bg-base p-3 rounded-xl shadow-xs border border-border/30 mb-2">
                  {entry.tag && (
                    <Badge variant="neutral" className="mb-2 text-xs tracking-wider bg-bg-hover">
                      {entry.tag}
                    </Badge>
                  )}
                  <div className="whitespace-pre-wrap text-text-secondary">{entry.rest}</div>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-6 text-text-muted text-sm flex flex-col items-center gap-2 bg-bg-base rounded-xl border border-border/30 shadow-xs">
            <AlertCircle className="w-5 h-5 opacity-50" />
            Chưa có lịch sử
          </div>
        )}
      </div>
    </div>
  );
}
