import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TEXT_FILE_PATTERN = /\.(?:cjs|css|html|js|jsx|json|md|mjs|sql|ts|tsx|txt)$/i;
const EXCLUDED_PREFIXES = [
  ".agents/",
  ".brain/",
  ".codex/",
  ".engram/",
  ".openclaw/",
  ".next/",
  "data/code-index/",
  "node_modules/",
  "tmp/",
];
const INTENTIONAL_SIGNATURE_FILES = new Set([
  "plans/260711-fix-historical-mojibake/plan.md",
  "plans/260711-moodie-voice/PHASE1-TASK.md",
  "plans/260711-moodie-voice/PHASE2-TASK.md",
  "plans/260711-moodie-voice/PLAN.md",
  "plans/260711-moodie-voice/STATUS.md",
]);

const suspiciousPatterns = [
  { label: "replacement character U+FFFD", pattern: /\uFFFD/u },
  { label: "C1 control character", pattern: /[\u0080-\u009F]/u },
  { label: "UTF-8 decoded as Windows-1252", pattern: /\u00C3[\u0080-\u00BF]/u },
  { label: "stray Latin-1 continuation", pattern: /\u00C2[\u0080-\u00BF]/u },
  { label: "corrupted Vietnamese D", pattern: /\u00C4(?:[\u0080-\u00BF]|[\u2018\u2019])/u },
  { label: "corrupted Vietnamese tone sequence", pattern: /\u00E1[\u00BA\u00BB]/u },
  { label: "corrupted Vietnamese horn sequence", pattern: /\u00C6[\u0080-\u00BF]/u },
  { label: "multi-pass Vietnamese mojibake", pattern: /\u0102(?:[\u0080-\u00FF]|[\u2018\u2019\u201A\u201E])/u },
  { label: "corrupted punctuation/arrow sequence", pattern: /\u00E2(?:[\u0080-\u00FF]|[\u20AC\u201A\u201E\u2020\u2021\u2026\u2122\u0153])/u },
];

const trackedAndUntracked = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"));

const files = trackedAndUntracked.filter((file) => {
  if (!TEXT_FILE_PATTERN.test(file)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  if (INTENTIONAL_SIGNATURE_FILES.has(file)) return false;
  return true;
});

const failures = [];
for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  source.split(/\r?\n/u).forEach((line, index) => {
    for (const entry of suspiciousPatterns) {
      if (!entry.pattern.test(line)) continue;
      failures.push({
        file,
        line: index + 1,
        label: entry.label,
        context: line.trim().slice(0, 180),
      });
      break;
    }
  });
}

if (failures.length > 0) {
  console.error(`UTF-8 verification failed with ${failures.length} suspicious line(s):`);
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} [${failure.label}] ${failure.context}`);
  }
  process.exit(1);
}

console.log(`UTF-8 verification passed for ${files.length} source/text file(s).`);
