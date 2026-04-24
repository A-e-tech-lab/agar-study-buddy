// Lightweight Web Audio chime — no assets, no network.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Must be called from a user gesture (click) to unlock audio on iOS/Safari. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

function tone(c: AudioContext, freq: number, start: number, duration: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Pleasant 3-note rising chime (C5, E5, G5). */
export function playReminderChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  tone(c, 523.25, 0, 0.5);
  tone(c, 659.25, 0.18, 0.5);
  tone(c, 783.99, 0.36, 0.7);
}

/** Short cheerful blip for task completion. */
export function playSuccessChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  tone(c, 659.25, 0, 0.18);
  tone(c, 987.77, 0.1, 0.3);
}
