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
        <Button
          type="button"
          onClick={addService}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm dòng</span>
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
          Chưa có dịch vụ nào. Bạn có thể thêm bảng giá ngay tại đây.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-bg-hover/50 px-3 py-2">
            <span className="min-w-0 flex-1 text-overline text-text-muted">
              Tên dịch vụ
            </span>
            <span className="w-32 shrink-0 text-overline text-text-muted sm:w-44">
              Giá cost
            </span>
            <span className="w-9 shrink-0 sm:w-10" />
          </div>

          {services.map((service) => (
            <div
              key={service.tempId}
              className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <Input
                  value={service.item_name}
                  onChange={(event) =>
                    updateService(service.tempId, "item_name", event.target.value)
                  }
                  placeholder="Ví dụ: Album 20x30"
                  className="h-10 w-full"
                />
              </div>

              <div className="w-32 shrink-0 sm:w-44">
                <CurrencyInput
                  value={service.cost_price || 0}
                  onChange={(value) =>
                    updateService(service.tempId, "cost_price", value)
                  }
                  className="h-10"
                />
              </div>

              <Button
                type="button"
                unstyled
                onClick={() => removeService(service.tempId)}
                className="btn-icon h-10 w-9 min-w-9 shrink-0 text-text-secondary hover:bg-error/10 hover:text-error sm:w-10"
                aria-label="Xóa dịch vụ"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
