import "server-only";
import type { McpJsonRpcResponse, MoodieMcpServerConfig } from "@/lib/moodie/mcp/types";

type Circuit = { failures: number; openedUntil: number };
const circuits = new Map<string, Circuit>();
const FAILURE_THRESHOLD = 3;
const OPEN_MS = 30_000;

function assertCircuitClosed(serverId: string) {
  const circuit = circuits.get(serverId);
  if (circuit && circuit.openedUntil > Date.now()) throw new Error(`MCP circuit open: ${serverId}`);
}

function recordSuccess(serverId: string) {
  circuits.delete(serverId);
}

function recordFailure(serverId: string) {
  const current = circuits.get(serverId) || { failures: 0, openedUntil: 0 };
  const failures = current.failures + 1;
  circuits.set(serverId, { failures, openedUntil: failures >= FAILURE_THRESHOLD ? Date.now() + OPEN_MS : 0 });
}

export async function callMoodieMcpTool(input: {
  server: MoodieMcpServerConfig;
  name: string;
  arguments: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  assertCircuitClosed(input.server.id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("MCP request timed out")), input.server.timeoutMs);
  const abort = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(input.server.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(input.server.authToken ? { authorization: `Bearer ${input.server.authToken}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name: input.name, arguments: input.arguments },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > input.server.maxResponseBytes) throw new Error("MCP response exceeds size limit");
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > input.server.maxResponseBytes) throw new Error("MCP response exceeds size limit");
    const payloadText = text.startsWith("event:") || text.startsWith("data:")
      ? text.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim() || ""
      : text;
    const payload = JSON.parse(payloadText) as McpJsonRpcResponse;
    if (payload.error) throw new Error(`MCP ${payload.error.code || "error"}: ${payload.error.message || "Unknown"}`);
    recordSuccess(input.server.id);
    return payload.result;
  } catch (error) {
    recordFailure(input.server.id);
    throw error;
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", abort);
  }
}

export function resetMoodieMcpCircuitForTests() {
  circuits.clear();
}
