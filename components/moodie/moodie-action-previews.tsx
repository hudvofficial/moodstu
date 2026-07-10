"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Compass, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveAndExecuteMoodieAction, requestMoodieActionApproval } from "@/app/actions/moodie-action-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-utils";
import type { MoodieActionPreview } from "@/types/moodie";

export function MoodieActionPreviews({ actions }: { actions: MoodieActionPreview[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvalIds, setApprovalIds] = useState<Record<string, string>>({});
  if (actions.length === 0) return null;

  function handleAction(action: MoodieActionPreview) {
    if (action.kind === "navigate") {
      if (action.href) router.push(action.href);
      return;
    }
    if (!action.target_id) return;
    const actionKind = action.kind;
    startTransition(async () => {
      try {
        const approvalId = approvalIds[action.id];
        if (!approvalId) {
          const requested = await requestMoodieActionApproval({
            kind: actionKind,
            label: action.label,
            targetId: action.target_id!,
            conversationId: action.conversation_id,
          });
          if (!requested.success) throw new Error(requested.error || "Không thể tạo yêu cầu xác nhận.");
          if (!requested.data) throw new Error("Không thể tạo yêu cầu xác nhận.");
          setApprovalIds((current) => ({ ...current, [action.id]: requested.data.id }));
          toast("Đã tạo preview. Bấm Xác nhận để thực thi.", "info");
          return;
        }
        const executed = await approveAndExecuteMoodieAction(approvalId);
        if (!executed.success) throw new Error(executed.error || "Thao tác thất bại.");
        toast("Moodie đã thực thi thao tác.", "success");
        setApprovalIds((current) => {
          const next = { ...current };
          delete next[action.id];
          return next;
        });
      } catch (error) {
        toast(error instanceof Error ? error.message : "Không thể thực thi thao tác.", "error");
      }
    });
  }

  return (
    <div className="space-y-2 pl-1">
      {actions.map((action) => (
        <div key={action.id} className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{action.label}</p>
            <p className="truncate text-caption text-text-muted">{action.description}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 min-h-0 gap-1 px-2" disabled={isPending} onClick={() => handleAction(action)}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.kind === "navigate" ? <ArrowRight className="h-3.5 w-3.5" /> : approvalIds[action.id] ? <Check className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {action.kind === "navigate" ? "Mở" : approvalIds[action.id] ? "Xác nhận" : "Duyệt"}
          </Button>
        </div>
      ))}
    </div>
  );
}
