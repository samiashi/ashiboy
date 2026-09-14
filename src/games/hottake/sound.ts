import { useEffect, useRef } from 'react';
import type { Phase, PlayerView } from '@/games/hottake/engine/types';
import { buzz, isMuted, noise, setMuted, tone } from '@/shared/sound-kit';

export { buzz, isMuted, setMuted };

export type SoundName =
  'join' | 'deal' | 'submit' | 'ballot' | 'vote' | 'reveal' | 'win' | 'lose' | 'tick' | 'time';

export function playSound(name: SoundName): void {
  if (isMuted()) return;
  switch (name) {
    case 'join':
      tone(660, { dur: 0.07 });
      tone(880, { dur: 0.1, at: 0.07 });
      break;
    case 'deal':
      // Fresh prompt lands.
      noise(0.12, 2000, 0.08);
      tone(587, { dur: 0.18, type: 'triangle', gain: 0.1 });
      break;
    case 'submit':
      // Pencil down.
      noise(0.06, 3000, 0.06);
      tone(740, { dur: 0.08, type: 'triangle', gain: 0.07 });
      break;
    case 'ballot':
      // The anonymous ballot opens.
      tone(523, { dur: 0.12, type: 'triangle' });
      tone(659, { dur: 0.12, type: 'triangle', at: 0.09 });
      tone(784, { dur: 0.2, type: 'triangle', at: 0.18 });
      break;
    case 'vote':
      tone(1250, { dur: 0.03, type: 'square', gain: 0.05 });
      break;
    case 'reveal':
      // Authorship revealed.
      tone(392, { dur: 0.14, type: 'triangle' });
      tone(523, { dur: 0.14, type: 'triangle', at: 0.1 });
      tone(659, { dur: 0.24, type: 'triangle', at: 0.2 });
      break;
    case 'tick':
      tone(1400, { dur: 0.04, type: 'square', gain: 0.05 });
      break;
    case 'time':
      // Clock ran out — soft chime, no punishment.
      tone(880, { dur: 0.3, type: 'triangle', gain: 0.08 });
      tone(660, { dur: 0.4, type: 'triangle', gain: 0.08, at: 0.2 });
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
  submitted: number;
  voters: number;
  winners: string;
}

/** Plays sound effects on view transitions. Call once from the game root. */
export function useHotTakeSounds(view: PlayerView | null): void {
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!view) return;
    const snap: Snapshot = {
      phase: view.phase,
      playerCount: view.players.length,
      submitted: view.submittedIds?.length ?? 0,
      voters: view.voterIds?.length ?? 0,
      winners: (view.winners ?? []).map((w) => w.id).join(','),
    };
    const prev = prevRef.current;

    if (prev) {
      if (view.phase === 'lobby' && snap.playerCount > prev.playerCount) playSound('join');

      if (view.phase !== prev.phase) {
        if (view.phase === 'answering') playSound('deal');
        else if (view.phase === 'voting') playSound('ballot');
        else if (view.phase === 'scoreboard') playSound('reveal');
        else if (view.phase === 'gameOver') {
          playSound(view.winners?.some((w) => w.id === view.me.id) ? 'win' : 'lose');
        }
      } else if (snap.submitted > prev.submitted) {
        playSound('submit');
      } else if (snap.voters > prev.voters) {
        playSound('vote');
      }
    }

    prevRef.current = snap;
  }, [view]);
}
