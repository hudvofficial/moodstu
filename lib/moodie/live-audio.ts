export function downsampleTo16k(
  input: Float32Array,
  sourceRate: number,
): Int16Array {
  if (sourceRate <= 0) {
    return new Int16Array(0);
  }

  const targetRate = 16_000;
  const outputLength = Math.floor((input.length * targetRate) / sourceRate);
  const output = new Int16Array(outputLength);
  const ratio = sourceRate / targetRate;

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(Math.floor((outputIndex + 1) * ratio), input.length);
    let sum = 0;
    let count = 0;

    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += input[inputIndex];
      count += 1;
    }

    const average = count > 0 ? sum / count : 0;
    const sample = Math.max(-1, Math.min(1, average));
    output[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

export function parsePcmRate(mimeType: string): number {
  const match = /(?:^|;)\s*rate=(\d+)/i.exec(mimeType);
  return match ? Number.parseInt(match[1], 10) : 24_000;
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function nextPlaybackStart(currentTime: number, cursor: number): number {
  return Math.max(currentTime + 0.03, cursor);
}
