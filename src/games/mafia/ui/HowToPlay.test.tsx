// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HowToPlay from '@/games/mafia/ui/HowToPlay';

afterEach(() => cleanup());

describe('HowToPlay', () => {
  it('explains the night as eyes-open play', () => {
    render(<HowToPlay />);
    expect(screen.getByText(/looks at their own phone/)).toBeTruthy();
    expect(screen.getByText(/Morning comes by itself/)).toBeTruthy();
    // Must never instruct eye-closing as a mechanic — the app, not shut
    // eyes, keeps night actions secret.
    expect(screen.queryByText(/closes their eyes/)).toBeNull();
  });
});
