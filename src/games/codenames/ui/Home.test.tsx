// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/games/codenames/ui/Home';

afterEach(() => cleanup());

const baseProps = {
  connecting: false,
  error: null as string | null,
  prefillCode: '',
  prefillName: '',
  prefillAvatar: '🦊',
  session: null,
  onCreate: () => {},
  onJoin: () => {},
  onRejoin: () => {},
  onForgetSession: () => {},
};

describe('Codenames Home', () => {
  it('creates a game with name and avatar', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Home {...baseProps} onCreate={onCreate} />);

    expect(screen.getByText('Codenames')).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Create a game' }));
    expect(onCreate).toHaveBeenCalledWith('Sam', '🦊');
  });

  it('joins with a code', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    render(<Home {...baseProps} onJoin={onJoin} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    await user.type(screen.getByPlaceholderText('CODE'), 'ABC123');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoin).toHaveBeenCalledWith('ABC123', 'Sam', '🦊');
  });

  it('disables Create while a join code is entered', async () => {
    const user = userEvent.setup();
    render(<Home {...baseProps} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    expect(screen.getByRole('button', { name: 'Create a game' })).toBeEnabled();
    await user.type(screen.getByPlaceholderText('CODE'), 'ABC123');
    expect(screen.getByRole('button', { name: 'Create a game' })).toBeDisabled();
  });
});
