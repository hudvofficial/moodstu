import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/(protected)/settings/page.tsx",
  "app/(protected)/settings/studio/page.tsx",
  "app/(protected)/settings/credit-cards/page.tsx",
  "app/actions/settings-queries.ts",
  "app/actions/settings-mutations.ts",
  "lib/validations/settings.schema.ts",
  "lib/settings-secrets.ts",
];

const settingsRoots = ["components/settings", "app/(protected)/settings"];
const findings = [];

function fail(message) {
  findings.push(message);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
    } else if (/\.(tsx?|jsx?)$/.test(path)) {
      files.push(path);
    }
  }
  return files;
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`Missing required file: ${file}`);
}

for (const scanRoot of settingsRoots) {
  const absoluteRoot = join(root, scanRoot);
  if (!existsSync(absoluteRoot)) continue;

  for (const file of walk(absoluteRoot)) {
    const rel = relative(root, file);
    const source = readFileSync(file, "utf8");
    const lineCount = source.split(/\r?\n/).length;

    if (source.includes("style={{")) fail(`${rel}: inline style is not allowed`);
    if (/#(?:[0-9a-fA-F]{3,8})\b/.test(source)) fail(`${rel}: hardcoded hex color`);
    if (source.includes("material-symbols")) fail(`${rel}: material symbols are not allowed`);

    if (rel.startsWith("components/settings/") && lineCount > 280) {
      fail(`${rel}: ${lineCount} lines, split or document exception`);
    }
  }
}

const googleRoute = readFileSync(join(root, "app/api/auth/google/route.ts"), "utf8");
const googleCallback = readFileSync(
  join(root, "app/api/auth/google/callback/route.ts"),
  "utf8",
);
const settingsMutations = readFileSync(join(root, "app/actions/settings-mutations.ts"), "utf8");
const authUtils = readFileSync(join(root, "lib/auth_utils.ts"), "utf8");

if (!googleRoute.includes("requireSettingsAdminAccess")) {
  fail("Google OAuth init route must require settings admin access");
}
if (!googleRoute.includes("state") || !googleCallback.includes("state")) {
  fail("Google OAuth flow must include state validation");
}
if (!googleCallback.includes("requireSettingsAdminAccess")) {
  fail("Google OAuth callback must require settings admin access before DB write");
}
if (!googleCallback.includes("encryptGoogleCalendarAuth")) {
  fail("Google OAuth callback must encrypt stored calendar auth");
}
if (!settingsMutations.includes("encryptSecret")) {
  fail("Moodie Gemini API key writes must be encrypted");
}
if (!authUtils.includes("requireSettingsAdminAccess")) {
  fail("auth_utils must expose a strict settings admin gate");
}

if (findings.length > 0) {
  console.error("Settings verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Settings verification passed.");
