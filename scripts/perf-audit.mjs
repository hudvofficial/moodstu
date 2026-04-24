import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components", "hooks", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const allowedRouterRefresh = [
  /^hooks[\\/]use-realtime\.ts$/,
  /^components[\\/]settings[\\/]/,
];

const allowedReload = [
  /^app[\\/]offline[\\/]page\.tsx$/,
  /^components[\\/]moodie[\\/]moodie-page-client\.tsx$/,
];

const heavyStaticImports = [
  {
    name: "html2pdf.js",
    pattern: /from\s+["']html2pdf\.js["']|import\s+["']html2pdf\.js["']/,
  },
  {
    name: "qr-scanner",
    pattern: /from\s+["']qr-scanner["']|import\s+["']qr-scanner["']/,
  },
  {
    name: "qr-code-styling",
    pattern: /from\s+["']qr-code-styling["']|import\s+["']qr-code-styling["']/,
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
      continue;
    }
    const ext = path.slice(path.lastIndexOf("."));
    if (extensions.has(ext)) files.push(path);
  }
  return files;
}

function isAllowed(rel, allowlist) {
  return allowlist.some((pattern) => pattern.test(rel));
}

const findings = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = join(root, scanRoot);
  let files = [];
  try {
    files = walk(absoluteRoot);
  } catch {
    continue;
  }

  for (const file of files) {
    const rel = relative(root, file);
    const source = readFileSync(file, "utf8");

    if (source.includes("router.refresh()") && !isAllowed(rel, allowedRouterRefresh)) {
      findings.push(`${rel}: avoid broad router.refresh(); use SWR/cache invalidation.`);
    }

    if (source.includes("window.location.reload()") && !isAllowed(rel, allowedReload)) {
      findings.push(`${rel}: avoid window.location.reload(); use targeted state/cache update.`);
    }

    for (const rule of heavyStaticImports) {
      if (rule.pattern.test(source)) {
        findings.push(`${rel}: ${rule.name} must be loaded dynamically after user intent.`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Performance audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Performance audit passed.");
