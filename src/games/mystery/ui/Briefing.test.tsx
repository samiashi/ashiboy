// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Briefing from '@/games/mystery/ui/Briefing';
import type { PlayerView } from '@/games/mystery/engine/types';

afterEach(() => cleanup());

function briefingView(me: string): PlayerView {
  const isHost = me === 'h';
  return {
    phase: 'briefing',
    players: [
      { id: 'h', name: 'Host', avatar: '🔍', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
    ],
    me: { id: me, name: isHost ? 'Host' : 'Ann', isHost },
    caseTitle: 'Murder at the Masquerade',
    victim: 'Lady Evangeline Hart',
    brief: 'The midnight unmasking never happened.',
    suspects: [
      {
        id: 'silas',
        name: 'Silas Vane',
        role: 'The Investor',
        bio: 'Funded the line.',
        alibi: 'Terrace.',
        secretRevealed: false,
      },
      {
        id: 'wren',
        name: 'Wren Halloway',
        role: 'The Niece',
        bio: 'The heir.',
        alibi: 'Dancing.',
        secretRevealed: false,
      },
    ],
  };
}

describe('Mystery Briefing', () => {
  it('stamps the file and dossiers the suspects', () => {
    render(<Briefing view={briefingView('a')} send={vi.fn()} />);
    expect(screen.getByText('Confidential')).toBeTruthy();
    expect(screen.getByText('Murder at the Masquerade')).toBeTruthy();
    expect(screen.getByText('Silas Vane')).toBeTruthy();
    expect(screen.getByText('Suspect 02')).toBeTruthy();
  });

  it('lets the host begin the search', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Briefing view={briefingView('h')} send={send} />);
    await user.click(screen.getByRole('button', { name: 'Begin the search' }));
    expect(send).toHaveBeenCalledWith({ t: 'advance' });
  });

  it('parks guests until the host begins', () => {
    render(<Briefing view={briefingView('a')} send={vi.fn()} />);
    expect(screen.getByText('Waiting for Host to begin the search…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Begin the search' })).toBeNull();
  });
});
