import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { GameProps } from '@/games/registry';
import { GameClient, ROOM_GONE_MESSAGE } from '@/games/mafia/net/client';
import { GameHost, makeRoomCode } from '@/games/mafia/net/host';
import {
  clearSession,
  loadProfile,
  loadSession,
  saveProfile,
  type StoredSession,
} from '@/games/mafia/net/persistence';
import { isMuted, setMuted, useMafiaSounds } from '@/games/mafia/sound';
import { useWakeLock } from '@/games/mafia/useWakeLock';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import Home from '@/games/mafia/ui/Home';
import Lobby from '@/games/mafia/ui/Lobby';
import RoleReveal from '@/games/mafia/ui/RoleReveal';
import Night from '@/games/mafia/ui/Night';
import Day from '@/games/mafia/ui/Day';
import Voting from '@/games/mafia/ui/Voting';
import VoteResult from '@/games/mafia/ui/VoteResult';
import GameOver from '@/games/mafia/ui/GameOver';
import '@/games/mafia/mafia.css';

interface Session {
  send(msg: ClientMessage): void;
  destroy(): void;
}

export default function MafiaGame({ params }: GameProps) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());
  const [muted, setMutedState] = useState(isMuted());
  const sessionRef = useRef<Session | null>(null);

  useMafiaSounds(view);
  useWakeLock(view !== null);

  // Leaving the game (e.g. back to the hub) must release the seat / room —
  // otherwise the host keeps seeing a ghost player.
  useEffect(() => () => sessionRef.current?.destroy(), []);

  const handleView = useCallback((v: PlayerView) => {
    setView(v);
    setConnecting(false);
    // Guests persist their seat inside GameClient on welcome — pick it up so
    // the Home screen's "Rejoin as…" card reflects the current room.
    setSession(loadSession());
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setConnecting(false);
    if (
      message === 'rejoin-failed' ||
      message === 'That game has already started.' ||
      message === ROOM_GONE_MESSAGE
    ) {
      setSession(null);
    }
    if (message === 'Lost connection to the host.') {
      // Back to Home, where the "Rejoin as…" card is waiting.
      setView(null);
    }
  }, []);

  const rememberProfile = (name: string, avatar: string) =>
    saveProfile({ name: name.trim(), avatar });

  const createGame = useCallback(
    (name: string, avatar: string) => {
      rememberProfile(name, avatar);
      // Hosting a new room abandons any previous guest seat.
      clearSession();
      setSession(null);
      sessionRef.current?.destroy();
      const code = makeRoomCode();
      const host = new GameHost(code, name, avatar, handleView, handleError);
      sessionRef.current = host;
      setRoomCode(code);
      setConnecting(true);
      setError(null);
    },
    [handleError, handleView],
  );

  const joinGame = useCallback(
    (code: string, name: string, avatar: string) => {
      rememberProfile(name, avatar);
      sessionRef.current?.destroy();
      const client = new GameClient(handleView, handleError);
      client.join(code, name, avatar);
      sessionRef.current = client;
      setConnecting(true);
      setError(null);
    },
    [handleError, handleView],
  );

  const rejoin = useCallback(
    (ticket: StoredSession) => {
      sessionRef.current?.destroy();
      const client = new GameClient(handleView, handleError);
      client.join(ticket.code, ticket.name, ticket.avatar, {
        playerId: ticket.playerId,
        token: ticket.token,
      });
      sessionRef.current = client;
      setRoomCode(ticket.code);
      setConnecting(true);
      setError(null);
    },
    [handleError, handleView],
  );

  const forgetSession = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m);
      return !m;
    });
  }, []);

  const send = useCallback((msg: ClientMessage) => sessionRef.current?.send(msg), []);

  if (!view) {
    const profile = loadProfile();
    return (
      <Home
        connecting={connecting}
        error={error}
        prefillCode={params.get('join') ?? ''}
        prefillName={profile?.name ?? ''}
        prefillAvatar={profile?.avatar ?? ''}
        session={session}
        onCreate={createGame}
        onJoin={joinGame}
        onRejoin={rejoin}
        onForgetSession={forgetSession}
      />
    );
  }

  let screen;
  switch (view.phase) {
    case 'lobby':
      screen = <Lobby view={view} roomCode={roomCode} send={send} />;
      break;
    case 'roleReveal':
      screen = <RoleReveal view={view} send={send} />;
      break;
    case 'night':
      screen = <Night view={view} send={send} />;
      break;
    case 'dayReveal':
    case 'discussion':
      screen = <Day view={view} send={send} />;
      break;
    case 'voting':
      screen = <Voting view={view} send={send} />;
      break;
    case 'voteResult':
      screen = <VoteResult view={view} send={send} />;
      break;
    case 'gameOver':
      screen = <GameOver view={view} send={send} />;
      break;
  }

  const showDeadBanner =
    !view.me.alive &&
    view.phase !== 'night' &&
    view.phase !== 'voting' &&
    view.phase !== 'gameOver';

  let phaseLabel = '';
  if (view.round > 0 && view.phase !== 'lobby' && view.phase !== 'roleReveal') {
    phaseLabel = view.phase === 'night' ? ` · Night ${view.round}` : ` · Day ${view.round}`;
  }

  // Plain-language announcement for screen readers on every phase change.
  // Contains only what this device is allowed to know (never others' roles).
  const phaseAnnouncement = (() => {
    switch (view.phase) {
      case 'lobby':
        return `Lobby. ${view.players.length} players in the room.`;
      case 'roleReveal':
        return 'Roles are dealt. Check your secret role privately.';
      case 'night':
        return view.me.alive
          ? `Night ${view.round}. Act on your screen, or close your eyes.`
          : `Night ${view.round}. You are eliminated.`;
      case 'dayReveal': {
        const died = view.players.find((p) => p.id === view.lastNight?.diedId);
        return died
          ? `Day ${view.round}. ${died.name} was found dead.`
          : `Day ${view.round}. Nobody died.`;
      }
      case 'discussion':
        return `Day ${view.round}. Discussion. Talk it out.`;
      case 'voting':
        return `Day ${view.round}. Voting is open.`;
      case 'voteResult': {
        const out = view.players.find((p) => p.id === view.lastVote?.eliminatedId);
        return out ? `${out.name} was eliminated.` : 'No majority. Nobody was eliminated.';
      }
      case 'gameOver':
        return view.winner === 'mafia' ? 'The mafia wins.' : 'The town wins.';
    }
  })();

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {phaseAnnouncement}
      </p>
      <div className="topbar">
        <a className="topbar-link" href="#/">
          Ashiboy
        </a>
        <span className="topbar-right">
          <span className="muted topbar-phase">Mafia{phaseLabel}</span>
          <button
            className="sound-toggle"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </span>
      </div>
      {showDeadBanner && (
        <div className="banner-dead">You were eliminated — you're now spectating.</div>
      )}
      {error && (
        <div className="toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={view.phase}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {screen}
        </m.div>
      </AnimatePresence>
    </>
  );
}
