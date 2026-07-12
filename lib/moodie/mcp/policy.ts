const PRIVATE_QUERY_PATTERNS = [
  /\b(?:sk|pk|rk)-[a-z0-9_-]{12,}\b/gi,
  /\b(?:api[_ -]?key|password|secret|token|bearer)\s*[:=]\s*\S+/gi,
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
  /\b(?:\+?84|0)\d{8,10}\b/g,
  /\b\d{9,16}\b/g,
];

const INJECTION_PATTERNS = [
  /ignore (?:all |any )?(?:previous|prior) instructions?/i,
  /system prompt/i,
  /developer message/i,
  /reveal (?:your |the )?(?:prompt|secret|credentials?)/i,
  /do not cite/i,
  /tool call/i,
];

export function redactMoodieResearchQuery(query: string) {
  let redacted = query.replace(/\s+/g, " ").trim().slice(0, 500);
  for (const pattern of PRIVATE_QUERY_PATTERNS) redacted = redacted.replace(pattern, "[REDACTED]");
  return redacted;
}

/** Brave Search accepts at most 50 words and 400 characters for `q`. */
export function normalizeBraveSearchQuery(query: string) {
  const redacted = redactMoodieResearchQuery(query);
  const words = redacted.split(" ").filter(Boolean).slice(0, 50);
  return words.join(" ").slice(0, 400).trim();
}

export function isUnsafeResearchContent(value: string) {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeResearchText(value: unknown, maxLength = 1200) {
  if (typeof value !== "string") return "";
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  if (isUnsafeResearchContent(clean)) return "[Content omitted by research safety policy]";
  return clean.slice(0, maxLength);
}

export function isAllowedResearchUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0" && host !== "::1"
      && !host.endsWith(".local") && !/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch {
    return false;
  }
}
