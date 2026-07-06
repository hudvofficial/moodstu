import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const statsPath = path.join(root, ".next", "diagnostics", "route-bundle-stats.json");

// Budget note: Turbopack emits flat-hashed chunk filenames (e.g. `17v9vbcfv8x5a.js`)
// with no per-route subfolder, so there is no way to bucket "app route" chunks by
// path alone (that only works for Webpack's `static/chunks/app/**` layout). Next.js
// still records the real first-load JS per route in this diagnostics file, so we
// read the route -> byte-size mapping directly instead of guessing from paths.
//
// Default threshold: measured baseline (Supabase SDK + Zod + shared app shell,
// present on every protected route) is ~1270KB. 1600KB budget = baseline + ~330KB
// headroom for one reasonably-sized route-specific feature (e.g. a chart library),
// so it flags routes that add a second heavy dependency on top of the shared floor
// without false-alarming on every route.
const limitKb = Number(process.env.PERF_CHUNK_LIMIT_KB || 1600);
const top = Number(process.env.PERF_CHUNK_TOP || 40);

if (!existsSync(statsPath)) {
  console.error("Missing .next/diagnostics/route-bundle-stats.json. Run `npm run build` first.");
  process.exit(1);
}

let stats;
try {
  stats = JSON.parse(readFileSync(statsPath, "utf8"));
} catch (error) {
  console.error(`Failed to parse ${statsPath}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(stats)) {
  console.error(`Unexpected format in ${statsPath}: expected an array of route entries.`);
  process.exit(1);
}

function toRow(entry) {
  const bytes = entry.firstLoadUncompressedJsBytes ?? 0;
  return {
    kb: Number((bytes / 1024).toFixed(1)),
    route: entry.route,
  };
}

const rows = stats.map(toRow).sort((a, b) => b.kb - a.kb);
const overBudgetRoutes = rows.filter((row) => row.kb > limitKb);

console.log(`Top ${top} routes by first-load JS`);
console.table(rows.slice(0, top));

console.log(`Routes over ${limitKb}KB first-load JS`);
if (overBudgetRoutes.length > 0) {
  console.table(overBudgetRoutes);
  process.exitCode = 1;
} else {
  console.log("No routes over budget.");
}
