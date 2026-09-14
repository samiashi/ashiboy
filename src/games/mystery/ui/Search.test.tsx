// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Search from '@/games/mystery/ui/Search';
import type { PlayerView } from '@/games/mystery/engine/types';

afterEach(() => cleanup());

function searchView(me: string): PlayerView {
  const isHost = me === 'h';
  return {
    phase: 'search',
    players: [
      { id: 'h', name: 'Host', avatar: '🔍', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
    ],
    me: { id: me, name: isHost ? 'Host' : 'Ann', isHost },
    caseTitle: 'Murder at the Masquerade',
    victim: 'Lady Evangeline Hart',
    brief: 'A brief.',
    suspects: [],
    locations: [
      {
        id: 'conservatory',
        name: 'The Conservatory',
        description: 'Glass walls.',
        searched: true,
        locked: false,
      },
      {
        id: 'cellar',
        name: 'The Wine Cellar',
        description: 'Stone steps.',
        searched: false,
        locked: true,
      },
      {
        id: 'ballroom',
        name: 'The Ballroom',
        description: 'Masks.',
        searched: false,
        locked: false,
      },
    ],
    weapons: [],
    clues: [
      { id: 'glass', locationId: 'conservatory', title: 'Shattered glass', detail: 'Dregs.' },
    ],
    searchLeft: 4,
    pressureLeft: 3,
    attemptsLeft: 2,
    attempts: [],
  };
}

describe('Mystery Search', () => {
  it('pins found clues and searches open locations', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Search view={searchView('a')} send={send} />);

    expect(screen.getByText(/Shattered glass/)).toBeTruthy();
    expect(screen.getByText('Searched ✓')).toBeTruthy();
    expect(screen.getByText('Locked — find its key clue first.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Search (1 🔍)' }));
    expect(send).toHaveBeenCalledWith({ t: 'search', locationId: 'ballroom' });
  });

  it('offers no search buttons for searched or locked rooms', () => {
    render(<Search view={searchView('a')} send={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Search (1 🔍)' })).toHaveLength(1);
  });

  it('lets the host move to alibis', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Search view={searchView('h')} send={send} />);
    await user.click(screen.getByRole('button', { name: 'Move to alibis' }));
    expect(send).toHaveBeenCalledWith({ t: 'advance' });
  });
});
