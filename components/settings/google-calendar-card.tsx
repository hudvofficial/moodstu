"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleCalendarCardProps {
  isConnected: boolean;
  calendarEmail?: string | null;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
}

export default function GoogleCalendarCard({
  isConnected,
  calendarEmail,
  onDisconnect,
}: GoogleCalendarCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await onDisconnect();
      if (result.success) {
        toast.success("Da ngat ket noi Google Calendar");
        router.refresh();
      } else {
        toast.error(result.error || "Loi ngat ket noi");
      }
    });
  };

  return (
    <div className="card-base p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Google Calendar
            </h4>
            {isConnected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  Da ket noi
                  {calendarEmail && ` · ${calendarEmail}`}
                </span>
              </div>
            ) : (
              <p className="text-xs text-text-muted mt-0.5">Chua ket noi</p>
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
            {isPending ? "Dang ngat..." : "Ngat ket noi"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            className="gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Ket noi
          </Button>
        )}
      </div>
    </div>
  );
}
