"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getPriceRules, upsertPriceRule } from "@/app/actions/builder-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PriceRule } from "@/types/service";

interface RuleManagerProps {
  onClose: () => void;
}

export default function RuleManager({ onClose }: RuleManagerProps) {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<Partial<PriceRule> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const data = await getPriceRules();
      if (active) {
        setRules(data as unknown as PriceRule[]);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule?.name) return;

    startTransition(async () => {
      const res = await upsertPriceRule(selectedRule as Partial<PriceRule>);
      if (res.success) {
        toast.success("Đã lưu quy tắc thành công");
        setSelectedRule(null);
        const data = await getPriceRules();
        setRules(data as unknown as PriceRule[]);
      } else {
        toast.error("Lỗi khi lưu: " + res.error);
      }
    });
  };

  const toggleActive = async (rule: PriceRule) => {
    startTransition(async () => {
      const res = await upsertPriceRule({ ...rule, is_active: !rule.is_active } as Partial<PriceRule>);
      if (res.success) {
        const data = await getPriceRules();
        setRules(data as unknown as PriceRule[]);
      } else {
        toast.error("Lỗi: " + res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
      <div className="bg-bg-card rounded-soft-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-bg-sidebar/50">
          <div>
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">rule</span>
              Quản lý Quy tắc tính giá
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Cấu hình giảm giá, khuyến mãi và logic Combo
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted transition-colors p-0"
          >
            <span className="material-symbols-outlined">close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex divide-x divide-border">
          {/* Left: List */}
          <div className="w-1/3 flex flex-col bg-bg-sidebar/30">
            <div className="p-4 border-b border-border flex justify-between items-center bg-bg-card">
              <span className="text-caption font-bold text-text-muted uppercase tracking-widest">
                Danh sách
              </span>
              <Button
                variant="ghost"
                onClick={() =>
                  setSelectedRule({
                    name: "Rule mới",
                    is_active: true,
                    priority: 1,
                    conditions: { type: "min_quantity", value: 2 },
                    actions: { type: "discount_percent", value: 10 },
                  })
                }
                className="text-caption font-bold text-primary hover:bg-primary/5 px-2 py-1 h-auto"
              >
                + Thêm mới
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center py-10 opacity-30 italic text-caption">Đang tải...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-10 opacity-30 italic text-caption">Chưa có quy tắc nào</div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-soft-md border transition-all cursor-pointer group ${
                      selectedRule?.id === rule.id
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-bg-card border-border hover:border-primary/30"
                    }`}
                    onClick={() => setSelectedRule(rule)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={`text-sm font-bold truncate ${
                          selectedRule?.id === rule.id ? "text-white" : "text-text-main"
                        }`}
                      >
                        {rule.name}
                      </h4>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(rule);
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                          rule.is_active ? "bg-status-success" : "bg-border-dark"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                            rule.is_active ? "right-0.5" : "left-0.5"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-micro font-medium px-1.5 py-0.5 rounded ${
                          selectedRule?.id === rule.id
                            ? "bg-white/20 text-white"
                            : "bg-bg-sub text-text-secondary"
                        }`}
                      >
                        Prio: {rule.priority}
                      </span>
                      <span
                        className={`text-micro truncate max-w-[100px] ${
                          selectedRule?.id === rule.id ? "text-white/70" : "text-text-muted"
                        }`}
                      >
                        {rule.description || "Không có mô tả"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 bg-bg-card overflow-y-auto p-6">
            {selectedRule ? (
              <form onSubmit={handleSave} className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Tên Quy tắc"
                    value={selectedRule.name || ""}
                    onChange={(e) =>
                      setSelectedRule({ ...selectedRule, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5"
                    required
                  />
                  <Input
                    label="Độ ưu tiên (Lớn chạy trước)"
                    type="number"
                    value={selectedRule.priority || 1}
                    onChange={(e) =>
                      setSelectedRule({
                        ...selectedRule,
                        priority: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5"
                  />
                </div>

                <Input
                  label="Mô tả ngắn"
                  value={selectedRule.description || ""}
                  onChange={(e) =>
                    setSelectedRule({ ...selectedRule, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5"
                  placeholder="VD: Giảm 10% khi mua trên 2 váy..."
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5 relative">
                    <Textarea
                      label="Điều kiện (Conditions - JSON)"
                      rows={6}
                      value={JSON.stringify(selectedRule.conditions, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setSelectedRule({ ...selectedRule, conditions: parsed });
                        } catch {}
                      }}
                      className="w-full px-4 py-3 font-mono text-caption text-status-success"
                    />
                    <span className="absolute top-0 right-1 text-micro text-primary italic font-normal">
                      Hỗ trợ category_id
                    </span>
                  </div>
                  <Textarea
                    label="Hành động (Actions - JSON)"
                    rows={6}
                    value={JSON.stringify(selectedRule.actions, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setSelectedRule({ ...selectedRule, actions: parsed });
                      } catch {}
                    }}
                    className="w-full px-4 py-3 font-mono text-caption text-status-warning"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending}
                    className="flex-1 py-3 shadow-md"
                  >
                    {isPending ? "Đang lưu..." : "Lưu Quy tắc"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedRule(null)}
                    className="px-6 py-3 bg-bg-sub text-text-secondary hover:bg-border"
                  >
                    Hủy
                  </Button>
                </div>
                <div className="bg-state-info/10 p-4 rounded-soft-lg border border-state-info/20">
                  <h5 className="text-micro font-bold text-state-info uppercase mb-1">
                    Cấu hình mẫu:
                  </h5>
                  <p className="text-caption text-text-secondary font-mono">
                    Condition: {`{ "type": "min_quantity", "category_id": "...", "value": 2 }`}
                    <br />
                    Action: {`{ "type": "discount_percent", "value": 10 }`}
                    <br />
                  </p>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <span className="material-symbols-outlined text-6xl mb-4">account_tree</span>
                <p className="text-sm font-bold">
                  Chọn một quy tắc từ danh sách bên trái để chỉnh sửa
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
