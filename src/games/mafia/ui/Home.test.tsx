// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/games/mafia/ui/Home';

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

describe('Home', () => {
  it('requires a name before creating or joining', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Home {...baseProps} onCreate={onCreate} />);

    expect(screen.getByRole('button', { name: 'Create a game' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Create a game' }));
    expect(onCreate).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Create a game' }));
    expect(onCreate).toHaveBeenCalledWith('Sam', '🦊');
  });

  it('lets the player pick an avatar', async () => {
    const user = userEvent.setup();
    render(<Home {...baseProps} />);

    const frog = screen.getByRole('button', { name: 'avatar 🐸' });
    expect(frog.className).not.toContain('avatar-selected');
    await user.click(frog);
    expect(frog.className).toContain('avatar-selected');
  });

  it('joins with code, name, and avatar', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    render(<Home {...baseProps} onJoin={onJoin} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'avatar 🐙' }));
    await user.type(screen.getByPlaceholderText('CODE'), 'abc123');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoin).toHaveBeenCalledWith('ABC123', 'Sam', '🐙');
  });

  it('disables Create while a join code is being entered', async () => {
    const user = userEvent.setup();
    render(<Home {...baseProps} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    const create = screen.getByRole('button', { name: 'Create a game' });
    expect(create).toBeEnabled();
    await user.type(screen.getByPlaceholderText('CODE'), 'ABC123');
    expect(create).toBeDisabled();
    await user.clear(screen.getByPlaceholderText('CODE'));
    expect(create).toBeEnabled();
  });

  it('disables Create when arriving via an invite link', () => {
    render(<Home {...baseProps} prefillCode="ABC123" prefillName="Sam" />);
    expect(screen.getByRole('button', { name: 'Create a game' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled();
  });

  it('previews the chosen name and avatar live', async () => {
    const user = userEvent.setup();
    render(<Home {...baseProps} />);

    const preview = () => document.querySelector('.profile-preview');
    expect(preview()?.textContent).toContain('Your name');
    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    expect(preview()?.textContent).toContain('Sam');
    await user.click(screen.getByRole('button', { name: 'avatar 🐸' }));
    expect(preview()?.textContent).toContain('🐸');
  });

  it('keeps Join disabled until the code is complete', async () => {
    const user = userEvent.setup();
    render(<Home {...baseProps} />);

    const join = screen.getByRole('button', { name: 'Join' });
    expect(join).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Your name'), 'Sam');
    expect(join).toBeDisabled(); // still no code
    await user.type(screen.getByPlaceholderText('CODE'), 'AB');
    expect(join).toBeDisabled();
  });

  it('shows errors and offers rejoin for a stored session', async () => {
    const user = userEvent.setup();
    const onRejoin = vi.fn();
    const onForgetSession = vi.fn();
    const session = { code: 'ABC123', playerId: 'p1', token: 'tok', name: 'Sam', avatar: '🦊' };
    render(
      <Home
        {...baseProps}
        error="Room not found — check the code."
        session={session}
        onRejoin={onRejoin}
        onForgetSession={onForgetSession}
      />,
    );

    expect(screen.getByText('Room not found — check the code.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rejoin as 🦊 Sam' }));
    expect(onRejoin).toHaveBeenCalledWith(session);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onForgetSession).toHaveBeenCalled();
  });
});
