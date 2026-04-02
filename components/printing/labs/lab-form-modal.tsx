"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import {
  createLab,
  createLabService,
  deleteLab,
  updateLab,
  updateLabService,
  deleteLabService,
} from "@/app/actions/lab-mutations";
import { toast } from "@/lib/toast-utils";
import type { Lab } from "@/types/printing";
import LabServicesEditor, {
  type EditableLabService,
} from "@/components/printing/labs/lab-services-editor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lab: Lab | null;
  onSaved: () => Promise<void> | void;
}

interface LabFormState {
  lab_name: string;
  contact_person: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
}

const STATUS_OPTIONS = [
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm dừng" },
];

function buildTempId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitialForm(lab: Lab | null): LabFormState {
  return {
    lab_name: lab?.lab_name || "",
    contact_person: lab?.contact_person || "",
    phone: lab?.phone || "",
    address: lab?.address || "",
    status: lab?.status || "active",
  };
}

function getInitialServices(lab: Lab | null): EditableLabService[] {
  return (lab?.services ?? []).map((service) => ({
    ...service,
    tempId: service.id || buildTempId(),
    cost_price: Number(service.cost_price ?? 0),
  }));
}

async function syncServices(params: {
  labId: string;
  initialServices: EditableLabService[];
  nextServices: EditableLabService[];
}) {
  const initialById = new Map(
    params.initialServices
      .filter((service) => service.id)
      .map((service) => [service.id as string, service]),
  );

  const currentIds = new Set(
    params.nextServices
      .filter((service) => service.id)
      .map((service) => service.id as string),
  );

  const toCreate = params.nextServices.filter(
    (service) => !service.id && service.item_name.trim(),
  );
  const toUpdate = params.nextServices.filter((service) => {
    if (!service.id || !service.item_name.trim()) return false;
    const oldService = initialById.get(service.id);
    if (!oldService) return false;
    return (
      oldService.item_name !== service.item_name ||
      Number(oldService.cost_price) !== Number(service.cost_price)
    );
  });
  const toDelete = params.initialServices.filter(
    (service) => service.id && !currentIds.has(service.id),
  );

  const results = await Promise.all([
    ...toCreate.map((service) =>
      createLabService({
        lab_id: params.labId,
        item_name: service.item_name.trim(),
        cost_price: Number(service.cost_price || 0),
      }),
    ),
    ...toUpdate.map((service) =>
      updateLabService(service.id as string, {
        item_name: service.item_name.trim(),
        cost_price: Number(service.cost_price || 0),
      }),
    ),
    ...toDelete.map((service) => deleteLabService(service.id as string)),
  ]);

  const failedResult = results.find((result) => !result.success);
  if (failedResult && !failedResult.success) {
    throw new Error(failedResult.error);
  }
}

export default function LabFormModal({
  isOpen,
  onClose,
  lab,
  onSaved,
}: Props) {
  const [form, setForm] = useState<LabFormState>(() => getInitialForm(lab));
  const [services, setServices] = useState<EditableLabService[]>(
    getInitialServices(lab),
  );
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(getInitialForm(lab));
    setServices(getInitialServices(lab));
    setConfirmDeleteOpen(false);
  }, [isOpen, lab]);

  const initialServices = useMemo(() => getInitialServices(lab), [lab]);

  const handleSubmit = async () => {
    if (!form.lab_name.trim()) {
      toast("Tên lab là bắt buộc", "warning");
      return;
    }

    setLoading(true);
    try {
      if (lab) {
        const result = await updateLab(lab.id, {
          ...form,
          lab_name: form.lab_name.trim(),
          contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await syncServices({
          labId: lab.id,
          initialServices,
          nextServices: services,
        });

        toast("Cập nhật lab thành công", "success");
      } else {
        const result = await createLab({
          ...form,
          lab_name: form.lab_name.trim(),
          contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await syncServices({
          labId: result.data.id,
          initialServices: [],
          nextServices: services,
        });

        toast("Tạo lab thành công", "success");
      }

      await onSaved();
      onClose();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể lưu lab",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lab) return;

    setLoading(true);
    try {
      const result = await deleteLab(lab.id);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast("Đã xóa lab", "success");
      await onSaved();
      onClose();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể xóa lab",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title={lab ? `Sửa lab: ${lab.lab_name}` : "Tạo lab mới"}
        size="2xl"
        footer={
          <div className="form-actions">
            {lab ? (
              <Button
                onClick={() => setConfirmDeleteOpen(true)}
                variant="danger"
                disabled={loading}
              >
                Xóa
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button onClick={onClose} variant="ghost">
                Đóng
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : lab ? "Cập nhật" : "Tạo lab"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Tên lab</label>
              <Input
                value={form.lab_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lab_name: event.target.value }))
                }
                placeholder="Ví dụ: Lab Album Cao Cấp"
                className="w-full"
              />
            </div>

            <SelectForm
              label="Trạng thái"
              value={form.status}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  status: value as "active" | "inactive",
                }))
              }
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="form-grid-2col">
            <div>
              <label className="label-base">Người liên hệ</label>
              <Input
                value={form.contact_person}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contact_person: event.target.value,
                  }))
                }
                placeholder="Tên người liên hệ"
                className="w-full"
              />
            </div>

            <div>
              <label className="label-base">Số điện thoại</label>
              <Input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="090..."
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="label-base">Địa chỉ</label>
            <Textarea
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
              rows={2}
              placeholder="Địa chỉ xưởng"
              className="w-full resize-none"
            />
          </div>

          <LabServicesEditor services={services} onChange={setServices} />
        </div>
      </UnifiedModal>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa lab"
        message={`Bạn chắc chắn muốn xóa "${lab?.lab_name}"?`}
        confirmLabel="Xóa"
      />
    </>
  );
}
