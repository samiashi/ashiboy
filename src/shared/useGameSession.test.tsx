// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGameSession } from '@/shared/useGameSession';
import type { RoomTicket } from '@/shared/identity';

interface FakeHost {
  code: string;
  sent: unknown[];
  destroyed: boolean;
  send(msg: unknown): void;
  destroy(): void;
}

interface FakeClient extends FakeHost {
  joined?: { code: string; name: string; avatar: string; ticket?: unknown };
  join(code: string, name: string, avatar: string, ticket?: unknown): void;
}

function makeNet() {
  const sent: unknown[] = [];
  let viewCb: ((view: string | null) => void) | null = null;
  let errCb: ((message: string) => void) | null = null;
  const host: FakeHost = {
    code: 'ABC123',
    sent,
    destroyed: false,
    send: (msg: unknown) => {
      sent.push(msg);
    },
    destroy() {
      this.destroyed = true;
    },
  };
  const client: FakeClient = {
    ...host,
    code: '',
    async join(code: string, name: string, avatar: string, ticket?: unknown) {
      this.joined = { code, name, avatar, ticket };
    },
  };
  return {
    sent,
    host,
    client,
    createHost: vi.fn(
      (
        _code: string,
        _name: string,
        _avatar: string,
        onView: (view: string | null) => void,
        onError: (message: string) => void,
      ) => {
        viewCb = onView;
        errCb = onError;
        return host;
      },
    ),
    createClient: vi.fn(
      (onView: (view: string | null) => void, onError: (message: string) => void) => {
        viewCb = onView;
        errCb = onError;
        return client;
      },
    ),
    emitView: (view: string | null) => act(() => viewCb?.(view)),
    emitError: (message: string) => act(() => errCb?.(message)),
  };
}

const ticket: RoomTicket = {
  code: 'ABC123',
  playerId: 'p1',
  token: 'tok',
  name: 'Sam',
  avatar: '🦊',
};

function setup(net = makeNet(), saved: RoomTicket | null = null) {
  return {
    net,
    ...renderHook(() =>
      useGameSession<string | null, { t: string }>({
        params: new URLSearchParams(),
        createHost: net.createHost,
        createClient: net.createClient,
        makeRoomCode: () => 'ABC123',
        loadTicket: () => saved,
        clearTicket: vi.fn(),
        rememberProfile: vi.fn(),
        readMuted: () => false,
        writeMuted: vi.fn(),
        roomGoneMessage: 'That room is gone.',
      }),
    ),
  };
}

describe('useGameSession', () => {
  it('creates a game and routes views', () => {
    const { result, net } = setup();
    act(() => result.current.createGame('Sam', '🦊'));
    expect(result.current.connecting).toBe(true);
    expect(result.current.roomCode).toBe('ABC123');
    expect(net.createHost).toHaveBeenCalled();
    net.emitView('lobby-view');
    expect(result.current.view).toBe('lobby-view');
    expect(result.current.connecting).toBe(false);
  });

  it('joins and rejoins with the saved ticket', () => {
    const { result, net } = setup(makeNet(), ticket);
    expect(result.current.session).toEqual(ticket);
    act(() => result.current.rejoin(ticket));
    expect(net.client.joined).toEqual({
      code: 'ABC123',
      name: 'Sam',
      avatar: '🦊',
      ticket: { playerId: 'p1', token: 'tok' },
    });
  });

  it('forwards actions to the live session', () => {
    const { result, net } = setup();
    act(() => result.current.createGame('Sam', '🦊'));
    act(() => result.current.send({ t: 'start' }));
    expect(net.sent).toEqual([{ t: 'start' }]);
  });

  it('drops the seat when its room is gone', () => {
    const { result, net } = setup(makeNet(), ticket);
    expect(result.current.session).toEqual(ticket);
    act(() => result.current.createGame('Sam', '🦊'));
    net.emitError('That room is gone.');
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('That room is gone.');
  });

  it('handles the lost-connection round trip', () => {
    const { result, net } = setup(makeNet(), ticket);
    act(() => result.current.joinGame('ABC123', 'Sam', '🦊'));
    net.emitView('in-game');
    expect(result.current.view).toBe('in-game');
    net.emitError('Lost connection to the host.');
    expect(result.current.view).toBeNull();
    expect(result.current.error).toBe('Lost connection to the host.');
  });

  it('toggles mute', () => {
    const { result } = setup();
    expect(result.current.muted).toBe(false);
    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(true);
  });
});
