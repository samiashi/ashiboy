import { AnimatePresence, m } from 'motion/react';
import type { GameProps } from '@/games/registry';
import { GameClient, ROOM_GONE_MESSAGE } from '@/games/hottake/net/client';
import { GameHost, makeRoomCode } from '@/games/hottake/net/host';
import { loadProfile, saveProfile } from '@/shared/identity';
import { clearSession, loadSession } from '@/games/hottake/net/persistence';
import { isMuted, setMuted, useHotTakeSounds } from '@/games/hottake/sound';
import { useWakeLock } from '@/shared/useWakeLock';
import { TopBar } from '@/shared/components/TopBar';
import { Toast } from '@/shared/components/Toast';
import { useGameSession } from '@/shared/useGameSession';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import Home from '@/games/hottake/ui/Home';
import Lobby from '@/games/hottake/ui/Lobby';
import Answering from '@/games/hottake/ui/Answering';
import Voting from '@/games/hottake/ui/Voting';
import Scoreboard from '@/games/hottake/ui/Scoreboard';
import GameOver from '@/games/hottake/ui/GameOver';
import '@/games/hottake/hottake.css';

export default function HotTakeGame({ params }: GameProps) {
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
  useHotTakeSounds(view);
  // Hold the lock once prompts are dealt — the lobby is idle by design.
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
    case 'answering':
      screen = <Answering view={view} send={send} />;
      break;
    case 'voting':
      screen = <Voting view={view} send={send} />;
      break;
    case 'scoreboard':
      screen = <Scoreboard view={view} send={send} />;
      break;
    case 'gameOver':
      screen = <GameOver view={view} send={send} />;
      break;
  }

  const phaseLabel =
    view.phase === 'lobby'
      ? ''
      : view.phase === 'gameOver'
        ? ' · Crowned'
        : ` · Prompt ${view.promptNumber} of ${view.promptsTotal}`;

  // Plain-language announcement for screen readers on every phase change.
  // Counts only — never sealed answers or authorship.
  const phaseAnnouncement = (() => {
    switch (view.phase) {
      case 'lobby':
        return `Lobby. ${view.players.length} writers in the room.`;
      case 'answering': {
        const waiting =
          view.players.filter((p) => p.connected).length - (view.submittedIds ?? []).length;
        return `Prompt ${view.promptNumber} of ${view.promptsTotal}. Write your answer. ${waiting} still writing.`;
      }
      case 'voting': {
        const missing =
          view.players.filter((p) => p.connected).length - (view.voterIds ?? []).length;
        return `Voting is open on ${(view.ballot ?? []).length} answers. ${missing} votes missing.`;
      }
      case 'scoreboard':
        return 'Results are in. Authorship revealed.';
      case 'gameOver': {
        const names = (view.winners ?? []).map((w) => w.name).join(' and ');
        return `${names} win${(view.winners ?? []).length > 1 ? '' : 's'} the night.`;
      }
    }
  })();

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {phaseAnnouncement}
      </p>
      <TopBar
        title="Hot Take"
        phaseLabel={phaseLabel}
        muted={session.muted}
        onToggleMute={session.toggleMute}
      />
      <Toast message={session.error} onDismiss={session.dismissError} />
      <AnimatePresence initial={false}>
        <m.div
          key={
            view.phase === 'scoreboard' || view.phase === 'gameOver'
              ? view.phase
              : `${view.phase}-${view.promptNumber}`
          }
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
