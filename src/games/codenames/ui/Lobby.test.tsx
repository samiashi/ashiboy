// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lobby from '@/games/codenames/ui/Lobby';
import type { PlayerView, PublicPlayer } from '@/games/codenames/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
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
    team: 'red',
    isSpymaster: false,
    isHost: false,
    connected: true,
  },
  {
    id: 'c',
    name: 'Cat',
    avatar: '🐸',
    team: 'blue',
    isSpymaster: true,
    isHost: false,
    connected: true,
  },
  {
    id: 'd',
    name: 'Dan',
    avatar: '🦁',
    team: 'blue',
    isSpymaster: false,
    isHost: false,
    connected: true,
  },
];

function lobbyView(me: string, list: PublicPlayer[] = players): PlayerView {
  const self = list.find((p) => p.id === me)!;
  return {
    phase: 'lobby',
    players: list,
    me: {
      id: self.id,
      name: self.name,
      avatar: self.avatar,
      team: self.team,
      isSpymaster: self.isSpymaster,
      isHost: self.isHost,
    },
    config: { turnSeconds: 180 },
  };
}

describe('Codenames Lobby', () => {
  it('shows teams and starts when valid', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(screen.getByText('Spymaster: Host')).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Deal the board' });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(send).toHaveBeenCalledWith({ t: 'start' });
  });

  it('blocks starting with a reason when setup is invalid', () => {
    const noSpy = players.map((p) => (p.id === 'c' ? { ...p, isSpymaster: false } : p));
    render(<Lobby view={lobbyView('h', noSpy)} roomCode="ABC123" send={vi.fn()} />);
    const start = screen.getByRole('button', { name: 'Blue needs a spymaster' });
    expect(start).toBeDisabled();
  });

  it('joins and leaves teams', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const unteamed = players.map((p) =>
      p.id === 'a' ? { ...p, team: null } : p,
    ) as PublicPlayer[];
    render(<Lobby view={lobbyView('a', unteamed)} roomCode="ABC123" send={send} />);

    await user.click(screen.getByRole('button', { name: 'Join red' }));
    expect(send).toHaveBeenCalledWith({ t: 'setTeam', targetId: 'a', team: 'red' });
  });

  it('stars and unstars spymasters', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    await user.click(screen.getByRole('button', { name: 'Make Ann spymaster' }));
    expect(send).toHaveBeenCalledWith({ t: 'setSpymaster', targetId: 'a', value: true });
  });

  it('randomizes and configures the timer', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    await user.click(screen.getByRole('button', { name: 'Randomize teams' }));
    expect(send).toHaveBeenCalledWith({ t: 'randomize' });
    await user.click(screen.getByRole('button', { name: '5:00' }));
    expect(send).toHaveBeenCalledWith({ t: 'setConfig', config: { turnSeconds: 300 } });
  });
});
