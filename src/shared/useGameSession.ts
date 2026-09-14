import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomTicket } from '@/shared/identity';

export interface SessionHandle<Msg> {
  send(msg: Msg): void;
  destroy(): void;
}

export interface HostHandle<Msg> extends SessionHandle<Msg> {
  readonly code: string;
}

export interface ClientHandle<Msg> extends SessionHandle<Msg> {
  join(
    code: string,
    name: string,
    avatar: string,
    ticket?: { playerId: string; token: string },
  ): void;
}

export interface GameSessionOptions<View, Msg> {
  params: URLSearchParams;
  createHost: (
    code: string,
    name: string,
    avatar: string,
    onView: (view: View) => void,
    onError: (message: string) => void,
  ) => HostHandle<Msg>;
  createClient: (
    onView: (view: View) => void,
    onError: (message: string) => void,
  ) => ClientHandle<Msg>;
  makeRoomCode: () => string;
  loadTicket: () => RoomTicket | null;
  clearTicket: () => void;
  rememberProfile: (name: string, avatar: string) => void;
  readMuted: () => boolean;
  writeMuted: (muted: boolean) => void;
  /** Message a client reports when its rejoin proves the room is gone. */
  roomGoneMessage: string;
}

export interface GameSession<View, Msg> {
  view: View | null;
  roomCode: string;
  connecting: boolean;
  error: string | null;
  session: RoomTicket | null;
  muted: boolean;
  params: URLSearchParams;
  send(msg: Msg): void;
  createGame(name: string, avatar: string): void;
  joinGame(code: string, name: string, avatar: string): void;
  rejoin(ticket: RoomTicket): void;
  forgetSession(): void;
  toggleMute(): void;
  dismissError(): void;
}

/**
 * The full client/server session lifecycle shared by every game: hosting,
 * joining, rejoining with a saved seat, error routing, mute preference, and
 * teardown. The game root keeps only its sounds hook, announcements, and
 * phase switch.
 */
export function useGameSession<View, Msg>(
  options: GameSessionOptions<View, Msg>,
): GameSession<View, Msg> {
  const [view, setView] = useState<View | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<RoomTicket | null>(() => options.loadTicket());
  const [muted, setMutedState] = useState(options.readMuted());
  const sessionRef = useRef<SessionHandle<Msg> | null>(null);
  const connectTimer = useRef<number | undefined>(undefined);
  const connectingRef = useRef(false);
  const optsRef = useRef(options);
  optsRef.current = options;

  // Leaving the game (e.g. back to the hub) must release the seat / room —
  // otherwise the host keeps seeing a ghost player.
  useEffect(
    () => () => {
      sessionRef.current?.destroy();
      window.clearTimeout(connectTimer.current);
    },
    [],
  );

  const clearConnectTimer = useCallback(() => {
    window.clearTimeout(connectTimer.current);
    connectTimer.current = undefined;
    connectingRef.current = false;
  }, []);

  const armConnectTimer = useCallback(() => {
    window.clearTimeout(connectTimer.current);
    connectingRef.current = true;
    // PeerJS only resolves via view/error. If signaling is unreachable
    // (offline LAN), neither fires — escape the stuck "Connecting…" state.
    // (No setState inside an updater — updaters must stay pure.)
    connectTimer.current = window.setTimeout(() => {
      if (connectingRef.current) {
        connectingRef.current = false;
        setConnecting(false);
        setError('Connection timed out — check the code and your connection, then try again.');
      }
    }, 15000);
  }, []);

  const handleView = useCallback(
    (v: View) => {
      clearConnectTimer();
      setView(v);
      setConnecting(false);
      // Guests persist their seat inside the client on welcome — pick it up so
      // the Home screen's "Rejoin as…" card reflects the current room. Skip
      // the second state set when the ticket is unchanged (every publish).
      const next = optsRef.current.loadTicket();
      setSession((prev) => {
        if (
          prev === null ||
          next === null ||
          prev.code !== next.code ||
          prev.playerId !== next.playerId ||
          prev.token !== next.token ||
          prev.name !== next.name ||
          prev.avatar !== next.avatar
        ) {
          return next;
        }
        return prev;
      });
    },
    [clearConnectTimer],
  );

  const handleError = useCallback((message: string) => {
    clearConnectTimer();
    setError(message);
    setConnecting(false);
    const gone = optsRef.current.roomGoneMessage;
    if (
      message === 'rejoin-failed' ||
      message === 'That game has already started.' ||
      message === 'You were removed from the game.' ||
      message === 'Room is full.' ||
      message === gone
    ) {
      setSession(null);
    }
    if (message === 'Lost connection to the host.') {
      // Back to Home, where the "Rejoin as…" card is waiting.
      setView(null);
    }
  }, []);

  const rememberProfile = useCallback((name: string, avatar: string) => {
    optsRef.current.rememberProfile(name, avatar);
  }, []);

  const createGame = useCallback(
    (name: string, avatar: string) => {
      const opts = optsRef.current;
      rememberProfile(name, avatar);
      // Hosting a new room abandons any previous guest seat.
      opts.clearTicket();
      setSession(null);
      sessionRef.current?.destroy();
      const code = opts.makeRoomCode();
      sessionRef.current = opts.createHost(code, name, avatar, handleView, handleError);
      setRoomCode(code);
      setConnecting(true);
      setError(null);
      armConnectTimer();
    },
    [armConnectTimer, handleError, handleView, rememberProfile],
  );

  const joinGame = useCallback(
    (code: string, name: string, avatar: string) => {
      rememberProfile(name, avatar);
      sessionRef.current?.destroy();
      const normalized = code.trim().toUpperCase();
      const client = optsRef.current.createClient(handleView, handleError);
      client.join(normalized, name, avatar);
      sessionRef.current = client;
      setRoomCode(normalized);
      setConnecting(true);
      setError(null);
      armConnectTimer();
    },
    [armConnectTimer, handleError, handleView, rememberProfile],
  );

  const rejoin = useCallback(
    (ticket: RoomTicket) => {
      sessionRef.current?.destroy();
      const client = optsRef.current.createClient(handleView, handleError);
      client.join(ticket.code, ticket.name, ticket.avatar, {
        playerId: ticket.playerId,
        token: ticket.token,
      });
      sessionRef.current = client;
      setRoomCode(ticket.code);
      setConnecting(true);
      setError(null);
      armConnectTimer();
    },
    [armConnectTimer, handleError, handleView],
  );

  const forgetSession = useCallback(() => {
    optsRef.current.clearTicket();
    setSession(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => !m);
  }, []);

  useEffect(() => {
    optsRef.current.writeMuted(muted);
  }, [muted]);

  const send = useCallback((msg: Msg) => sessionRef.current?.send(msg), []);

  return {
    view,
    roomCode,
    connecting,
    error,
    session,
    muted,
    params: options.params,
    send,
    createGame,
    joinGame,
    rejoin,
    forgetSession,
    toggleMute,
    dismissError,
  };
}
