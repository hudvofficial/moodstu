import { describe, expect, it } from "@jest/globals";
import { extractCompletedSentences } from "@/lib/moodie/voice-sentences";

describe("extractCompletedSentences", () => {
  it("preserves Vietnamese diacritics", () => {
    const text = "Xin ch\u00e0o b\u1ea1n, h\u00f4m nay t\u00f4i c\u00f3 th\u1ec3 gi\u00fap g\u00ec cho b\u1ea1n? C\u1ea3m \u01a1n b\u1ea1n r\u1ea5t nhi\u1ec1u!";

    expect(extractCompletedSentences(text)).toEqual([
      "Xin ch\u00e0o b\u1ea1n, h\u00f4m nay t\u00f4i c\u00f3 th\u1ec3 gi\u00fap g\u00ec cho b\u1ea1n? C\u1ea3m \u01a1n b\u1ea1n r\u1ea5t nhi\u1ec1u!",
    ]);
  });

  it("does not split fenced code blocks", () => {
    const text = "Here is the complete example with enough words to stand alone.\n```ts\nconst first = 1.\nconst second = 2.\nconst third = first + second;\nconsole.log(third);\n```\nThis final explanation is deliberately long enough to remain separate.";

    expect(extractCompletedSentences(text)).toEqual([
      "Here is the complete example with enough words to stand alone.",
      "```ts const first = 1. const second = 2. const third = first + second; console.log(third); ```",
      "This final explanation is deliberately long enough to remain separate.",
    ]);
  });

  it("merges short sentences into the previous sentence", () => {
    const text = "This opening sentence is deliberately long enough to remain separate. Yes. This following sentence is also deliberately long enough to stand separately.";

    expect(extractCompletedSentences(text)).toEqual([
      "This opening sentence is deliberately long enough to remain separate. Yes.",
      "This following sentence is also deliberately long enough to stand separately.",
    ]);
  });

  it("drops the trailing incomplete sentence", () => {
    const text = "This completed sentence contains enough words to remain on its own. This sentence is still streaming";

    expect(extractCompletedSentences(text)).toEqual([
      "This completed sentence contains enough words to remain on its own.",
    ]);
  });

  it("strips basic markdown while preserving link text", () => {
    const text = "# **Welcome** to the [Moodie guide](https://example.com), which contains enough detail to stand alone.";

    expect(extractCompletedSentences(text)).toEqual([
      "Welcome to the Moodie guide, which contains enough detail to stand alone.",
    ]);
  });
});


