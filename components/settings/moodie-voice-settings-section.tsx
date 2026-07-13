"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, KeyRound, Loader2, Mic, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveMoodieVoiceConfig, saveMoodieVoiceLiveConfig } from "@/app/actions/moodie-provider-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import type { MoodieVoiceSettings } from "@/types/settings";

const PROVIDERS = [
  { id: "gemini" as const, name: "Gemini Live", description: "Đang dùng", available: true },
  { id: "openai" as const, name: "OpenAI Realtime", description: "Sẵn sàng khi có API key", available: false },
];

const ENGINE_OPTIONS = [
  { value: "live", label: "Realtime — trò chuyện trực tiếp" },
  { value: "cascade", label: "Từng câu — chế độ dự phòng" },
];

export function MoodieVoiceSettingsSection({ settings, disabled }: { settings: MoodieVoiceSettings; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [provider, setProvider] = useState<"gemini" | "openai">(settings.realtimeProvider || "gemini");
  const [engine, setEngine] = useState<"live" | "cascade">(settings.engine || "live");
  const [geminiKey, setGeminiKey] = useState("");
  const [openAIKey, setOpenAIKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [sttModel, setSttModel] = useState(settings.model || "gemini-2.5-flash");
  const [geminiModel, setGeminiModel] = useState(settings.liveModel || "gemini-3.1-flash-live-preview");
  const [geminiVoice, setGeminiVoice] = useState(settings.liveVoice || "Zephyr");
  const [openAIModel, setOpenAIModel] = useState(settings.openaiModel || "gpt-realtime-2.1");
  const [openAIVoice, setOpenAIVoice] = useState(settings.openaiVoice || "marin");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const [voiceResult, liveResult] = await Promise.all([
        saveMoodieVoiceConfig({ api_key: geminiKey || undefined, model: sttModel }),
        saveMoodieVoiceLiveConfig({
          engine,
          provider,
          voice: geminiVoice,
          model: geminiModel,
          openai_api_key: openAIKey || undefined,
          openai_model: openAIModel,
          openai_voice: openAIVoice,
        }),
      ]);
      if (!voiceResult.success) throw new Error(voiceResult.error);
      if (!liveResult.success) throw new Error(liveResult.error);
      setGeminiKey("");
      setOpenAIKey("");
      toast.success(`Đã lưu cấu hình ${provider === "gemini" ? "Gemini Live" : "OpenAI Realtime"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình giọng nói");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-primary">
      <Button type="button" unstyled onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mic className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary">Giọng nói</span>
          <span className="mt-0.5 block text-xs text-text-muted">Trò chuyện realtime và nhập liệu</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </Button>

      {open ? (
        <div className="space-y-5 border-t border-border p-4">
          <div>
            <div className="mb-2">
              <h6 className="text-sm font-semibold text-text-primary">Nền tảng realtime</h6>
              <p className="mt-0.5 text-xs text-text-muted">Gemini là mặc định; Moodie tự chuyển về Gemini nếu OpenAI chưa sẵn sàng.</p>
            </div>
            <div className="grid gap-2">
              {PROVIDERS.map((item) => {
                const selected = provider === item.id;
                const ready = item.id === "gemini" ? settings.hasKey : settings.hasOpenAIKey;
                return (
                  <Button key={item.id} type="button" unstyled onClick={() => setProvider(item.id)} disabled={disabled} className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border bg-bg-subtle hover:border-primary/40"}`}>
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-white" : "bg-bg-primary text-text-muted"}`}>
                      {item.id === "gemini" ? <Radio className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">{item.name}{selected ? <Check className="h-4 w-4 text-primary" /> : null}</span>
                      <span className="mt-1 block text-xs text-text-muted">{ready ? "Đã kết nối" : item.description}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {provider === "gemini" ? (
            <div className="space-y-4 rounded-xl border border-border bg-bg-subtle p-4">
              <ProviderHeading title="Gemini Live" ready={settings.hasKey} maskedKey={settings.keyMasked} />
              <SecretInput label={settings.hasKey ? "Thay API key Gemini" : "API key Gemini"} value={geminiKey} onChange={setGeminiKey} show={showGeminiKey} onToggle={() => setShowGeminiKey((value) => !value)} placeholder={settings.hasKey ? "Để trống để giữ nguyên key hiện tại" : "AIza..."} disabled={disabled || saving} />
              <div className="grid gap-3">
                <Field label="Model Live" value={geminiModel} onChange={setGeminiModel} disabled={disabled || saving} />
                <Field label="Giọng đọc" value={geminiVoice} onChange={setGeminiVoice} disabled={disabled || saving} />
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-bg-subtle p-4">
              <ProviderHeading title="OpenAI Realtime" ready={Boolean(settings.hasOpenAIKey)} maskedKey={settings.openaiKeyMasked} />
              {!settings.hasOpenAIKey ? <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-text-secondary">Chưa có OpenAI API key. Cấu hình này có thể lưu trước; Moodie vẫn tiếp tục dùng Gemini.</p> : null}
              <SecretInput label={settings.hasOpenAIKey ? "Thay API key OpenAI" : "API key OpenAI"} value={openAIKey} onChange={setOpenAIKey} show={showOpenAIKey} onToggle={() => setShowOpenAIKey((value) => !value)} placeholder={settings.hasOpenAIKey ? "Để trống để giữ nguyên key hiện tại" : "sk-..."} disabled={disabled || saving} />
              <div className="grid gap-3">
                <Field label="Model Realtime" value={openAIModel} onChange={setOpenAIModel} disabled={disabled || saving} />
                <Field label="Giọng đọc" value={openAIVoice} onChange={setOpenAIVoice} disabled={disabled || saving} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border">
            <Button type="button" unstyled onClick={() => setAdvancedOpen((value) => !value)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-text-primary">
              <span>Cài đặt nâng cao</span>{advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {advancedOpen ? <div className="grid gap-3 border-t border-border p-3"><div><label className="label-base">Chế độ xử lý</label><SelectForm value={engine} onChange={(value) => setEngine(value as "live" | "cascade")} options={ENGINE_OPTIONS} disabled={disabled || saving} /></div><Field label="Model nhận dạng giọng nói dự phòng" value={sttModel} onChange={setSttModel} disabled={disabled || saving} /></div> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-xs text-text-muted"><ShieldCheck className="h-4 w-4" />API key được mã hóa và không gửi lại trình duyệt.</p>
            <Button type="button" size="sm" onClick={save} disabled={disabled || saving} className="w-full gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Lưu cấu hình</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProviderHeading({ title, ready, maskedKey }: { title: string; ready: boolean; maskedKey?: string }) {
  return <div className="flex items-start justify-between gap-3"><div><h6 className="text-sm font-semibold text-text-primary">{title}</h6><p className="mt-0.5 font-mono text-xs text-text-muted">{ready ? maskedKey || "Đã lưu key an toàn" : "Chưa kết nối"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-medium ${ready ? "bg-success/10 text-success" : "bg-bg-primary text-text-muted"}`}>{ready ? "Đã cấu hình" : "Chưa có key"}</span></div>;
}

function SecretInput({ label, value, onChange, show, onToggle, placeholder, disabled }: { label: string; value: string; onChange(value: string): void; show: boolean; onToggle(): void; placeholder: string; disabled: boolean }) {
  return <div><label className="label-base">{label}</label><div className="relative"><Input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="pr-11" autoComplete="new-password" /><Button type="button" variant="icon" onClick={onToggle} disabled={disabled} className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md" aria-label={show ? "Ẩn API key" : "Hiện API key"}><KeyRound className="h-4 w-4" /></Button></div></div>;
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange(value: string): void; disabled: boolean }) {
  return <div><label className="label-base">{label}</label><Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="font-mono text-xs" /></div>;
}
