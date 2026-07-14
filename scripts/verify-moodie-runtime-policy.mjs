import { readFileSync } from "node:fs";

const engine = readFileSync("lib/moodie/engine.ts", "utf8");
const streamRoute = readFileSync("app/api/moodie/messages/stream/route.ts", "utf8");
const failures = [];

for (const token of [
  "bufferUntilFinal",
  "executionPlan.shouldForceTool",
  "route.research.required",
  'route.orchestration.mode === "background_run"',
  "toolUsedInTurn",
]) {
  if (!engine.includes(token)) failures.push(`engine missing ${token}`);
}
if (!engine.includes("streamedThisStep && !bufferUntilFinal")) {
  failures.push("tool/research steps can still reset visible streamed text");
}
if (!streamRoute.includes("HEARTBEAT_INTERVAL_MS") || !streamRoute.includes("request.signal.aborted")) {
  failures.push("stream route is missing heartbeat or cancellation guard");
}

if (failures.length) {
  console.error("Moodie runtime policy verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Moodie runtime policy verification passed.");
