import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, "package.json");
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const SESSION_PATH = path.join(ROOT, ".brain", "session.json");
const TS_CHANGELOG_PATH = path.join(ROOT, "data", "changelog.ts");
const MD_CHANGELOG_PATH = path.join(ROOT, "CHANGELOG.md");
const TIME_ZONE = "Asia/Saigon";

const CHANGE_TYPE_MAP = new Map([
  ["added", "new"],
  ["add", "new"],
  ["feature", "new"],
  ["new", "new"],
  ["feat", "new"],
  ["bug", "fix"],
  ["bugfix", "fix"],
  ["fix", "fix"],
  ["fixed", "fix"],
  ["hotfix", "fix"],
  ["security", "fix"],
  ["ui", "ui"],
  ["ux", "ui"],
  ["design", "ui"],
  ["style", "ui"],
  ["perf", "perf"],
  ["performance", "perf"],
  ["optimize", "perf"],
  ["optimization", "perf"],
]);

const MARKDOWN_HEADINGS = {
  new: "Added",
  fix: "Fixed",
  ui: "Changed",
  perf: "Performance",
};

function printHelp() {
  console.log(`Usage: node scripts/release.mjs [options]

Options:
  --patch              Bump patch version (default for release)
  --minor              Bump minor version
  --major              Bump major version
  --version <x.y.z>    Set an explicit semantic version
  --no-bump            Keep package version and regenerate changelog only
  --dry-run            Show planned changes without writing files
  --help               Show this help message

Examples:
  npm run release:dry
  npm run release:patch
  npm run release:minor
  npm run changelog:generate`);
}

function parseArgs(argv) {
  const options = {
    bump: "patch",
    explicitVersion: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-bump") {
      options.bump = "none";
    } else if (arg === "--patch") {
      options.bump = "patch";
    } else if (arg === "--minor") {
      options.bump = "minor";
    } else if (arg === "--major") {
      options.bump = "major";
    } else if (arg === "--version") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--version requires a value");
      }
      options.explicitVersion = value;
      options.bump = "explicit";
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value, dryRun) {
  if (dryRun) return;
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureSemver(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
}

function bumpVersion(version, type) {
  ensureSemver(version);

  const [major, minor, patch] = version.split(".").map(Number);

  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  if (type === "patch") return `${major}.${minor}.${patch + 1}`;
  if (type === "none") return version;

  throw new Error(`Unsupported bump type: ${type}`);
}

function todayInTimeZone() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function normalizeChangeType(type) {
  const normalized = String(type ?? "").trim().toLowerCase();
  return CHANGE_TYPE_MAP.get(normalized) ?? "new";
}

function normalizeChangeText(change) {
  const description =
    typeof change.description === "string" ? change.description.trim() : "";
  const notes = typeof change.notes === "string" ? change.notes.trim() : "";

  return description || notes || "Cap nhat he thong";
}

function getSessionChanges(session) {
  const recentChanges = Array.isArray(session.recent_changes)
    ? session.recent_changes
    : [];

  const changes = recentChanges
    .map((change) => ({
      type: normalizeChangeType(change.type),
      text: normalizeChangeText(change),
    }))
    .filter((change) => change.text.length > 0);

  if (changes.length > 0) {
    return dedupeChanges(changes);
  }

  const workingOn = session.working_on ?? {};
  const fallbackText =
    typeof workingOn.notes === "string" && workingOn.notes.trim()
      ? workingOn.notes.trim()
      : typeof workingOn.task === "string" && workingOn.task.trim()
        ? workingOn.task.trim()
        : "Cap nhat he thong";

  return [{ type: "new", text: fallbackText }];
}

function dedupeChanges(changes) {
  const seen = new Set();
  return changes.filter((change) => {
    const key = `${change.type}:${change.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readExistingTsChangelog() {
  if (!fs.existsSync(TS_CHANGELOG_PATH)) return [];

  const source = fs.readFileSync(TS_CHANGELOG_PATH, "utf8");
  const entries = [];
  const entryRegex =
    /\{\s*version:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*changes:\s*\[([\s\S]*?)\],\s*\}/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(source)) !== null) {
    const [, version, date, changesBlock] = entryMatch;
    const changes = [];
    const changeRegex = /\{\s*type:\s*"([^"]+)",\s*text:\s*"((?:\\"|[^"])*)"\s*\}/g;
    let changeMatch;

    while ((changeMatch = changeRegex.exec(changesBlock)) !== null) {
      const [, type, text] = changeMatch;
      changes.push({
        type: normalizeChangeType(type),
        text: JSON.parse(`"${text}"`),
      });
    }

    entries.push({ version, date, changes });
  }

  return entries;
}

function mergeChangelogEntries(nextEntry, existingEntries) {
  const merged = [
    nextEntry,
    ...existingEntries.filter((entry) => entry.version !== nextEntry.version),
  ];

  return merged.slice(0, 20);
}

function renderTsChangelog(entries) {
  const renderedEntries = entries
    .map((entry) => {
      const renderedChanges = entry.changes
        .map(
          (change) =>
            `      { type: ${JSON.stringify(change.type)}, text: ${JSON.stringify(change.text)} },`,
        )
        .join("\n");

      return `  {
    version: ${JSON.stringify(entry.version)},
    date: ${JSON.stringify(entry.date)},
    changes: [
${renderedChanges}
    ],
  }`;
    })
    .join(",\n");

  return `/**
 * WARNING: This file is auto-generated by scripts/release.mjs.
 * Do not edit manually. Add release notes to .brain/session.json -> recent_changes[].
 */
export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  changes: {
    type: "new" | "fix" | "ui" | "perf";
    text: string;
  }[];
}

export const CHANGELOG_EMOJI: Record<string, string> = {
  new: "✨",
  fix: "🐛",
  ui: "🎨",
  perf: "⚡",
};

export const changelog: ChangelogEntry[] = [
${renderedEntries},
];
`;
}

function renderMarkdownSection(entry) {
  const groups = entry.changes.reduce((acc, change) => {
    const heading = MARKDOWN_HEADINGS[change.type] ?? "Changed";
    acc.set(heading, [...(acc.get(heading) ?? []), change.text]);
    return acc;
  }, new Map());

  const sections = [...groups.entries()]
    .map(([heading, changes]) => {
      const items = changes.map((text) => `- ${text}`).join("\n");
      return `### ${heading}\n\n${items}`;
    })
    .join("\n\n");

  return `## [${entry.version}] - ${entry.date}\n\n${sections}\n`;
}

