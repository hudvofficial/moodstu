"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleCalendarCardProps {
  isConnected: boolean;
  calendarEmail?: string | null;
  grantedScopes?: string;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
  onDisconnected?: () => void;
}

export default function GoogleCalendarCard({
  isConnected,
  calendarEmail,
  grantedScopes,
  onDisconnect,
  onDisconnected,
}: GoogleCalendarCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await onDisconnect();
      if (result.success) {
        toast.success("Đã ngắt kết nối Google");
        onDisconnected?.();
      } else {
        toast.error(result.error || "Lỗi ngắt kết nối");
      }
    });
  };

  const hasCalendarScope = grantedScopes?.includes("https://www.googleapis.com/auth/calendar");
  const hasDriveScope = grantedScopes?.includes("https://www.googleapis.com/auth/drive");
  const needsReconnect = isConnected && (!hasCalendarScope || !hasDriveScope);

  return (
    <div className="card-base p-4 lg:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Google Workspace
            </h4>
            {isConnected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  Đã kết nối {calendarEmail ? `· ${calendarEmail}` : ""}
                </span>
              </div>
            ) : (
              <p className="text-xs text-text-muted mt-0.5">Chưa kết nối</p>
            )}
          </div>
        </div>

        {isConnected ? (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDisconnect}
            disabled={isPending}
            className="gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            {isPending ? "Đang ngắt..." : "Ngắt kết nối"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            className="gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Kết nối
          </Button>
        )}
      </div>

      {isConnected && (
        <div className="bg-surface-elevated rounded-md p-3 flex flex-col gap-2 border border-border-subtle">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Quyền Calendar:</span>
            {hasCalendarScope ? (
              <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>
            ) : (
              <span className="text-text-muted">Chưa cấp</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Quyền Drive:</span>
            {hasDriveScope ? (
              <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>
            ) : (
              <span className="text-red-500 font-medium flex items-center gap-1"><X className="w-3.5 h-3.5" /> Thiếu</span>
            )}
          </div>
          
          {needsReconnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              className="mt-2 w-full text-xs h-8"
            >
              Kết nối lại để cấp đủ quyền
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
