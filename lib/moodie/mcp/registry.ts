import "server-only";
import { getMoodieBraveRuntimeConfig } from "@/lib/moodie/brave-config";
import type { MoodieMcpServerConfig, MoodieMcpServerId } from "@/lib/moodie/mcp/types";

export async function getMoodieMcpServer(id: MoodieMcpServerId): Promise<MoodieMcpServerConfig | null> {
  if (id !== "brave") return null;
  const config = await getMoodieBraveRuntimeConfig();
  if (!config.enabled || !config.mcpUrl) return null;
  return {
    id,
    url: config.mcpUrl,
    authToken: config.mcpToken,
    timeoutMs: config.timeoutMs,
    maxResponseBytes: config.maxResponseBytes,
  };
}

export async function isMoodieMcpEnabled(id: MoodieMcpServerId) {
  if (id !== "brave") return false;
  const config = await getMoodieBraveRuntimeConfig();
  return config.enabled && Boolean(config.apiKey || config.mcpUrl);
}
