// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameOver from '@/games/hottake/ui/GameOver';
import Scoreboard from '@/games/hottake/ui/Scoreboard';
import type { PlayerView } from '@/games/hottake/engine/types';

afterEach(() => cleanup());

const players = [
  { id: 'h', name: 'Host', avatar: '🎤', isHost: true, connected: true },
  { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
];

function scoreboardView(): PlayerView {
  return {
    phase: 'scoreboard',
    players,
    me: { id: 'h', name: 'Host', isHost: true },
    promptNumber: 1,
    promptsTotal: 2,
    promptText: 'A terrible name for a pet rock:',
    lastResult: {
      promptId: 'p02',
      promptText: 'A terrible name for a pet rock:',
      entries: [
        { authorId: 'a', authorName: 'Ann', text: 'Pebbleina', votes: 1 },
        { authorId: 'h', authorName: 'Host', text: 'Rocky VII', votes: 0 },
      ],
      voterCount: 1,
    },
    scores: [
      { id: 'a', name: 'Ann', score: 100 },
      { id: 'h', name: 'Host', score: 0 },
    ],
  };
}

describe('Hot Take Scoreboard', () => {
  it('reveals authors with votes and advances', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Scoreboard view={scoreboardView()} send={send} />);

    expect(screen.getByText(/Pebbleina/)).toBeTruthy();
    expect(screen.getByText(/Ann · 100 pts/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next prompt' }));
    expect(send).toHaveBeenCalledWith({ t: 'advance' });
  });
});

describe('Hot Take GameOver', () => {
  it('crowns the winner with history and rematch', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const view: PlayerView = {
      ...scoreboardView(),
      phase: 'gameOver',
      history: [scoreboardView().lastResult!],
      winners: [{ id: 'a', name: 'Ann' }],
    };
    render(<GameOver view={view} send={send} />);

    expect(screen.getByText('Crowned')).toBeTruthy();
    expect(screen.getByText(/Ann takes the night/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rematch — fresh prompts' }));
    expect(send).toHaveBeenCalledWith({ t: 'playAgain' });
  });
});
