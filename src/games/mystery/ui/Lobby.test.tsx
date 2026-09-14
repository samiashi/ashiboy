// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lobby from '@/games/mystery/ui/Lobby';
import { suggestConfig } from '@/games/mystery/engine/engine';
import type { PlayerView, PublicPlayer } from '@/games/mystery/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
  { id: 'h', name: 'Host', avatar: '🔍', isHost: true, connected: true },
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
    cases: [
      { id: 'masquerade', title: 'Murder at the Masquerade', victim: 'Lady Evangeline Hart' },
    ],
  };
}

describe('Mystery Lobby', () => {
  it('shows the roster and opens the picked case', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Open the case file' });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(send).toHaveBeenCalledWith({ t: 'start', caseId: 'masquerade' });
  });

  it('starts even solo — a lone detective is enough', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const solo = lobbyView('h', players.slice(0, 1));
    render(<Lobby view={solo} roomCode="ABC123" send={send} />);
    const start = screen.getByRole('button', { name: 'Open the case file' });
    expect(start).toBeEnabled();
    await user.click(start);
    expect(send).toHaveBeenCalledWith({ t: 'start', caseId: 'masquerade' });
  });

  it('sends full config when stepping tokens', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Lobby view={lobbyView('h')} roomCode="ABC123" send={send} />);

    await user.click(screen.getByRole('button', { name: 'Increase search tokens' }));
    expect(send).toHaveBeenCalledWith({
      t: 'setConfig',
      config: { ...suggestConfig(), searchTokens: 7 },
    });
  });

  it('guests wait instead of starting', () => {
    render(<Lobby view={lobbyView('a')} roomCode="ABC123" send={vi.fn()} />);
    expect(screen.getByText('Waiting for the host to open the case…')).toBeTruthy();
    expect(screen.getByText('The host is picking a case…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open the case file' })).toBeNull();
  });
});
