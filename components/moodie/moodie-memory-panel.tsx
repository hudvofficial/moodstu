"use client";

import { useCallback, useState } from "react";
import { Brain, ChevronDown, ChevronUp, Check, Archive, Trash2, Pencil, Save, X, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { eraseAllMoodieMemories, exportMoodieMemories, listMoodieMemories, updateMoodieMemoryContent, updateMoodieMemoryStatus } from "@/app/actions/moodie-memory-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proposeMoodieMemory } from "@/app/actions/moodie-memory-actions";
import { useRealtimeSignal } from "@/hooks/use-realtime-signal";

type MemoryItem = {
  id: string;
  scope: string;
  memory_type: string;
  content: string;
  confidence: number;
  importance?: number;
  status: string;
  subject?: string | null;
  predicate?: string | null;
  last_used_at?: string | null;
  use_count?: number;
  review_after?: string | null;
  expires_at?: string | null;
  supersedes_memory_id?: string | null;
  archived_reason?: string | null;
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  identity: "Danh tính",
  preference: "Sở thích",
  instruction: "Chỉ dẫn",
  goal: "Mục tiêu",
  project: "Dự án",
  decision: "Quyết định",
  relationship: "Quan hệ",
  episodic: "Sự kiện",
  studio_knowledge: "Kiến thức studio",
  fact: "Thông tin",
  summary: "Tóm tắt",
};

export function MoodieMemoryPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [draft, setDraft] = useState("");
  const [proposing, setProposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listMoodieMemories();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMemories(result.data as MemoryItem[]);
  }, []);

  useRealtimeSignal("moodie_memories", {
    onChange: () => {
      if (open) void load();
    },
  });

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

  async function downloadExport() {
    const result = await exportMoodieMemories();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moodie-memory-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function eraseAll() {
    const confirmation = window.prompt("Nhập chính xác: XÓA TOÀN BỘ MEMORY");
    if (!confirmation) return;
    const result = await eraseAllMoodieMemories(confirmation);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMemories([]);
    toast.success(`Đã xoá vĩnh viễn ${result.data.deletedCount} ghi nhớ cá nhân`);
  }

  async function saveEdit() {
    if (!editingId || !editingContent.trim()) return;
    const result = await updateMoodieMemoryContent(editingId, editingContent);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMemories((items) => items.map((item) => item.id === editingId
      ? { ...item, content: editingContent.trim(), status: "active" }
      : item));
    setEditingId(null);
    setEditingContent("");
    toast.success("Đã cập nhật và xác nhận lại ghi nhớ");
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
    <div data-testid="moodie-memory-panel" className="border-t border-border/60 px-2.5 py-2.5">
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
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-micro text-text-muted">
                <span className="rounded-full bg-white px-1.5 py-0.5 font-medium text-text-secondary">{MEMORY_TYPE_LABELS[memory.memory_type] || memory.memory_type}</span>
                {memory.subject ? <span>{memory.subject}</span> : null}
                {memory.use_count ? <span>· đã dùng {memory.use_count} lần</span> : null}
              </div>
              {editingId === memory.id ? (
                <div className="flex gap-1.5">
                  <Input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} className="h-8 text-xs" />
                  <Button type="button" variant="ghost" size="sm" className="h-8 min-h-0 px-2" onClick={saveEdit} aria-label="Lưu memory"><Save className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 min-h-0 px-2" onClick={() => setEditingId(null)} aria-label="Huỷ sửa"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : <p className="text-xs leading-5 text-text-primary">{memory.content}</p>}
              {memory.supersedes_memory_id ? <p className="mt-1 text-micro text-warning">Ghi nhớ này thay thế một phiên bản cũ.</p> : null}
              {memory.review_after ? <p className="mt-1 text-micro text-text-muted">Xác nhận lại trước {new Date(memory.review_after).toLocaleDateString("vi-VN")}</p> : null}
              <div className="mt-1 flex items-center justify-between gap-2 text-caption text-text-muted">
                <span>{memory.status === "pending" ? "Chờ duyệt" : memory.status === "needs_confirmation" ? "Cần xác nhận lại" : memory.status === "active" ? "Đang dùng" : memory.archived_reason === "expired" ? "Đã hết hạn" : "Đã lưu trữ"}</span>
                <span className="flex gap-1">
                  {memory.status === "pending" || memory.status === "needs_confirmation" ? <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5" onClick={() => setStatus(memory.id, "active")} aria-label="Duyệt memory"><Check className="h-3.5 w-3.5" /></Button> : null}
                  <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5" onClick={() => { setEditingId(memory.id); setEditingContent(memory.content); }} aria-label="Sửa memory"><Pencil className="h-3.5 w-3.5" /></Button>
                  {memory.status === "active" ? <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5" onClick={() => setStatus(memory.id, "archived")} aria-label="Lưu trữ memory"><Archive className="h-3.5 w-3.5" /></Button> : null}
                  <Button type="button" variant="ghost" size="sm" className="h-6 min-h-0 px-1.5 text-danger" onClick={() => setStatus(memory.id, "deleted")} aria-label="Quên ghi nhớ"><Trash2 className="h-3.5 w-3.5" /></Button>
                </span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-end gap-1 border-t border-border/50 pt-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 min-h-0 gap-1 px-2 text-micro" onClick={downloadExport}><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 min-h-0 gap-1 px-2 text-micro text-danger" onClick={eraseAll}><Eraser className="h-3.5 w-3.5" /> Xoá tất cả</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
