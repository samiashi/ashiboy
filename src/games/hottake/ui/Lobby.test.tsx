// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lobby from '@/games/hottake/ui/Lobby';
import { suggestConfig } from '@/games/hottake/engine/engine';
import type { PlayerView, PublicPlayer } from '@/games/hottake/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
  { id: 'h', name: 'Host', avatar: '🎤', isHost: true, connected: true },
  { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
  { id: 'b', name: 'Bob', avatar: '🐼', isHost: false, connected: true },
];

function lobbyView(me: string, list: PublicPlayer[] = players): PlayerView {
  const self = list.find((p) => p.id === me)!;
  return {
    phase: 'lobby',
    players: list,
    me: { id: self.id, name: self.name, isHost: self.isHost },
    config: suggestConfig(),
  };
}

describe('Hot Take Lobby', () => {
  it('shows the roster and deals prompts', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Deal the prompts' });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(send).toHaveBeenCalledWith({ t: 'start' });
  });

  it('blocks starting below 3 players with a reason', () => {
    render(<Lobby view={lobbyView('h', players.slice(0, 2))} roomCode="ABC123" send={vi.fn()} />);
    const start = screen.getByRole('button', { name: 'Need 1 more player' });
    expect(start).toBeDisabled();
  });

  it('sends full config when stepping prompts', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    await user.click(screen.getByRole('button', { name: 'Increase prompts per game' }));
    expect(send).toHaveBeenCalledWith({
      t: 'setConfig',
      config: { ...suggestConfig(), promptsPerGame: 4 },
    });
  });

  it('guests wait instead of starting', () => {
    render(<Lobby view={lobbyView('a')} roomCode="ABC123" send={vi.fn()} />);
    expect(screen.getByText('Waiting for the host to deal…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deal the prompts' })).toBeNull();
  });
});
