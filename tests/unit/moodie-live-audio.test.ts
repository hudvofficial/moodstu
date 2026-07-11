import {
  base64ToBytes,
  bytesToBase64,
  downsampleTo16k,
  nextPlaybackStart,
  parsePcmRate,
} from "@/lib/moodie/live-audio";

describe("moodie live audio", () => {
  it("downsamples 48 kHz audio to 16 kHz with bucket averages", () => {
    const input = new Float32Array([
      -2,
      -1,
      0,
      0.25,
      0.5,
      0.75,
      1,
      1.5,
      2,
    ]);

    expect(Array.from(downsampleTo16k(input, 48_000))).toEqual([
      -32_768,
      16_383,
      32_767,
    ]);
  });

  it("returns the correct sample count for 48 kHz input", () => {
    expect(downsampleTo16k(new Float32Array(4_800), 48_000)).toHaveLength(
      1_600,
    );
  });

  it.each([
    ["audio/pcm;rate=16000", 16_000],
    ["audio/pcm; rate=48000", 48_000],
    ["audio/pcm", 24_000],
    ["application/octet-stream", 24_000],
  ])("parses %s", (mimeType, expected) => {
    expect(parsePcmRate(mimeType)).toBe(expected);
  });

  it("roundtrips bytes through base64", () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("keeps playback at the cursor when it is ahead", () => {
    expect(nextPlaybackStart(1, 2)).toBe(2);
  });

  it("adds a short lead when the cursor is behind", () => {
    expect(nextPlaybackStart(1, 0.5)).toBeCloseTo(1.03);
  });
});
