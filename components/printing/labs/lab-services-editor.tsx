"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { getPrintProducts } from "@/app/actions/lab-queries";
import type { LabService, PrintProduct } from "@/types/printing";
import { cn, formatVnd } from "@/lib/utils";

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
  const [products, setProducts] = useState<PrintProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPrintProducts({ pageSize: 200 }).then((result) => {
      if (cancelled) return;
      if (result.success) setProducts(result.data.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.sku} · ${product.name}`,
  }));

  const updateService = (
    tempId: string,
    patch: Partial<EditableLabService>,
  ) => {
    onChange(
      services.map((service) =>
        service.tempId === tempId ? { ...service, ...patch } : service,
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
        product_id: null,
        selling_price_override: null,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="section-heading">Bảng giá dịch vụ</h4>
          <p className="text-micro text-text-muted">
            Map về SKU chung để giá bán tự lấy theo catalog. Bỏ trống giá bán riêng
            = dùng giá mặc định.
          </p>
        </div>
        <Button
          type="button"
          onClick={addService}
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm dòng</span>
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
          Chưa có dịch vụ nào. Bạn có thể thêm bảng giá ngay tại đây.
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => {
            const product = products.find((p) => p.id === service.product_id);
            const hasOverride =
              service.selling_price_override !== null &&
              service.selling_price_override !== undefined;

            return (
              <div
                key={service.tempId}
                className="rounded-xl border border-border bg-bg-card p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={service.item_name}
                      onChange={(event) =>
                        updateService(service.tempId, {
                          item_name: event.target.value,
                        })
                      }
                      placeholder="Ví dụ: Album 20x30"
                      className="h-10 w-full"
                      aria-label="Tên dịch vụ in tại lab"
                    />
                  </div>
                  <Button
                    type="button"
                    unstyled
                    onClick={() => removeService(service.tempId)}
                    className="btn-icon h-10 w-9 min-w-9 shrink-0 text-text-secondary hover:bg-error/10 hover:text-error"
                    aria-label="Xóa dịch vụ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="label-base">Giá cost (Lab thu)</label>
                    <CurrencyInput
                      value={Number(service.cost_price || 0)}
                      onChange={(value) =>
                        updateService(service.tempId, { cost_price: value })
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="label-base">SKU chung</label>
                    <SelectForm
                      value={service.product_id ?? ""}
                      onChange={(value) =>
                        updateService(service.tempId, {
                          product_id: value || null,
                        })
                      }
                      options={productOptions}
                      placeholder="Chưa map SKU"
                    />
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="label-base">Giá bán riêng cho Lab</label>
                    <CurrencyInput
                      value={Number(service.selling_price_override ?? 0)}
                      onChange={(value) =>
                        updateService(service.tempId, {
                          selling_price_override: value,
                        })
                      }
                      className="h-10"
                      disabled={!service.product_id}
                    />
                  </div>

                  <div className="flex flex-col justify-end pb-1 text-body-sm">
                    {service.product_id ? (
                      <>
                        <span className="text-text-muted">
                          Giá mặc định:{" "}
                          <span className="font-semibold text-text-primary tabular-nums">
                            {formatVnd(Number(product?.default_selling_price ?? 0))}
                          </span>
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-micro font-semibold",
                              hasOverride
                                ? "bg-primary/10 text-primary"
                                : "bg-surface text-text-secondary",
                            )}
                          >
                            {hasOverride ? "Đang dùng giá riêng" : "Đang dùng giá mặc định"}
                          </span>
                          {hasOverride && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateService(service.tempId, {
                                  selling_price_override: null,
                                })
                              }
                            >
                              Bỏ giá riêng
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-text-muted">
                        Chưa map SKU → chưa có giá bán catalog, giữ giá cost cũ.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
