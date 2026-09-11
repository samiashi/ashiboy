// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Day from '@/games/mafia/ui/Day';
import type { PlayerView, PublicPlayer } from '@/games/mafia/engine/types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const NOW = 2_000_000;

const players: PublicPlayer[] = [
  { id: 'h', name: 'Host', avatar: '🦊', isHost: true, connected: true, alive: true, ready: false },
  { id: 'a', name: 'Ann', avatar: '🐼', isHost: false, connected: true, alive: true, ready: false },
];

function discussionView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    phase: 'discussion',
    round: 1,
    players,
    me: { id: 'h', name: 'Host', isHost: true, alive: true, role: 'villager' },
    lastNight: {},
    discussionEndsAt: NOW + 90_000,
    discussionDurationSec: 180,
    ...overrides,
  };
}

describe('Day discussion timer', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW }));

  it('counts down and advances on expiry', () => {
    const send = vi.fn();
    render(<Day view={discussionView()} send={send} />);

    expect(screen.getByText('1:30')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(send).toHaveBeenCalledWith({ t: 'advance' });
  });

  it('extends on host request', () => {
    const send = vi.fn();
    render(<Day view={discussionView()} send={send} />);

    fireEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(send).toHaveBeenCalledWith({ t: 'extendDiscussion' });
  });

  it('hides the ring when untimed', () => {
    render(
      <Day
        view={discussionView({ discussionEndsAt: undefined, discussionDurationSec: undefined })}
        send={vi.fn()}
      />,
    );
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.getByText(/Talk it out/)).toBeTruthy();
  });
});
