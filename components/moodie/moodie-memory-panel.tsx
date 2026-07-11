"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Check, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMoodieMemories, updateMoodieMemoryStatus } from "@/app/actions/moodie-memory-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proposeMoodieMemory } from "@/app/actions/moodie-memory-actions";

type MemoryItem = {
  id: string;
  scope: string;
  memory_type: string;
  content: string;
  confidence: number;
  status: string;
};

export function MoodieMemoryPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [draft, setDraft] = useState("");
  const [proposing, setProposing] = useState(false);

  async function load() {
    setLoading(true);
    const result = await listMoodieMemories();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMemories(result.data as MemoryItem[]);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || memories.length > 0) return;
    await load();
  }

  async function setStatus(id: string, status: "active" | "archived" | "deleted") {
    const result = await updateMoodieMemoryStatus(id, status);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMemories((items) => status === "deleted" ? items.filter((item) => item.id !== id) : items.map((item) => item.id === id ? { ...item, status } : item));
    toast.success(status === "active" ? "Moodie đã ghi nhớ" : status === "archived" ? "Đã lưu trữ ghi nhớ" : "Moodie đã quên ghi nhớ này");
  }

  async function propose() {
    const content = draft.trim();
    if (!content) return;
    setProposing(true);
    const result = await proposeMoodieMemory({
      scope: "user",
      memoryType: "preference",
      content,
      confidence: 1,
    });
    setProposing(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setDraft("");
    await load();
    toast.success("Đã tạo memory chờ duyệt");
  }

  return (
    <div className="border-t border-border/60 px-2.5 py-2.5">
      <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-between gap-2 px-2 text-xs text-text-secondary" onClick={toggle}>
        <span className="flex items-center gap-2"><Brain className="h-3.5 w-3.5" /> Ghi nhớ</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p className="px-1 text-caption leading-4 text-text-muted">Chỉ ghi nhớ bạn đã duyệt mới được Moodie sử dụng.</p>
          <div className="flex gap-2">
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ví dụ: Ưu tiên trả lời ngắn" className="h-8 text-xs" />
            <Button type="button" size="sm" className="h-8 min-h-0 shrink-0 text-xs" loading={proposing} onClick={propose}>Thêm</Button>
          </div>
          {loading ? <p className="px-1 text-caption text-text-muted">Đang tải...</p> : null}
          {!loading && memories.length === 0 ? <p className="px-1 text-caption text-text-muted">Chưa có memory.</p> : null}
          {memories.map((memory) => (
            <div key={memory.id} className="rounded-xl border border-border/70 bg-bg-subtle px-2.5 py-2">
              <p className="text-xs leading-5 text-text-primary">{memory.content}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-caption text-text-muted">
                <span>{memory.status === "pending" ? "Chờ duyệt" : memory.status === "active" ? "Đang dùng" : "Đã lưu trữ"}</span>
                <span className="flex gap-1">
                  {memory.status === "pending" ? <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5" onClick={() => setStatus(memory.id, "active")} aria-label="Duyệt memory"><Check className="h-3.5 w-3.5" /></Button> : null}
                  {memory.status === "active" ? <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5" onClick={() => setStatus(memory.id, "archived")} aria-label="Lưu trữ memory"><Archive className="h-3.5 w-3.5" /></Button> : null}
                  <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5 text-danger" onClick={() => setStatus(memory.id, "deleted")} aria-label="Quên ghi nhớ"><Trash2 className="h-3.5 w-3.5" /></Button>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
