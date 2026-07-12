import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createMoodieConfirmationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashMoodieConfirmationToken(token) };
}

export function hashMoodieConfirmationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyMoodieConfirmationToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashMoodieConfirmationToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
