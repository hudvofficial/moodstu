INSERT INTO public.system_settings (key, value, description)
VALUES
  ('moodie_brave_enabled', 'false', 'Enable Brave Search research for Moodie'),
  ('moodie_brave_api_key', '', 'Brave Search API key encrypted through settings-secrets'),
  ('moodie_brave_endpoint', 'https://api.search.brave.com/res/v1', 'Brave Search REST API endpoint'),
  ('moodie_brave_mcp_url', '', 'Optional Brave MCP endpoint'),
  ('moodie_brave_mcp_token', '', 'Optional Brave MCP token encrypted through settings-secrets'),
  ('moodie_brave_timeout_ms', '12000', 'Brave request timeout in milliseconds'),
  ('moodie_brave_max_response_bytes', '1000000', 'Maximum accepted Brave response size')
ON CONFLICT (key) DO NOTHING;
