// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Night from '@/games/mafia/ui/Night';
import type { PlayerView, PublicPlayer } from '@/games/mafia/engine/types';

afterEach(() => cleanup());

const players: PublicPlayer[] = [
  { id: 'm', name: 'Mal', avatar: '🦊', isHost: false, connected: true, alive: true, ready: false },
  {
    id: 'm2',
    name: 'Moe',
    avatar: '🐼',
    isHost: false,
    connected: true,
    alive: true,
    ready: false,
  },
  {
    id: 'v1',
    name: 'Vicky',
    avatar: '🐸',
    isHost: true,
    connected: true,
    alive: true,
    ready: false,
  },
  {
    id: 'v2',
    name: 'Vera',
    avatar: '🦁',
    isHost: false,
    connected: true,
    alive: true,
    ready: false,
  },
];

function nightView(me: string, extra: Partial<PlayerView> = {}): PlayerView {
  const self = players.find((p) => p.id === me)!;
  return {
    phase: 'night',
    round: 1,
    players,
    me: { id: self.id, name: self.name, isHost: self.isHost, alive: true, role: 'mafia' },
    mafiaTeammates: [{ id: 'm2', name: 'Moe' }],
    mafiaPicks: {},
    nightOptions: ['v1', 'v2'],
    nightPending: 2,
    ...extra,
  };
}

describe('Night', () => {
  it('mafia picks a victim on tap', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Night view={nightView('m')} send={send} />);

    expect(screen.getByText('Mafia')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '🐸 Vicky' }));
    expect(send).toHaveBeenCalledWith({ t: 'nightAct', targetId: 'v1' });
  });

  it('shows the host a resolve-now escape hatch while actors are missing', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    // Host is a sleeping villager here — the skip control must still show.
    render(
      <Night
        view={nightView('v1', {
          me: { id: 'v1', name: 'Vicky', isHost: true, alive: true, role: 'villager' },
          mafiaTeammates: undefined,
          mafiaPicks: undefined,
          nightOptions: undefined,
          myNightPick: undefined,
        })}
        send={send}
      />,
    );

    const skip = screen.getByRole('button', { name: /Resolve the night now/ });
    await user.click(skip);
    expect(send).toHaveBeenCalledWith({ t: 'skipNight' });
  });

  it('tells sleepers their role', () => {
    const view = nightView('v2', {
      me: { id: 'v2', name: 'Vera', isHost: false, alive: true, role: 'villager' },
      mafiaTeammates: undefined,
      mafiaPicks: undefined,
      nightOptions: undefined,
      myNightPick: undefined,
    });
    render(<Night view={view} send={vi.fn()} />);
    expect(screen.getByText('Villager')).toBeTruthy();
  });
});
