function normalizeMoodieGroundingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMoodieMemoryGrounded(memoryContent: string, finalAnswer: string) {
  const memoryTokens = normalizeMoodieGroundingText(memoryContent).split(" ").filter((token) => token.length > 2);
  if (memoryTokens.length === 0) return false;
  const answerTokens = new Set(normalizeMoodieGroundingText(finalAnswer).split(" ").filter((token) => token.length > 2));
  const matched = memoryTokens.filter((token) => answerTokens.has(token)).length;
  return matched / memoryTokens.length >= 0.5;
}

export function summarizeMoodieMemoryGrounding(
  records: Array<{ id: string; content: string }>,
  finalAnswer: string,
) {
  if (records.length === 0) return { retrieved_count: 0, grounded_count: 0 };
  const ungroundedIds: string[] = [];
  let groundedCount = 0;
  for (const record of records) {
    if (isMoodieMemoryGrounded(record.content, finalAnswer)) {
      groundedCount += 1;
    } else {
      ungroundedIds.push(record.id);
    }
  }
  return {
    retrieved_count: records.length,
    grounded_count: groundedCount,
    ungrounded_ids: ungroundedIds.length > 0 ? ungroundedIds : undefined,
  };
}
