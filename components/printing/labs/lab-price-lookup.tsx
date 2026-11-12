"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PackageSearch, Pencil, Plus, Search, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { EmptyState } from "@/components/ui/ux-states";
import {
  getLabProductPrices,
  getPrintProducts,
} from "@/app/actions/lab-queries";
import {
  upsertLabProductPrice,
  upsertPrintProduct,
} from "@/app/actions/lab-mutations";
import { PRICE_SOURCE_LABELS } from "@/lib/printing/lab-pricing";
import { toast } from "@/lib/toast-utils";
import { cn, formatVnd } from "@/lib/utils";
import type { LabProductPrice, LabOption, PrintProduct } from "@/types/printing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  labs: LabOption[];
  initialLabId?: string;
}

type TabValue = "lookup" | "catalog";

const SOURCE_BADGE: Record<
  LabProductPrice["priceSource"],
  "primary" | "neutral" | "warning"
> = {
  override: "primary",
  default: "neutral",
  unmapped: "warning",
};

function PriceRow({
  row,
  onSaved,
}: {
  row: LabProductPrice;
  onSaved: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(row.costPrice);
  const [override, setOverride] = useState<number>(row.sellingPriceOverride ?? 0);
  const [saving, setSaving] = useState(false);

  const hasOverride =
    row.sellingPriceOverride !== null && row.sellingPriceOverride !== undefined;

  const submit = async (nextOverride: number | null) => {
    setSaving(true);
    try {
      const result = await upsertLabProductPrice({
        id: row.labServiceId,
        lab_id: row.labId,
        product_id: row.productId,
        cost_price: cost,
        selling_price_override: nextOverride,
        expected_updated_at: row.updatedAt ?? undefined,
      });

      if (!result.success) {
        toast(result.error, "error");
        return;
      }

      toast("Đã lưu giá", "success");
      setEditing(false);
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-text-primary">
            {row.productName ?? row.itemName}
          </p>
          <p className="truncate text-micro text-text-muted">
            {row.sku ? `SKU ${row.sku}` : "Chưa map SKU"}
          </p>
        </div>
        <Badge variant={SOURCE_BADGE[row.priceSource]} className="shrink-0">
          {PRICE_SOURCE_LABELS[row.priceSource]}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-body-sm sm:grid-cols-3">
        <div>
          <p className="text-micro text-text-muted">Giá bán</p>
          <p className="font-semibold tabular-nums text-text-primary">
            {row.effectiveSellingPrice === null
              ? "—"
              : formatVnd(row.effectiveSellingPrice)}
          </p>
        </div>
        <div>
          <p className="text-micro text-text-muted">Cost lab</p>
          <p className="font-semibold tabular-nums text-text-primary">
            {formatVnd(row.costPrice)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-micro text-text-muted">Chênh lệch</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              row.margin === null
                ? "text-text-muted"
                : row.margin >= 0
                  ? "text-success"
                  : "text-error",
            )}
          >
            {row.margin === null ? "—" : formatVnd(row.margin)}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label-base">Cost lab</label>
              <CurrencyInput value={cost} onChange={setCost} className="h-10" />
            </div>
            <div>
              <label className="label-base">Giá bán riêng</label>
              <CurrencyInput
                value={override}
                onChange={setOverride}
                className="h-10"
                disabled={!row.productId}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => submit(override)}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving || !hasOverride}
              onClick={() => submit(null)}
            >
              <Undo2 className="h-4 w-4" />
              Về giá mặc định
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 gap-2"
          onClick={() => {
            setCost(row.costPrice);
            setOverride(row.sellingPriceOverride ?? 0);
            setEditing(true);
          }}
        >
          <Pencil className="h-4 w-4" />
          Sửa giá
        </Button>
      )}
    </div>
  );
}

