export type MoodieTextListItem = {
  text: string;
  label?: string;
  value?: string;
};

export type MoodieTextBlock =
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; language?: string; code: string }
  | { type: "separator" }
  | { type: "callout"; tone: "info" | "warning"; title: string; text: string }
  | { type: "list"; ordered: boolean; items: MoodieTextListItem[] }
  | { type: "table"; headers: string[]; rows: string[][] };

const listPattern = /^([-*]|\d+\.)\s+(.+)$/;
const tableDividerPattern = /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/;
const calloutPattern = /^(lưu ý|chú ý|cảnh báo|quan trọng)\s*:\s*(.*)$/i;

function cleanMarkdownEdge(text: string) {
  return text
    .replace(/^\*\*\s*/, "")
    .replace(/\s*\*\*$/, "")
    .trim();
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanMarkdownEdge(cell.trim()));
}

function isTableStart(lines: string[], index: number) {
  return lines[index]?.includes("|") && tableDividerPattern.test(lines[index + 1]?.trim() || "");
}

export function parseMoodieText(content: string): MoodieTextBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MoodieTextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      blocks.push({ type: "separator" });
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index]);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        const row = splitTableRow(lines[index]);
        if (row.some(Boolean)) rows.push(row);
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const markdownHeading = line.match(/^(#{2,3})\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+?)\*\*\s*:?$/);
    const danglingBoldHeading = line.match(/^\*\*([^\d\s*][^*]*)$/);
    if (markdownHeading || boldHeading || danglingBoldHeading) {
      const marker = markdownHeading?.[1];
      const text = cleanMarkdownEdge(markdownHeading?.[2] || boldHeading?.[1] || danglingBoldHeading?.[1] || "");
      blocks.push({ type: "heading", text, level: marker === "###" ? 3 : 2 });
      index += 1;
      continue;
    }

    const callout = cleanMarkdownEdge(line).match(calloutPattern);
    if (callout) {
      const title = callout[1];
      const textLines = [callout[2]];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isTableStart(lines, index)) {
        textLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push({
        type: "callout",
        tone: /cảnh báo|quan trọng/i.test(title) ? "warning" : "info",
        title,
        text: cleanMarkdownEdge(textLines.filter(Boolean).join(" ")),
      });
      continue;
    }

    const listMatch = line.match(listPattern);
    if (listMatch) {
      const items: MoodieTextListItem[] = [];
      const ordered = /^\d+\./.test(line);
      while (index < lines.length) {
        const nextMatch = lines[index].trim().match(listPattern);
        if (!nextMatch) break;
        const text = cleanMarkdownEdge(nextMatch[2]);
        const labelMatch = text.match(/^([^:]{1,48}):\s*(.+)$/);
        items.push(labelMatch ? { text, label: labelMatch[1].trim(), value: labelMatch[2].trim() } : { text });
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || isTableStart(lines, index) || listPattern.test(next) || next.startsWith("```") || next.startsWith(">") || /^---+$/.test(next)) break;
      if (/^(#{2,3})\s+/.test(next) || /^\*\*.+\*\*\s*:?$/.test(next)) break;
      paragraphLines.push(next);
      index += 1;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: cleanMarkdownEdge(paragraphLines.join(" ")) });
      continue;
    }
    index += 1;
  }

  return blocks;
}
