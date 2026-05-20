export type UiSound = "tap" | "confirm" | "card" | "select" | "error" | "trick" | "advance";

type SoundStep = {
  frequency: number;
  duration: number;
  delay: number;
  type: OscillatorType;
};

const SOUND_PATTERNS: Record<UiSound, SoundStep[]> = {
  tap: [{ frequency: 420, duration: 0.045, delay: 0, type: "triangle" }],
  select: [
    { frequency: 360, duration: 0.035, delay: 0, type: "sine" },
    { frequency: 540, duration: 0.045, delay: 0.035, type: "triangle" },
  ],
  confirm: [
    { frequency: 440, duration: 0.04, delay: 0, type: "triangle" },
    { frequency: 660, duration: 0.065, delay: 0.045, type: "triangle" },
  ],
  card: [
    { frequency: 760, duration: 0.035, delay: 0, type: "triangle" },
    { frequency: 520, duration: 0.055, delay: 0.025, type: "sine" },
  ],
  trick: [
    { frequency: 520, duration: 0.045, delay: 0, type: "square" },
    { frequency: 700, duration: 0.055, delay: 0.04, type: "triangle" },
    { frequency: 880, duration: 0.07, delay: 0.095, type: "triangle" },
  ],
  advance: [
    { frequency: 420, duration: 0.04, delay: 0, type: "sine" },
    { frequency: 300, duration: 0.05, delay: 0.035, type: "triangle" },
  ],
  error: [
    { frequency: 180, duration: 0.055, delay: 0, type: "sawtooth" },
    { frequency: 140, duration: 0.07, delay: 0.055, type: "sawtooth" },
  ],
};

let audioContext: AudioContext | null = null;

export function getUiSoundPattern(sound: UiSound): SoundStep[] {
  return SOUND_PATTERNS[sound].map((step) => ({ ...step }));
}

export function playUiSound(sound: UiSound) {
  if (typeof window === "undefined") return;

  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) return;

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const startedAt = audioContext.currentTime;
    for (const step of SOUND_PATTERNS[sound]) {
      playStep(audioContext, step, startedAt);
    }
  } catch {
    audioContext = null;
  }
}

function playStep(context: AudioContext, step: SoundStep, startedAt: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = startedAt + step.delay;
  const end = start + step.duration;

  oscillator.type = step.type;
  oscillator.frequency.setValueAtTime(step.frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.065, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.01);
}
