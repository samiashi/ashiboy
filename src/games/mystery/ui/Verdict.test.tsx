// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Verdict from '@/games/mystery/ui/Verdict';
import type { PlayerView } from '@/games/mystery/engine/types';

afterEach(() => cleanup());

function verdictView(): PlayerView {
  return {
    phase: 'accusation',
    players: [
      { id: 'h', name: 'Host', avatar: '🔍', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
    ],
    me: { id: 'a', name: 'Ann', isHost: false },
    caseTitle: 'Murder at the Masquerade',
    victim: 'Lady Evangeline Hart',
    brief: 'A brief.',
    suspects: [
      { id: 'silas', name: 'Silas Vane', role: 'R', bio: 'B', alibi: 'A', secretRevealed: false },
      { id: 'wren', name: 'Wren Halloway', role: 'R', bio: 'B', alibi: 'A', secretRevealed: false },
    ],
    locations: [
      { id: 'ballroom', name: 'The Ballroom', description: 'D', searched: true, locked: false },
      {
        id: 'conservatory',
        name: 'The Conservatory',
        description: 'D',
        searched: true,
        locked: false,
      },
    ],
    weapons: [
      { id: 'shears', name: 'Pruning shears' },
      { id: 'laudanum', name: 'A vial of laudanum' },
    ],
    clues: [],
    searchLeft: 0,
    pressureLeft: 0,
    attemptsLeft: 2,
    attempts: [],
  };
}

describe('Mystery Verdict', () => {
  it('submits the picked triple', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Verdict view={verdictView()} send={send} />);

    await user.click(screen.getByRole('button', { name: 'Wren Halloway' }));
    await user.click(screen.getByRole('button', { name: 'A vial of laudanum' }));
    await user.click(screen.getByRole('button', { name: 'The Conservatory' }));
    await user.click(screen.getByRole('button', { name: 'Deliver the verdict' }));
    expect(send).toHaveBeenCalledWith({
      t: 'accuse',
      suspectId: 'wren',
      weaponId: 'laudanum',
      locationId: 'conservatory',
    });
  });

  it('lists past verdicts with resolved names', () => {
    const view = verdictView();
    view.attempts = [
      {
        playerName: 'Ann',
        suspectId: 'silas',
        weaponId: 'shears',
        locationId: 'ballroom',
        correct: false,
      },
    ];
    render(<Verdict view={view} send={vi.fn()} />);
    expect(screen.getByText(/Ann named Silas Vane/)).toBeTruthy();
  });
});
