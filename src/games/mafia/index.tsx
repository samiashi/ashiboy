import { AnimatePresence, m } from 'motion/react';
import type { GameProps } from '@/games/registry';
import { GameClient, ROOM_GONE_MESSAGE } from '@/games/mafia/net/client';
import { GameHost, makeRoomCode } from '@/games/mafia/net/host';
import { loadProfile, saveProfile } from '@/shared/identity';
import { clearSession, loadSession } from '@/games/mafia/net/persistence';
import { isMuted, setMuted, useMafiaSounds } from '@/games/mafia/sound';
import { useWakeLock } from '@/shared/useWakeLock';
import { TopBar } from '@/shared/components/TopBar';
import { Toast } from '@/shared/components/Toast';
import { useGameSession } from '@/shared/useGameSession';
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

export default function MafiaGame({ params }: GameProps) {
  const session = useGameSession<PlayerView, ClientMessage>({
    params,
    createHost: (code, name, avatar, onView, onError) =>
      new GameHost(code, name, avatar, onView, onError),
    createClient: (onView, onError) => new GameClient(onView, onError),
    makeRoomCode,
    loadTicket: loadSession,
    clearTicket: clearSession,
    rememberProfile: (name, avatar) => saveProfile({ name: name.trim(), avatar }),
    readMuted: isMuted,
    writeMuted: setMuted,
    roomGoneMessage: ROOM_GONE_MESSAGE,
  });

  const { view } = session;
  useMafiaSounds(view);
  // Hold the lock only once play starts — the lobby is idle by design.
  useWakeLock(view !== null && view.phase !== 'lobby');

  if (!view) {
    const profile = loadProfile();
    return (
      <Home
        connecting={session.connecting}
        error={session.error}
        prefillCode={params.get('join') ?? ''}
        prefillName={profile?.name ?? ''}
        prefillAvatar={profile?.avatar ?? ''}
        session={session.session}
        onCreate={session.createGame}
        onJoin={session.joinGame}
        onRejoin={session.rejoin}
        onForgetSession={session.forgetSession}
        onDismissError={session.dismissError}
      />
    );
  }

  const { send } = session;
  let screen;
  switch (view.phase) {
    case 'lobby':
      screen = <Lobby view={view} roomCode={session.roomCode} send={send} />;
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

  const showDeadBanner = !view.me.alive && view.phase !== 'gameOver';

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
      <TopBar
        title="Mafia"
        phaseLabel={phaseLabel}
        muted={session.muted}
        onToggleMute={session.toggleMute}
      />
      {showDeadBanner && (
        <div className="banner-dead">You were eliminated — you're now spectating.</div>
      )}
      <Toast message={session.error} onDismiss={session.dismissError} />
      <AnimatePresence initial={false}>
        <m.div
          key={`${view.phase}-${view.round}`}
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
