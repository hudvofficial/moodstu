-- Moodie provider settings
-- Lưu cấu hình LLM provider (gemini / openai_compatible) cho Moodie.
-- Dùng bảng system_settings có sẵn — không tạo table mới.
-- Các key mới được insert nếu chưa tồn tại; nếu đã có sẽ giữ nguyên giá trị.

-- Note: system_settings đã có RLS policy cho admin/manager.
-- Các key này được registry.ts (lib/moodie/providers/registry.ts) đọc qua admin client.

INSERT INTO public.system_settings (key, value, description)
VALUES
  ('moodie_provider_id', 'gemini', 'LLM provider cho Moodie: gemini | openai_compatible'),
  ('moodie_provider_base_url', '', 'Base URL cho OpenAI-compatible provider (Ollama, Qwen, DeepSeek...)'),
  ('moodie_provider_api_key', '', 'API key cho provider (encrypt qua settings-secrets)'),
  ('moodie_provider_model', 'gemini-2.5-flash', 'Model name cho provider'),
  ('moodie_provider_embedding_model', '', 'Model embedding cho RAG (optional)'),
  ('moodie_provider_label', 'Gemini', 'Label hien thi trong UI')
ON CONFLICT (key) DO NOTHING;
