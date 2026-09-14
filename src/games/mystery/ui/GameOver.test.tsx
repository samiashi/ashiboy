// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameOver from '@/games/mystery/ui/GameOver';
import type { PlayerView } from '@/games/mystery/engine/types';

afterEach(() => cleanup());

function gameOverView(solved: boolean): PlayerView {
  return {
    phase: 'gameOver',
    players: [
      { id: 'h', name: 'Host', avatar: '🔍', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
    ],
    me: { id: 'h', name: 'Host', isHost: true },
    caseTitle: 'Murder at the Masquerade',
    victim: 'Lady Evangeline Hart',
    brief: 'A brief.',
    suspects: [
      { id: 'wren', name: 'Wren Halloway', role: 'R', bio: 'B', alibi: 'A', secretRevealed: true },
    ],
    locations: [
      {
        id: 'conservatory',
        name: 'The Conservatory',
        description: 'D',
        searched: true,
        locked: false,
      },
    ],
    weapons: [{ id: 'laudanum', name: 'A vial of laudanum' }],
    clues: [],
    searchLeft: 0,
    pressureLeft: 0,
    attemptsLeft: solved ? 1 : 0,
    attempts: [],
    winner: solved ? 'solved' : 'unsolved',
    stars: solved ? 3 : undefined,
    solution: { suspectId: 'wren', weaponId: 'laudanum', locationId: 'conservatory' },
  };
}

describe('Mystery GameOver', () => {
  it('celebrates a solve with the named truth and rematch', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<GameOver view={gameOverView(true)} send={send} />);

    expect(screen.getByText('Case solved')).toBeTruthy();
    expect(screen.getByText(/Wren Halloway/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Open a new case' }));
    expect(send).toHaveBeenCalledWith({ t: 'playAgain' });
  });

  it('reveals the truth when the trail goes cold', () => {
    render(<GameOver view={gameOverView(false)} send={vi.fn()} />);
    expect(screen.getByText('Trail goes cold')).toBeTruthy();
    expect(screen.getByText(/A vial of laudanum/)).toBeTruthy();
  });
});
