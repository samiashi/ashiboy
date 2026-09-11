/**
 * Shared Web Audio primitives for every game's sound set. No audio files,
 * works offline. Each game defines its own `SoundName` vocabulary and
 * `playSound` switch on top of `tone`/`noise`.
 *
 * The AudioContext is created/resumed on the first user gesture (required by
 * browser autoplay policies); every player has tapped at least once (the
 * join button) before any sound matters.
 */

const MUTE_KEY = 'ashiboy-muted';

let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Prime the context on any tap, so later network-triggered sounds are allowed.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => audio(), { capture: true, passive: true });
}

export interface ToneOpts {
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slideTo?: number;
}

export function tone(
  freq: number,
  { dur = 0.15, type = 'sine', gain = 0.12, at = 0, slideTo }: ToneOpts = {},
) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function noise(dur = 0.2, cutoff = 800, gain = 0.1, at = 0) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

/**
 * Haptic feedback for key moments. Independent of the mute setting (mute is
 * about sound). Silent no-op where the Vibration API is unavailable.
 */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported — the game works fine without haptics
  }
}