function CatalogTab({
  products,
  loading,
  onSaved,
}: {
  products: PrintProduct[];
  loading: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    sku: "",
    name: "",
    specification: "",
    default_price: 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const result = await upsertPrintProduct({
        id: null,
        sku: form.sku,
        name: form.name,
        category: null,
        specification: form.specification || null,
        unit: null,
        default_selling_price: form.default_price,
        active: true,
      });

      if (!result.success) {
        toast(result.error, "error");
        return;
      }

      toast("Đã thêm SKU", "success");
      setForm({ sku: "", name: "", specification: "", default_price: 0 });
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-bg-card p-3">
        <h4 className="section-heading mb-2">Thêm SKU</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label-base">Mã SKU</label>
            <Input
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="ALB-20X30"
              className="h-10"
            />
          </div>
          <div>
            <label className="label-base">Tên sản phẩm</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Album 20x30"
              className="h-10"
            />
          </div>
          <div>
            <label className="label-base">Quy cách</label>
            <Input
              value={form.specification}
              onChange={(e) =>
                setForm((p) => ({ ...p, specification: e.target.value }))
              }
              placeholder="20x30 cm"
              className="h-10"
            />
          </div>
          <div>
            <label className="label-base">Giá bán mặc định</label>
            <CurrencyInput
              value={form.default_price}
              onChange={(value) =>
                setForm((p) => ({ ...p, default_price: value }))
              }
              className="h-10"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-2 gap-2"
          disabled={saving || !form.sku.trim() || !form.name.trim()}
          onClick={submit}
        >
          <Plus className="h-4 w-4" />
          {saving ? "Đang lưu..." : "Thêm SKU"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Chưa có SKU"
          description="Thêm SKU đầu tiên để Lab có thể map giá bán."
          compact
        />
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-text-primary">
                  {product.name}
                </p>
                <p className="truncate text-micro text-text-muted">
                  {product.sku}
                  {product.specification ? ` · ${product.specification}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-body-sm font-semibold tabular-nums text-text-primary">
                {formatVnd(product.default_selling_price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LabPriceLookup({
  isOpen,
  onClose,
  labs,
  initialLabId,
}: Props) {
  const [tab, setTab] = useState<TabValue>("lookup");
  const [labId, setLabId] = useState(initialLabId ?? labs[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LabProductPrice[]>([]);
  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    if (!labId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getLabProductPrices({ labId, search });
      if (!result.success) {
        setError(result.error);
        setRows([]);
        return;
      }
      setRows(result.data);
    } finally {
      setLoading(false);
    }
  }, [labId, search]);

  const loadProducts = useCallback(async () => {
    const result = await getPrintProducts({ pageSize: 200 });
    if (result.success) setProducts(result.data.items);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadPrices();
  }, [isOpen, loadPrices]);

  useEffect(() => {
    if (!isOpen || tab !== "catalog") return;
    void loadProducts();
  }, [isOpen, tab, loadProducts]);

  useEffect(() => {
    if (isOpen && initialLabId) setLabId(initialLabId);
  }, [isOpen, initialLabId]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Tra giá Xưởng in" size="lg">
      <div className="space-y-3">
        <TabsFilter
          tabs={[
            { value: "lookup", label: "Tra giá" },
            { value: "catalog", label: "Danh mục SKU" },
          ]}
          activeTab={tab}
          onChange={(value) => setTab(value as TabValue)}
        />

        {tab === "lookup" ? (
          <>
            <SelectForm
              label="Chọn Lab"
              value={labId}
              onChange={setLabId}
              options={labs.map((lab) => ({
                value: lab.id,
                label: lab.lab_name,
              }))}
              placeholder="Chọn lab để tra giá"
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo SKU hoặc tên dịch vụ"
                className="h-10 pl-9"
                aria-label="Tìm SKU hoặc dịch vụ"
              />
            </div>

            {!labId ? (
              <EmptyState
                icon={PackageSearch}
                title="Chưa chọn Lab"
                description="Chọn một Lab để xem bảng giá."
                compact
              />
            ) : loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : error ? (
              <EmptyState
                icon={PackageSearch}
                title="Không tải được bảng giá"
                description={error}
                actionLabel="Thử lại"
                onAction={() => void loadPrices()}
                compact
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="Chưa có giá"
                description="Lab này chưa có dòng giá nào khớp tìm kiếm."
                compact
              />
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <PriceRow key={row.labServiceId} row={row} onSaved={loadPrices} />
                ))}
              </div>
            )}
          </>
        ) : (
          <CatalogTab
            products={products}
            loading={false}
            onSaved={async () => {
              await loadProducts();
              await loadPrices();
            }}
          />
        )}
      </div>
    </Drawer>
  );
}

export default LabPriceLookup;
