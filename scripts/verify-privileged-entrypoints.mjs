import { readFileSync } from "node:fs";

const checks = [
  {
    file: "app/api/push/send/route.ts",
    required: ["isAuthorizedInternalRequest", "sendPushSchema", "createAdminClient"],
    forbidden: ["origin.includes", "authHeader !=="],
  },
  {
    file: "app/api/moodie/runs/worker/route.ts",
    required: ["isAuthorizedInternalRequest", "createAdminClient"],
  },
  {
    file: "app/api/moodie/memory/maintenance/route.ts",
    required: ["isAuthorizedInternalRequest", "createAdminClient"],
  },
  {
    file: "app/actions/gallery-dimensions-actions.ts",
    required: ["withAdmin", "backfillGalleryDimensionsInternal", "z.string().uuid()"],
    forbidden: ["createAdminClient"],
  },
  {
    file: "app/actions/blurhash-actions.ts",
    required: ["withAdmin", "withAuth", "generateGalleryBlurHash", "z.string().uuid()"],
    forbidden: ["createAdminClient", "fetch("],
  },
  {
    file: "lib/gallery/image-dimensions.ts",
    required: ["isAllowedGalleryImageHost", "isPrivateNetworkAddress", 'redirect: "manual"', "MAX_IMAGE_BYTES"],
  },
];

const failures = [];
for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const token of check.required || []) {
    if (!source.includes(token)) failures.push(`${check.file}: missing ${token}`);
  }
  for (const token of check.forbidden || []) {
    if (source.includes(token)) failures.push(`${check.file}: forbidden ${token}`);
  }
}

if (failures.length) {
  console.error("Privileged entrypoint verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Privileged entrypoint verification passed.");
