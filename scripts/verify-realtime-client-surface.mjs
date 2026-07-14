import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "components/**/*.ts", "components/**/*.tsx", "hooks/**/*.ts", "hooks/**/*.tsx"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const failures = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (file.endsWith("hooks/use-realtime.ts") || file.endsWith("hooks/use-realtime-signal.ts")) continue;
  if (/useRealtime\(\s*["'](?!realtime_signals)/.test(source)) {
    failures.push(`${file}: direct useRealtime business-table subscription`);
  }
  for (const match of source.matchAll(/table:\s*["']([a-z_]+)["']/g)) {
    if (source.includes("useRealtimeMulti") && match[1] !== "realtime_signals") {
      failures.push(`${file}: direct multi-table subscription to ${match[1]}`);
    }
  }
}

if (failures.length) {
  console.error("Realtime client surface verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Realtime client surface verification passed.");
