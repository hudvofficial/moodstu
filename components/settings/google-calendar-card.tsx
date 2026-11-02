"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { getGoogleOAuthFeedback } from "@/lib/google-oauth-feedback";
import { toast } from "@/lib/toast-manager";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutate } from "@/lib/swr";
import { getGoogleCalendarSourceOptionsAdmin } from "@/app/actions/settings-queries";
import { updateGoogleCalendarSourceSelection } from "@/app/actions/settings-mutations";
import type { GoogleCalendarSourceOption } from "@/lib/google-calendar-sources";

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
  const [sourceOptions, setSourceOptions] = useState<GoogleCalendarSourceOption[]>([]);
  const [savedSourceIds, setSavedSourceIds] = useState<string[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesSaving, setSourcesSaving] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const result = await getGoogleCalendarSourceOptionsAdmin();
      if (!result.success) throw new Error("Không thể tải nguồn lịch từ Google.");
      setSourceOptions(result.data);
      setSavedSourceIds(result.data.filter((item) => item.included).map((item) => item.id));
    } catch {
      setSourcesError("Không thể tải danh sách lịch. Kiểm tra quyền Calendar và thử lại.");
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) void loadSources();
  }, [isConnected, loadSources]);

  const toggleSource = (id: string) => {
    setSourceOptions((current) => current.map((source) =>
      source.id === id ? { ...source, included: !source.included } : source,
    ));
  };

  const saveSources = async () => {
    const ids = sourceOptions.filter((item) => item.included).map((item) => item.id);
    if (ids.length === 0) {
      setSourcesError("Cần chọn ít nhất một lịch để hiển thị trong Mood Studio.");
      return;
    }
    setSourcesSaving(true);
    setSourcesError(null);
    try {
      const result = await updateGoogleCalendarSourceSelection(ids);
      if (!result.success) throw new Error(result.error || "Không thể lưu nguồn lịch.");
      setSavedSourceIds(ids);
      toast.success("Đã lưu " + result.data.count + " nguồn lịch Google.");
      void mutate((key: unknown) => typeof key === "string" && key.startsWith("calendar-google:"));
    } catch {
      setSourcesError("Không thể lưu nguồn lịch Google. Vui lòng thử lại.");
    } finally {
      setSourcesSaving(false);
    }
  };
  const params = useSearchParams();
  const oauthFeedback = getGoogleOAuthFeedback(
    params.get("google_error"),
    params.get("google_connected"),
    isConnected,
  );

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
  const currentIds = sourceOptions.filter((source) => source.included).map((source) => source.id);
  const sourcesDirty = currentIds.length !== savedSourceIds.length ||
    currentIds.some((id) => !savedSourceIds.includes(id));

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
          <a
            href="/api/auth/google"
            className="btn btn-outline px-3 py-2 text-xs min-h-[40px] gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Kết nối
          </a>
        )}
      </div>

      {oauthFeedback && (
        <div
          role={oauthFeedback.tone === "success" ? "status" : "alert"}
          className={`rounded-lg border p-3 text-sm ${
            oauthFeedback.tone === "success"
              ? "border-green-500/25 bg-green-500/5 text-text-primary"
              : "border-amber-500/30 bg-amber-500/5 text-text-primary"
          }`}
        >
          <p className="font-semibold">{oauthFeedback.message}</p>
          <p className="mt-1 text-xs text-text-secondary">{oauthFeedback.detail}</p>
        </div>
      )}

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
            <a
              href="/api/auth/google"
              className="btn btn-outline px-3 py-2 text-xs min-h-[40px] mt-2 w-full h-8"
            >
              Kết nối lại để cấp đủ quyền
            </a>
          )}
          {hasCalendarScope && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">Nguồn lịch hiển thị</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sourcesLoading || sourcesSaving}
                  onClick={() => { void loadSources(); }}
                >
                  Làm mới
                </Button>
              </div>
              <p className="text-xs text-text-secondary">
                Chỉ các lịch được chọn bên dưới mới hiện trong lịch Mood Studio.
                Thao tác này không đổi lựa chọn trên Google Calendar.
                Sự kiện từ các nguồn được chọn sẽ hiển thị cho nhân sự có quyền xem lịch studio.
              </p>
              {sourcesLoading ? (
                <p role="status" className="text-xs text-text-muted">Đang tải nguồn lịch Google…</p>
              ) : sourceOptions.length === 0 && !sourcesError ? (
                <p className="text-xs text-text-muted">Tài khoản chưa có lịch nào có thể đọc.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sourceOptions.map((source) => (
                    <label
                      key={source.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-border-subtle bg-bg-card p-2.5"
                    >
                      <Input
                        type="checkbox"
                        unstyled
                        withBaseStyles={false}
                        checked={source.included}
                        disabled={sourcesSaving}
                        onChange={() => toggleSource(source.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        aria-label={"Hiển thị lịch " + source.name}
                      />
                      <span className="min-w-0 flex flex-col gap-1">
                        <span className="break-words text-sm font-medium text-text-primary">{source.name}</span>
                        <span className="text-xs text-text-muted">
                          {source.primary ? "Lịch chính" : source.selected ? "Đang bật trên Google" : "Đang tắt hiển thị trên Google"}
                          {source.accessRole === "reader" ? " · Quyền chỉ xem" : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {sourcesError && (
                <p role="alert" className="text-xs text-red-600">{sourcesError}</p>
              )}
              {sourceOptions.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={sourcesLoading || sourcesSaving || !sourcesDirty}
                  onClick={() => { void saveSources(); }}
                >
                  {sourcesSaving ? "Đang lưu nguồn lịch…" : "Lưu nguồn lịch hiển thị"}
                </Button>
              )}
              <p className="text-xs text-text-muted">
                Sự kiện Mood Studio tạo mới vẫn được đẩy lên lịch Google chính, không đẩy sang các lịch chia sẻ.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
