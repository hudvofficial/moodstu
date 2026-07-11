const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+|\n+/;
const COMPLETED_END_PATTERN = /[.!?]\s*$/;

function stripMarkdownForTts(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/^\[[^\]]+\]:\s*.*$/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSentences(text: string): string[] {
  const codeBlocks: string[] = [];
  const protectedText = text.replace(CODE_BLOCK_PATTERN, (match) => {
    const placeholder = `\u0000${codeBlocks.length}\u0000`;
    codeBlocks.push(match);
    return placeholder;
  });

  return protectedText
    .split(SENTENCE_BOUNDARY_PATTERN)
    .map((sentence) =>
      sentence.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codeBlocks[Number(index)] ?? ""),
    )
    .map(stripMarkdownForTts)
    .filter(Boolean);
}

function mergeShortSentences(sentences: string[]): string[] {
  return sentences.reduce<string[]>((mergedSentences, currentSentence) => {
    const wordCount = currentSentence.split(/\s+/).length;
    const isShort = wordCount < 4 || currentSentence.length < 50;
    const previousIndex = mergedSentences.length - 1;

    if (previousIndex >= 0 && isShort) {
      mergedSentences[previousIndex] = `${mergedSentences[previousIndex]} ${currentSentence}`;
    } else {
      mergedSentences.push(currentSentence);
    }

    return mergedSentences;
  }, []);
}

export function extractCompletedSentences(streamedText: string): string[] {
  const sentences = extractSentences(streamedText);
  if (!COMPLETED_END_PATTERN.test(streamedText)) {
    sentences.pop();
  }

  return mergeShortSentences(sentences);
}
