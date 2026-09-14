// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Voting from '@/games/hottake/ui/Voting';
import type { PlayerView } from '@/games/hottake/engine/types';

afterEach(() => cleanup());

function votingView(myVote: number | null = null): PlayerView {
  return {
    phase: 'voting',
    players: [
      { id: 'h', name: 'Host', avatar: '🎤', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
      { id: 'b', name: 'Bob', avatar: '🐼', isHost: false, connected: true },
    ],
    me: { id: 'a', name: 'Ann', isHost: false },
    promptNumber: 1,
    promptsTotal: 3,
    promptText: 'A terrible name for a pet rock:',
    ballot: [
      { seat: 0, text: 'Pebbleina' },
      { seat: 1, text: 'Rocky VII' },
    ],
    myVote,
    voterIds: myVote === null ? [] : ['a'],
  };
}

describe('Hot Take Voting', () => {
  it('votes a ballot seat without naming authors', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Voting view={votingView()} send={send} />);

    expect(screen.queryByText('Ann')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Vote for: Rocky VII' }));
    expect(send).toHaveBeenCalledWith({ t: 'vote', seat: 1 });
  });

  it('marks the picked answer and lets the host close', async () => {
    const send = vi.fn();
    render(<Voting view={votingView(1)} send={send} />);
    expect(
      screen.getByRole('button', { name: 'Vote for: Rocky VII' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('Vote locked in — tap another to switch.')).toBeTruthy();
  });

  it('guests see no host controls', () => {
    render(<Voting view={votingView()} send={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Close voting' })).toBeNull();
  });
});
