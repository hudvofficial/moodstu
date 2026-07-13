import { isMoodieWakePhrase } from "@/hooks/use-moodie-wake-phrase";

describe("Moodie wake phrase", () => {
  it.each([
    "Hey Moodie",
    "hey moody",
    "Hê mudi",
    "Này, hey Moodie!",
  ])("recognizes %s", (phrase) => {
    expect(isMoodieWakePhrase(phrase)).toBe(true);
  });

  it.each([
    "Moodie",
    "hey studio",
    "hôm nay mood thế nào",
  ])("ignores %s", (phrase) => {
    expect(isMoodieWakePhrase(phrase)).toBe(false);
  });
});
