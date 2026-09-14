import { useEffect, useRef } from 'react';
import type { Phase, PlayerView } from '@/games/mystery/engine/types';
import { buzz, isMuted, noise, setMuted, tone } from '@/shared/sound-kit';

export { buzz, isMuted, setMuted };

export type SoundName =
  'join' | 'case' | 'unfold' | 'clue' | 'reveal' | 'verdict' | 'win' | 'lose' | 'tick' | 'time';

export function playSound(name: SoundName): void {
  if (isMuted()) return;
  switch (name) {
    case 'join':
      tone(660, { dur: 0.07 });
      tone(880, { dur: 0.1, at: 0.07 });
      break;
    case 'case':
      // Case file stamped open.
      noise(0.12, 2000, 0.08);
      tone(392, { dur: 0.2, type: 'triangle', gain: 0.1 });
      tone(523, { dur: 0.28, type: 'triangle', gain: 0.1, at: 0.1 });
      break;
    case 'unfold':
      // New phase unfolds.
      noise(0.2, 1200, 0.06);
      tone(494, { dur: 0.18, type: 'triangle', gain: 0.09 });
      break;
    case 'clue':
      // Clue pinned to the board.
      tone(784, { dur: 0.1, type: 'triangle' });
      tone(1047, { dur: 0.18, type: 'triangle', at: 0.07 });
      break;
    case 'reveal':
      // A suspect cracks under pressure.
      tone(330, { dur: 0.16, type: 'sawtooth', gain: 0.08, slideTo: 495 });
      break;
    case 'verdict':
      // Gavel slam.
      noise(0.12, 400, 0.2);
      tone(180, { dur: 0.3, gain: 0.12, slideTo: 90 });
      break;
    case 'tick':
      tone(1400, { dur: 0.04, type: 'square', gain: 0.05 });
      break;
    case 'time':
      // Search clock ran out — soft chime, no punishment.
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
  clues: number;
  secrets: number;
  attempts: number;
  winner: string | undefined;
}

/** Plays sound effects on view transitions. Call once from the game root. */
export function useMysterySounds(view: PlayerView | null): void {
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!view) return;
    const snap: Snapshot = {
      phase: view.phase,
      playerCount: view.players.length,
      clues: view.clues?.length ?? 0,
      secrets: view.suspects?.filter((s) => s.secretRevealed).length ?? 0,
      attempts: view.attempts?.length ?? 0,
      winner: view.winner,
    };
    const prev = prevRef.current;

    if (prev) {
      if (view.phase === 'lobby' && snap.playerCount > prev.playerCount) playSound('join');

      if (view.phase !== prev.phase) {
        if (view.phase === 'briefing') playSound('case');
        else if (
          view.phase === 'search' ||
          view.phase === 'alibis' ||
          view.phase === 'accusation'
        ) {
          playSound('unfold');
        } else if (view.phase === 'gameOver') {
          playSound(view.winner === 'solved' ? 'win' : 'lose');
        }
      } else if (snap.clues > prev.clues) {
        playSound('clue');
      } else if (snap.secrets > prev.secrets) {
        playSound('reveal');
      } else if (snap.attempts > prev.attempts) {
        playSound('verdict');
      }
    }

    prevRef.current = snap;
  }, [view]);
}
