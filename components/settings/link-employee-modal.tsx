"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import {
  linkUserToEmployee,
  getUnlinkedEmployees,
} from "@/app/actions/user-management";
import { Mail, Loader2 } from "lucide-react";
import { SelectForm } from "@/components/ui/select/SelectForm";
import Image from "next/image";

/* ═══════════════════════════════════════════
   Link Employee Modal — V2 Gold Standard
   V1 logic 100% + SSOT tokens + UnifiedModal
   ═══════════════════════════════════════════ */

type UnlinkedEmployee = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
};

interface LinkEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUserId: string;
  authEmail: string;
  suggestedEmployee?: {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
    avatar_url: string | null;
  } | null;
  onLinked: () => void;
}

export default function LinkEmployeeModal({
  isOpen,
  onClose,
  authUserId,
  authEmail,
  suggestedEmployee,
  onLinked,
}: LinkEmployeeModalProps) {
  const [employees, setEmployees] = useState<UnlinkedEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── Fetch unlinked employees khi modal mở (V1 pattern) ───
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getUnlinkedEmployees();
      if (cancelled) return;
      if (result.success) {
        setEmployees(result.data || []);
        if (suggestedEmployee) {
          setSelectedId(suggestedEmployee.id);
        }
      } else {
        toast.error("Lỗi tải danh sách nhân viên");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset khi đóng
  const handleClose = () => {
    setSelectedId("");
    setEmployees([]);
    onClose();
  };

  const handleLink = () => {
    if (!selectedId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }

    startTransition(async () => {
      const result = await linkUserToEmployee(authUserId, selectedId);
      if (result.success) {
        toast.success(result.data.message);
        onLinked();
        handleClose();
      } else {
        toast.error(result.error || "Lỗi liên kết");
      }
    });
  };

  const selectedEmp = employees.find((e) => e.id === selectedId);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Liên kết nhân viên"
      size="md"
      footer={
        <div className="form-actions">
          <Button variant="secondary" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleLink}
            disabled={!selectedId || isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Đang liên kết..." : "Liên kết"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Auth user info */}
        <div className="flex items-center gap-3 p-3 bg-bg-hover rounded-lg">
          <Mail className="w-4 h-4 text-text-secondary" />
          <div>
            <p className="text-xs text-text-muted">Tài khoản đăng nhập</p>
            <p className="text-sm font-medium text-text-primary">
              {authEmail}
            </p>
          </div>
        </div>

          {loading ? (
            <div className="h-11 bg-bg-hover rounded-lg animate-pulse mt-1" />
          ) : (
            <SelectForm
              label="Chọn nhân viên"
              value={selectedId}
              onChange={setSelectedId}
              placeholder="— Chọn nhân viên —"
              options={[
                ...(suggestedEmployee
                  ? [
                      {
                        value: suggestedEmployee.id,
                        label: `⭐ ${suggestedEmployee.full_name} (gợi ý - email trùng)`,
                      },
                    ]
                  : []),
                ...employees
                  .filter((e) => e.id !== suggestedEmployee?.id)
                  .map((emp) => ({
                    value: emp.id,
                    label: `${emp.full_name}${emp.email ? ` (${emp.email})` : ""}`,
                  })),
              ]}
            />
          )}

        {/* Preview selected employee */}
        {selectedEmp && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 ring-1 ring-primary/20 rounded-lg">
            {selectedEmp.avatar_url ? (
              <Image
                src={selectedEmp.avatar_url}
                alt={selectedEmp.full_name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0"
                unoptimized={true}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {selectedEmp.full_name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {selectedEmp.full_name}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {selectedEmp.email || "Chưa có email"}
              </p>
            </div>
            <span className="badge badge-primary">{selectedEmp.role}</span>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
