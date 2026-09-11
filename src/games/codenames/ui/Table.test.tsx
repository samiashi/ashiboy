// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table from '@/games/codenames/ui/Table';
import type { PlayerView, PublicPlayer, ViewCard } from '@/games/codenames/engine/types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const NOW = 2_000_000;

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

function cards(): ViewCard[] {
  // 4 fixed cards; kinds hidden from operatives.
  return [
    { word: 'APPLE', revealed: false },
    { word: 'BOAT', revealed: false },
    { word: 'CLOUD', revealed: false },
    { word: 'DANCE', revealed: false },
  ];
}

function tableView(overrides: Partial<PlayerView> = {}, me = 'h'): PlayerView {
  const self = players.find((p) => p.id === me)!;
  return {
    phase: 'clue',
    players,
    me: {
      id: self.id,
      name: self.name,
      avatar: self.avatar,
      team: self.team,
      isSpymaster: self.isSpymaster,
      isHost: self.isHost,
    },
    turn: { team: 'red', clue: null, guessesMade: 0, guessesLeft: null },
    cards: cards(),
    startingTeam: 'red',
    clues: [],
    remaining: { red: 9, blue: 8 },
    ...overrides,
  };
}

describe('Codenames Table', () => {
  it('spymaster composes and sends a clue', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Table view={tableView()} send={send} />);

    await user.type(screen.getByPlaceholderText('Clue word'), 'fruit');
    await user.click(screen.getByRole('button', { name: /Send clue/ }));
    expect(send).toHaveBeenCalledWith({ t: 'giveClue', word: 'FRUIT', number: 2 });
  });

  it('rejects empty clues', () => {
    const send = vi.fn();
    render(<Table view={tableView()} send={send} />);
    expect(screen.getByRole('button', { name: /Send clue/ })).toBeDisabled();
  });

  it('operatives tap cards to guess, then end the turn', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const view = tableView(
      {
        phase: 'guessing',
        turn: {
          team: 'red',
          clue: { team: 'red', word: 'FRUIT', number: 2 },
          guessesMade: 1,
          guessesLeft: 2,
        },
      },
      'a',
    );
    render(<Table view={view} send={send} />);

    expect(screen.getByText('FRUIT')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Guess BOAT' }));
    expect(send).toHaveBeenCalledWith({ t: 'guess', cardIndex: 1 });
    await user.click(screen.getByRole('button', { name: 'End turn' }));
    expect(send).toHaveBeenCalledWith({ t: 'endTurn' });
  });

  it('spymaster sees the key, operatives do not', () => {
    const keyed = cards().map((c, i) => ({
      ...c,
      kind: (['red', 'blue', 'bystander', 'assassin'] as const)[i],
    }));
    const spyView = tableView({ cards: keyed });
    const { container: spyDom } = render(<Table view={spyView} send={vi.fn()} />);
    expect(spyDom.querySelectorAll('[class*="word-key-"]').length).toBeGreaterThan(0);
    cleanup();

    const opView = tableView({ cards: cards() }, 'a');
    const { container: opDom } = render(<Table view={opView} send={vi.fn()} />);
    expect(opDom.querySelectorAll('[class*="word-key-"]').length).toBe(0);
  });

  it('host can pass and extend the turn', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const view = tableView({
      phase: 'guessing',
      turn: {
        team: 'red',
        clue: { team: 'red', word: 'FRUIT', number: 2 },
        guessesMade: 1,
        guessesLeft: 2,
      },
      turnEndsAt: NOW + 60_000,
      turnDurationSec: 180,
    });
    render(<Table view={view} send={send} />);

    await user.click(screen.getByRole('button', { name: 'Pass turn' }));
    expect(send).toHaveBeenCalledWith({ t: 'passTurn' });
    await user.click(screen.getByRole('button', { name: '+1:00' }));
    expect(send).toHaveBeenCalledWith({ t: 'extendTurn' });
  });

  it('expiry passes the turn automatically', () => {
    vi.useFakeTimers({ now: NOW });
    const send = vi.fn();
    const view = tableView({
      phase: 'guessing',
      turn: {
        team: 'red',
        clue: { team: 'red', word: 'FRUIT', number: 2 },
        guessesMade: 0,
        guessesLeft: 3,
      },
      turnEndsAt: NOW + 30_000,
      turnDurationSec: 180,
    });
    render(<Table view={view} send={send} />);
    expect(screen.getByText('0:30')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(send).toHaveBeenCalledWith({ t: 'passTurn' });
  });
});
