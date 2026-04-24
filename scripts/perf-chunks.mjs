import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const chunksDir = path.join(root, ".next", "static", "chunks");
const limitKb = Number(process.env.PERF_CHUNK_LIMIT_KB || 80);
const top = Number(process.env.PERF_CHUNK_TOP || 40);

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function toRow(file) {
  const sizeKb = statSync(file).size / 1024;
  return {
    kb: Number(sizeKb.toFixed(1)),
    path: path.relative(root, file).replaceAll(path.sep, "/"),
  };
}

if (!existsSync(chunksDir)) {
  console.error("Missing .next/static/chunks. Run `npm run build` first.");
  process.exit(1);
}

const rows = walk(chunksDir)
  .filter((file) => file.endsWith(".js"))
  .map(toRow)
  .sort((a, b) => b.kb - a.kb);

const pageRows = rows.filter((row) => row.path.includes("/app/"));
const overBudgetPages = pageRows.filter((row) => row.kb > limitKb);

console.log(`Top ${top} JS chunks`);
console.table(rows.slice(0, top));

console.log(`App route chunks over ${limitKb}KB`);
if (overBudgetPages.length > 0) {
  console.table(overBudgetPages);
  process.exitCode = 1;
} else {
  console.log("No app route chunks over budget.");
}

