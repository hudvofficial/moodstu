import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const swPath = join(root, "public", "sw.js");

const devCleanupWorker = `/* Dev-only cleanup worker.
 * next-pwa is disabled in next dev, but a previously generated public/sw.js can
 * keep serving stale production chunks on localhost. This worker unregisters
 * itself and clears old Workbox caches the next time the browser checks /sw.js.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      await self.clients.claim();
    })(),
  );
});
`;

await mkdir(dirname(swPath), { recursive: true });
await writeFile(swPath, devCleanupWorker, "utf8");
