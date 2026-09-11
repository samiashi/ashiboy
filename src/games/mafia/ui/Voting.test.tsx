// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Voting from '@/games/mafia/ui/Voting';
import type { PlayerView, PublicPlayer } from '@/games/mafia/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
  { id: 'a', name: 'Ann', avatar: '🦊', isHost: true, connected: true, alive: true, ready: false },
  { id: 'b', name: 'Bob', avatar: '🐼', isHost: false, connected: true, alive: true, ready: false },
  { id: 'c', name: 'Cat', avatar: '🐸', isHost: false, connected: true, alive: true, ready: false },
  { id: 'd', name: 'Dan', avatar: '🦁', isHost: false, connected: true, alive: true, ready: false },
];

function votingView(votes: Record<string, string | null> = {}, me = 'a'): PlayerView {
  const self = players.find((p) => p.id === me)!;
  return {
    phase: 'voting',
    round: 1,
    players,
    me: { id: self.id, name: self.name, isHost: self.isHost, alive: true, role: 'villager' },
    votes,
    myVote: votes[me],
    lastNight: { diedId: undefined },
  };
}

describe('Voting', () => {
  it('votes for a candidate on tap', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Voting view={votingView()} send={send} />);

    await user.click(screen.getByRole('button', { name: '🐼 Bob' }));
    expect(send).toHaveBeenCalledWith({ t: 'vote', targetId: 'b' });
  });

  it('abstains on tap', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Voting view={votingView()} send={send} />);

    await user.click(screen.getByRole('button', { name: 'Abstain' }));
    expect(send).toHaveBeenCalledWith({ t: 'vote', targetId: null });
  });

  it('shows the live ballot and tally', () => {
    render(<Voting view={votingView({ b: 'c', d: 'c' })} send={vi.fn()} />);

    expect(screen.getByText('Ballot (2/4)')).toBeTruthy();
    const counts = document.querySelectorAll('.tally-count');
    expect(counts).toHaveLength(1);
    expect(counts[0].textContent).toBe('2');
  });

  it('offers the host a close-vote escape hatch when voters are missing', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Voting view={votingView({ b: 'c' })} send={send} />);

    const close = screen.getByRole('button', { name: /Close the vote now/ });
    await user.click(close);
    expect(send).toHaveBeenCalledWith({ t: 'closeVote' });
  });

  it('shows dead players a spectator message', () => {
    const view = votingView();
    render(<Voting view={{ ...view, me: { ...view.me, alive: false } }} send={vi.fn()} />);
    expect(screen.getByText(/watching the vote/)).toBeTruthy();
  });
});
