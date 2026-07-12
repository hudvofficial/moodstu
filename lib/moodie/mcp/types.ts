export type MoodieMcpServerId = "brave";

export type MoodieMcpServerConfig = {
  id: MoodieMcpServerId;
  url: string;
  authToken?: string;
  timeoutMs: number;
  maxResponseBytes: number;
};

export type MoodieResearchSource = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  provider: MoodieMcpServerId;
  retrievedAt: string;
};

export type MoodieResearchResult = {
  query: string;
  sources: MoodieResearchSource[];
  warnings: string[];
};

export type McpJsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};
