"use client";

const CHIME_NOTES_HZ = [523.25, 659.25];

export function playMoodieConnectedChime(context?: AudioContext) {
  try {
    const audioContext = context ?? new AudioContext();
    const now = audioContext.currentTime;
    CHIME_NOTES_HZ.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const startAt = now + index * 0.12;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.15, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.25);
    });
  } catch {
    // Âm thanh chỉ mang tính báo hiệu — lỗi phát chime không được làm hỏng phiên voice.
  }
}
