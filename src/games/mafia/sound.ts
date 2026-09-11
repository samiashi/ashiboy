import { useEffect, useRef } from 'react';
import type { Phase, PlayerView } from '@/games/mafia/engine/types';

/**
 * All sounds are synthesized with the Web Audio API — no audio files,
 * works offline. The AudioContext is created/resumed on the first user
 * gesture (required by browser autoplay policies); every player has tapped
 * at least once (the join button) before any sound matters.
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

interface ToneOpts {
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slideTo?: number;
}

function tone(
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

function noise(dur = 0.2, cutoff = 800, gain = 0.1, at = 0) {
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

export type SoundName =
  'join' | 'role' | 'night' | 'death' | 'peace' | 'gavel' | 'vote' | 'thud' | 'win' | 'lose';

export function playSound(name: SoundName): void {
  if (muted) return;
  switch (name) {
    case 'join':
      tone(660, { dur: 0.07 });
      tone(880, { dur: 0.1, at: 0.07 });
      break;
    case 'role':
      noise(0.35, 1200, 0.05);
      tone(392, { dur: 0.3, type: 'triangle', gain: 0.08 });
      tone(523, { dur: 0.4, type: 'triangle', gain: 0.08, at: 0.1 });
      break;
    case 'night':
      tone(146.8, { dur: 0.9, gain: 0.14 });
      tone(138.6, { dur: 0.9, gain: 0.1 });
      noise(0.6, 300, 0.03);
      break;
    case 'death':
      noise(0.25, 500, 0.18);
      tone(220, { dur: 0.5, type: 'sawtooth', gain: 0.14, slideTo: 55 });
      break;
    case 'peace':
      tone(523, { dur: 0.18, type: 'triangle' });
      tone(659, { dur: 0.3, type: 'triangle', at: 0.12 });
      break;
    case 'gavel':
      tone(180, { dur: 0.07, type: 'square', gain: 0.16 });
      tone(180, { dur: 0.07, type: 'square', gain: 0.16, at: 0.12 });
      break;
    case 'vote':
      tone(1250, { dur: 0.03, type: 'square', gain: 0.05 });
      break;
    case 'thud':
      tone(95, { dur: 0.3, gain: 0.2 });
      noise(0.15, 300, 0.1);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, { dur: 0.16, type: 'triangle', at: i * 0.11 }),
      );
      break;
    case 'lose':
      [392, 370, 349, 311].forEach((f, i) => tone(f, { dur: 0.24, gain: 0.09, at: i * 0.16 }));
      break;
  }
}

interface Snapshot {
  phase: Phase;
  playerCount: number;
  votesCast: number;
  myVote: string | null | undefined;
}

/** Plays sound effects on view transitions. Call once from the game root. */
export function useMafiaSounds(view: PlayerView | null): void {
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!view) return;
    const prev = prevRef.current;
    const snap: Snapshot = {
      phase: view.phase,
      playerCount: view.players.length,
      votesCast: Object.keys(view.votes ?? {}).length,
      myVote: view.myVote,
    };

    if (prev) {
      if (view.phase === 'lobby' && snap.playerCount > prev.playerCount) playSound('join');

      if (view.phase !== prev.phase) {
        switch (view.phase) {
          case 'roleReveal':
            playSound('role');
            buzz(20);
            break;
          case 'night':
            playSound('night');
            break;
          case 'dayReveal':
            if (view.lastNight?.diedId) {
              playSound('death');
              buzz([60, 40, 60]);
            } else {
              playSound('peace');
            }
            break;
          case 'voting':
            playSound('gavel');
            buzz([15, 30, 15]);
            break;
          case 'voteResult':
            if (view.lastVote?.eliminatedId) {
              playSound('thud');
              buzz(50);
            } else {
              playSound('peace');
            }
            break;
          case 'gameOver': {
            const iWon = (view.winner === 'mafia') === (view.me.role === 'mafia');
            playSound(iWon ? 'win' : 'lose');
            buzz(iWon ? [25, 50, 25, 50, 90] : 70);
            break;
          }
          default:
            break;
        }
      } else if (
        view.phase === 'voting' &&
        ((view.myVote !== prev.myVote && view.myVote !== undefined) ||
          snap.votesCast > prev.votesCast)
      ) {
        playSound('vote');
        buzz(10);
      }
    }

    prevRef.current = snap;
  }, [view]);
}
