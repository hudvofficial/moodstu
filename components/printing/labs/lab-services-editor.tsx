"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import type { LabService } from "@/types/printing";

export interface EditableLabService extends LabService {
  tempId: string;
}

interface Props {
  services: EditableLabService[];
  onChange: (services: EditableLabService[]) => void;
}

function buildTempId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LabServicesEditor({ services, onChange }: Props) {
  const updateService = (
    tempId: string,
    field: "item_name" | "cost_price",
    value: string | number,
  ) => {
    onChange(
      services.map((service) =>
        service.tempId === tempId
          ? { ...service, [field]: value }
          : service,
      ),
    );
  };

  const removeService = (tempId: string) => {
    onChange(services.filter((service) => service.tempId !== tempId));
  };

  const addService = () => {
    onChange([
      ...services,
      {
        tempId: buildTempId(),
        item_name: "",
        cost_price: 0,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="section-heading">Bảng giá dịch vụ</h4>
        <Button type="button" onClick={addService} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Thêm dòng</span>
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
          Chưa có dịch vụ nào. Bạn có thể thêm bảng giá ngay tại đây.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.tempId} className="rounded-xl bg-bg-hover p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <label className="label-base">Tên dịch vụ</label>
                  <Input
                    value={service.item_name}
                    onChange={(event) =>
                      updateService(service.tempId, "item_name", event.target.value)
                    }
                    placeholder="Ví dụ: Album 20x30"
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => removeService(service.tempId)}
                  variant="ghost"
                  className="btn-icon text-error mt-6"
                  aria-label="Xóa dịch vụ"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <CurrencyInput
                label="Giá cost"
                value={service.cost_price || 0}
                onChange={(value) =>
                  updateService(service.tempId, "cost_price", value)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
