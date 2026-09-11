import { useEffect, useRef } from 'react';
import type { Phase, PlayerView } from '@/games/codenames/engine/types';
import { buzz, isMuted, noise, setMuted, tone } from '@/shared/sound-kit';

export { buzz, isMuted, setMuted };

export type SoundName =
  | 'join'
  | 'deal'
  | 'clue'
  | 'flip'
  | 'correct'
  | 'wrong'
  | 'assassin'
  | 'vote'
  | 'win'
  | 'lose'
  | 'tick';

export function playSound(name: SoundName): void {
  if (isMuted()) return;
  switch (name) {
    case 'join':
      tone(660, { dur: 0.07 });
      tone(880, { dur: 0.1, at: 0.07 });
      break;
    case 'deal':
      noise(0.3, 1500, 0.06);
      tone(440, { dur: 0.25, type: 'triangle', gain: 0.09 });
      tone(554, { dur: 0.3, type: 'triangle', gain: 0.09, at: 0.09 });
      break;
    case 'clue':
      tone(523, { dur: 0.12, type: 'triangle' });
      tone(784, { dur: 0.2, type: 'triangle', at: 0.1 });
      break;
    case 'flip':
      noise(0.08, 2500, 0.07);
      break;
    case 'correct':
      tone(659, { dur: 0.14, type: 'triangle' });
      tone(880, { dur: 0.22, type: 'triangle', at: 0.09 });
      break;
    case 'wrong':
      tone(220, { dur: 0.2, type: 'square', gain: 0.08, slideTo: 140 });
      break;
    case 'assassin':
      noise(0.3, 500, 0.18);
      tone(196, { dur: 0.6, type: 'sawtooth', gain: 0.14, slideTo: 49 });
      break;
    case 'vote':
      tone(1250, { dur: 0.03, type: 'square', gain: 0.05 });
      break;
    case 'tick':
      tone(1400, { dur: 0.04, type: 'square', gain: 0.05 });
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
  turnTeam: string;
  clue: string | null;
  winner: string | undefined;
  mine: number;
  theirs: number;
  neutral: number;
}

/** Plays sound effects on view transitions. Call once from the game root. */
export function useCodenamesSounds(view: PlayerView | null): void {
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!view) return;
    const prev = prevRef.current;
    const revealedOf = (kind: string) =>
      view.cards?.filter((c) => c.revealed && c.kind === kind).length ?? 0;
    const other = view.me.team === 'red' ? 'blue' : 'red';
    const snap: Snapshot = {
      phase: view.phase,
      playerCount: view.players.length,
      turnTeam: view.turn?.team ?? '',
      clue: view.turn?.clue ? `${view.turn.clue.word}:${view.turn.clue.number}` : null,
      winner: view.winner,
      mine: view.me.team ? revealedOf(view.me.team) : 0,
      theirs: view.me.team ? revealedOf(other) : 0,
      neutral: revealedOf('bystander'),
    };

    if (prev) {
      if (view.phase === 'lobby' && snap.playerCount > prev.playerCount) playSound('join');

      if (view.phase !== prev.phase) {
        // Entering a fresh board.
        if (view.phase === 'clue' && prev.phase === 'lobby') playSound('deal');
        if (view.phase === 'gameOver') {
          const iWon = view.winner === view.me.team;
          playSound(iWon ? 'win' : 'lose');
        }
      } else if (snap.clue !== prev.clue && snap.clue !== null) {
        playSound('clue');
      } else if (snap.mine > prev.mine) {
        playSound('correct');
      } else if (snap.theirs > prev.theirs || snap.neutral > prev.neutral) {
        playSound('wrong');
      } else if (snap.turnTeam !== prev.turnTeam) {
        playSound('flip');
      }
    }

    prevRef.current = snap;
  }, [view]);
}
