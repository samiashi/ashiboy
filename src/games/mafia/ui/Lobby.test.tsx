// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lobby from '@/games/mafia/ui/Lobby';
import type { PlayerView, PublicPlayer } from '@/games/mafia/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
  { id: 'h', name: 'Host', avatar: '🦊', isHost: true, connected: true, alive: true, ready: false },
  { id: 'a', name: 'Ann', avatar: '🐼', isHost: false, connected: true, alive: true, ready: false },
  { id: 'b', name: 'Bob', avatar: '🐸', isHost: false, connected: true, alive: true, ready: false },
  { id: 'c', name: 'Cat', avatar: '🦁', isHost: false, connected: true, alive: true, ready: false },
];

function lobbyView(me: string, playerList: PublicPlayer[] = players): PlayerView {
  const self = playerList.find((p) => p.id === me)!;
  return {
    phase: 'lobby',
    round: 0,
    players: playerList,
    me: { id: self.id, name: self.name, isHost: self.isHost, alive: true },
    config: { mafiaCount: 1, hasDetective: true, hasDoctor: true },
  };
}

describe('Lobby', () => {
  it('shows the room code, roster, and a working start button for the host', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Deal roles & start' });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(send).toHaveBeenCalledWith({ t: 'start' });
  });

  it('adjusts the mafia count through the stepper', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    await user.click(screen.getByText('+'));
    expect(send).toHaveBeenCalledWith({
      t: 'setConfig',
      config: { mafiaCount: 2, hasDetective: true, hasDoctor: true },
    });
  });

  it('blocks starting below 3 players', () => {
    render(<Lobby view={lobbyView('h', players.slice(0, 2))} roomCode="ABC123" send={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Need at least 1 more player' })).toBeDisabled();
  });

  it('shows guests a waiting message instead of controls', () => {
    render(<Lobby view={lobbyView('a')} roomCode="ABC123" send={vi.fn()} />);
    expect(screen.getByText(/Waiting for the host to start/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deal roles & start' })).toBeNull();
  });

  it('lets the host remove other seats', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    const removes = screen.getAllByRole('button', { name: 'Remove' });
    expect(removes).toHaveLength(3); // everyone except the host
    await user.click(removes[0]);
    expect(send).toHaveBeenCalledWith({ t: 'remove', targetId: 'a' });
  });
});
