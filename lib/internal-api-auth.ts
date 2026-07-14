import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedInternalRequest(
  authorization: string | null,
  expectedSecret: string | undefined,
) {
  if (!expectedSecret || !authorization?.startsWith("Bearer ")) return false;

  const actual = authorization.slice("Bearer ".length);
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expectedSecret);
  if (actualBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(actualBytes, expectedBytes);
}
