// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameOver from '@/games/codenames/ui/GameOver';
import HowToPlay from '@/games/codenames/ui/HowToPlay';
import type { PlayerView } from '@/games/codenames/engine/types';

afterEach(() => cleanup());

const view: PlayerView = {
  phase: 'gameOver',
  players: [
    {
      id: 'h',
      name: 'Host',
      avatar: '🦊',
      team: 'red',
      isSpymaster: true,
      isHost: true,
      connected: true,
    },
    {
      id: 'a',
      name: 'Ann',
      avatar: '🐼',
      team: 'blue',
      isSpymaster: false,
      isHost: false,
      connected: true,
    },
  ],
  me: { id: 'h', name: 'Host', avatar: '🦊', team: 'red', isSpymaster: true, isHost: true },
  winner: 'red',
  clues: [{ team: 'red', word: 'FRUIT', number: 2 }],
  startingTeam: 'red',
  remaining: { red: 0, blue: 3 },
};

describe('Codenames GameOver', () => {
  it('declares the winner and offers a rematch', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<GameOver view={view} send={send} />);

    expect(screen.getByText('Red wins')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rematch — same teams' }));
    expect(send).toHaveBeenCalledWith({ t: 'playAgain' });
  });

  it('lets the host rotate spymasters via the lobby', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<GameOver view={view} send={send} />);

    await user.click(screen.getByRole('button', { name: 'Change spymasters' }));
    expect(send).toHaveBeenCalledWith({ t: 'toLobby' });
  });
});

describe('Codenames HowToPlay', () => {
  it('explains clues, guesses, and the assassin', () => {
    render(<HowToPlay />);
    expect(screen.getByText(/Two teams race/)).toBeTruthy();
    expect(screen.getByText(/assassin/)).toBeTruthy();
  });
});
