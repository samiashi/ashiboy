// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleReveal from '@/games/mafia/ui/RoleReveal';
import type { PlayerView } from '@/games/mafia/engine/types';

afterEach(() => cleanup());

const view: PlayerView = {
  phase: 'roleReveal',
  round: 0,
  players: [
    {
      id: 'a',
      name: 'Ann',
      avatar: '🦊',
      isHost: true,
      connected: true,
      alive: true,
      ready: false,
    },
    {
      id: 'b',
      name: 'Bob',
      avatar: '🐼',
      isHost: false,
      connected: true,
      alive: true,
      ready: false,
    },
  ],
  me: { id: 'a', name: 'Ann', isHost: true, alive: true, role: 'detective' },
};

describe('RoleReveal', () => {
  it('keeps the role hidden until tapped, then acknowledges', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<RoleReveal view={view} send={send} />);

    const flip = screen.getByRole('button', { name: 'Tap to reveal your role' });
    expect(document.querySelector('.flip-inner')?.className).not.toContain('flipped');
    const ready = screen.getByRole('button', { name: 'Reveal your role first' });
    expect(ready).toBeDisabled();

    await user.click(flip);
    expect(document.querySelector('.flip-inner')?.className).toContain('flipped');
    expect(screen.getByRole('button', { name: 'Your role: Detective' })).toBeTruthy();

    const gotIt = screen.getByRole('button', { name: 'Got it — hide my role' });
    expect(gotIt).toBeEnabled();
    await user.click(gotIt);
    expect(send).toHaveBeenCalledWith({ t: 'ackRole' });
  });
});