function upsertMarkdownChangelog(entry, dryRun) {
  const nextSection = renderMarkdownSection(entry);
  const current = fs.existsSync(MD_CHANGELOG_PATH)
    ? fs.readFileSync(MD_CHANGELOG_PATH, "utf8")
    : "# Changelog\n";
  const versionHeading = `## [${entry.version}]`;
  let nextContent;

  if (current.includes(versionHeading)) {
    const escaped = entry.version.replaceAll(".", "\\.");
    const sectionRegex = new RegExp(
      `## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}\\n[\\s\\S]*?(?=\\n## \\[|$)`,
    );
    nextContent = current.replace(sectionRegex, `${nextSection.trimEnd()}\n`);
  } else {
    nextContent = current.replace(
      /^# Changelog\s*/u,
      `# Changelog\n\n${nextSection}\n`,
    );
  }

  if (!dryRun) {
    fs.writeFileSync(MD_CHANGELOG_PATH, nextContent.trimEnd() + "\n", "utf8");
  }
}

function updatePackageLock(lock, nextVersion) {
  lock.version = nextVersion;

  if (lock.packages?.[""]) {
    lock.packages[""].version = nextVersion;
  }

  return lock;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const packageJson = readJson(PACKAGE_PATH);
  const packageLock = fs.existsSync(LOCK_PATH) ? readJson(LOCK_PATH) : null;
  const session = fs.existsSync(SESSION_PATH) ? readJson(SESSION_PATH) : {};
  const currentVersion = packageJson.version;
  const nextVersion =
    options.bump === "explicit"
      ? options.explicitVersion
      : bumpVersion(currentVersion, options.bump);

  ensureSemver(nextVersion);

  const date = todayInTimeZone();
  const nextEntry = {
    version: nextVersion,
    date,
    changes: getSessionChanges(session),
  };
  const existingEntries = readExistingTsChangelog();
  const mergedEntries = mergeChangelogEntries(nextEntry, existingEntries);

  console.log(
    `${options.dryRun ? "[dry-run] " : ""}release ${currentVersion} -> ${nextVersion}`,
  );
  console.log(`date: ${date}`);
  console.log(`changes: ${nextEntry.changes.length}`);

  if (options.dryRun) {
    console.log("\nPreview:");
    console.log(renderMarkdownSection(nextEntry).trimEnd());
    return;
  }

  packageJson.version = nextVersion;
  writeJson(PACKAGE_PATH, packageJson, false);

  if (packageLock) {
    writeJson(LOCK_PATH, updatePackageLock(packageLock, nextVersion), false);
  }

  fs.writeFileSync(TS_CHANGELOG_PATH, renderTsChangelog(mergedEntries), "utf8");
  upsertMarkdownChangelog(nextEntry, false);
  console.log("release files updated");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
