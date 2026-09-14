// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Answering from '@/games/hottake/ui/Answering';
import type { PlayerView } from '@/games/hottake/engine/types';

afterEach(() => cleanup());

function answeringView(me: string, myText = ''): PlayerView {
  const isHost = me === 'h';
  return {
    phase: 'answering',
    players: [
      { id: 'h', name: 'Host', avatar: '🎤', isHost: true, connected: true },
      { id: 'a', name: 'Ann', avatar: '🦊', isHost: false, connected: true },
      { id: 'b', name: 'Bob', avatar: '🐼', isHost: false, connected: true },
    ],
    me: { id: me, name: isHost ? 'Host' : 'Ann', isHost },
    promptNumber: 1,
    promptsTotal: 3,
    promptText: 'A terrible name for a pet rock:',
    myText,
    submittedIds: myText ? [me] : [],
  };
}

describe('Hot Take Answering', () => {
  it('submits a typed answer', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Answering view={answeringView('a')} send={send} />);

    expect(screen.getByText('A terrible name for a pet rock:')).toBeTruthy();
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Pebbleina');
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(send).toHaveBeenCalledWith({ t: 'answer', text: 'Pebbleina' });
  });

  it('shows lock-in state and the waiting count', () => {
    render(<Answering view={answeringView('a', 'Pebbleina')} send={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Update answer' })).toBeTruthy();
    expect(screen.getByText('Locked in — you can still edit until voting opens.')).toBeTruthy();
  });

  it('lets the host close answers early', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Answering view={answeringView('h')} send={send} />);
    await user.click(screen.getByRole('button', { name: 'Close answers' }));
    expect(send).toHaveBeenCalledWith({ t: 'advance' });
  });
});
