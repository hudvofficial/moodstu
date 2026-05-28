"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, Check, X, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Pagination } from "@/components/ui/pagination";
import { useApprovalRequests, useApprovalInvalidation } from "@/lib/hooks/use-inventory-queries";
import { approveFulfillmentRequest, rejectFulfillmentRequest } from "@/app/actions/inventory-mutations";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã duyệt", value: "approved" },
  { label: "Từ chối", value: "rejected" },
];

export function ApprovalRequestsTab({ userRole }: { userRole: string }) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [actionItem, setActionItem] = useState<{ id: string, type: "approve" | "reject" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filters = useMemo(() => ({ status, page, pageSize: 20 }), [status, page]);
  const { requests, total, isLoading, error, mutate } = useApprovalRequests(filters);
  const { invalidateAll } = useApprovalInvalidation();

  // Realtime updates
  useRealtimeMulti(
    useMemo(() => [{ table: "approval_requests" }], []),
    {
      channelName: "approval-requests-updates",
      onChange: invalidateAll,
      debounceMs: 500,
    }
  );

  const handleAction = async () => {
    if (!actionItem) return;
    
    if (actionItem.type === "reject" && !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionItem.type === "approve") {
        const result = await approveFulfillmentRequest(actionItem.id);
        if (!result.success) throw new Error(result.error);
        toast.success("Đã duyệt yêu cầu thành công");
      } else {
        const result = await rejectFulfillmentRequest(actionItem.id, rejectReason.trim());
        if (!result.success) throw new Error(result.error);
        toast.success("Đã từ chối yêu cầu");
      }
      setActionItem(null);
      setRejectReason("");
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="warning">Chờ duyệt</Badge>;
      case "approved": return <Badge variant="success">Đã duyệt</Badge>;
      case "rejected": return <Badge variant="error">Từ chối</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <ShieldAlert className="size-10 mb-4 opacity-50" />
        <p>Bạn không có quyền truy cập khu vực này.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="bg-bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between bg-bg-base/50 gap-3">
        <h3 className="text-body-sm font-semibold flex items-center gap-2">
          <FileText className="size-4" />
          Danh sách yêu cầu phê duyệt
        </h3>
        <div className="flex items-center gap-3">
          <TabsFilter
            tabs={STATUS_TABS}
            activeTab={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            variant="pills"
          />
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>Làm mới</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-0">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-interactive" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <ShieldAlert className="size-10 mb-4 opacity-50 text-error" />
            <p className="text-error">Đã có lỗi xảy ra khi tải danh sách: {error?.message}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Check className="size-10 mb-4 opacity-30 text-success" />
            <p>Tuyệt vời! Không có yêu cầu nào.</p>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="bg-bg-base/50 text-text-muted text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                  <th className="px-4 py-3 font-medium border-b border-border/40 w-1/4">Thông tin yêu cầu</th>
                  <th className="px-4 py-3 font-medium border-b border-border/40 w-1/4">Người yêu cầu</th>
                  <th className="px-4 py-3 font-medium border-b border-border/40 w-1/4">Lý do</th>
                  <th className="px-4 py-3 font-medium border-b border-border/40 w-1/6">Trạng thái</th>
                  <th className="px-4 py-3 font-medium border-b border-border/40 w-32 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-text-primary">
                        {req.action_type === 'delete_fulfillment' ? 'Xoá phát sinh' : 'Sửa phát sinh'}
                      </p>
                      <p className="text-caption text-text-muted mt-1">Mã GD: #{req.target_id.slice(0,8)}</p>
                      <p className="text-caption text-text-muted">
                        {format(new Date(req.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-text-primary">{req.requester_name}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-text-secondary">{req.reason}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {getStatusBadge(req.status)}
                      {req.status === 'rejected' && req.review_notes && (
                        <p className="text-caption text-error mt-1">&quot;{req.review_notes}&quot;</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            unstyled
                            onClick={() => setActionItem({ id: req.id, type: "approve" })}
                            className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors"
                            title="Duyệt"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            unstyled
                            onClick={() => setActionItem({ id: req.id, type: "reject" })}
                            className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors"
                            title="Từ chối"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/40 flex justify-center sticky bottom-0 bg-bg-card">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      <UnifiedModal 
        isOpen={!!actionItem} 
        onClose={() => setActionItem(null)}
        title={actionItem?.type === "approve" ? "Xác nhận phê duyệt" : "Từ chối yêu cầu"}
      >
        <div className="space-y-4">
          <p className="text-body-sm text-text-secondary">
            {actionItem?.type === "approve" 
              ? "Bạn có chắc chắn duyệt yêu cầu này? Hệ thống sẽ tự động cập nhật lại tồn kho và các khoản tiền công nợ."
              : "Vui lòng nhập lý do từ chối yêu cầu này."}
          </p>
          
          {actionItem?.type === "reject" && (
            <div className="space-y-2">
              <label className="text-body-sm font-medium text-text-primary">Lý do (Bắt buộc)</label>
              <Input 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Không hợp lệ..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setActionItem(null)} disabled={isSubmitting}>Hủy</Button>
            <Button 
              variant={actionItem?.type === "approve" ? "interactive" : "danger"} 
              onClick={handleAction} 
              disabled={isSubmitting || (actionItem?.type === "reject" && !rejectReason.trim())}
            >
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {actionItem?.type === "approve" ? "Xác nhận duyệt" : "Từ chối"}
            </Button>
          </div>
        </div>
      </UnifiedModal>
    </div>
  );
}
