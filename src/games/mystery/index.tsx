import { AnimatePresence, m } from 'motion/react';
import type { GameProps } from '@/games/registry';
import { GameClient, ROOM_GONE_MESSAGE } from '@/games/mystery/net/client';
import { GameHost, makeRoomCode } from '@/games/mystery/net/host';
import { loadProfile, saveProfile } from '@/shared/identity';
import { clearSession, loadSession } from '@/games/mystery/net/persistence';
import { isMuted, setMuted, useMysterySounds } from '@/games/mystery/sound';
import { useWakeLock } from '@/shared/useWakeLock';
import { TopBar } from '@/shared/components/TopBar';
import { Toast } from '@/shared/components/Toast';
import { useGameSession } from '@/shared/useGameSession';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import Home from '@/games/mystery/ui/Home';
import Lobby from '@/games/mystery/ui/Lobby';
import Briefing from '@/games/mystery/ui/Briefing';
import Search from '@/games/mystery/ui/Search';
import Alibis from '@/games/mystery/ui/Alibis';
import Verdict from '@/games/mystery/ui/Verdict';
import GameOver from '@/games/mystery/ui/GameOver';
import '@/games/mystery/mystery.css';

export default function MysteryGame({ params }: GameProps) {
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
  useMysterySounds(view);
  // Hold the lock once the case opens — the lobby is idle by design.
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
    case 'briefing':
      screen = <Briefing view={view} send={send} />;
      break;
    case 'search':
      screen = <Search view={view} send={send} />;
      break;
    case 'alibis':
      screen = <Alibis view={view} send={send} />;
      break;
    case 'accusation':
      screen = <Verdict view={view} send={send} />;
      break;
    case 'gameOver':
      screen = <GameOver view={view} send={send} />;
      break;
  }

  const phaseLabel =
    view.phase === 'lobby'
      ? ''
      : view.phase === 'briefing'
        ? ' · Briefing'
        : view.phase === 'search'
          ? ` · Search (${view.searchLeft ?? 0} 🔍)`
          : view.phase === 'alibis'
            ? ` · Alibis (${view.pressureLeft ?? 0} ❗)`
            : view.phase === 'accusation'
              ? ` · Verdict (${view.attemptsLeft ?? 0} ⚖️)`
              : view.winner === 'solved'
                ? ` · Solved ${'★'.repeat(view.stars ?? 1)}`
                : ' · Cold';

  // Plain-language announcement for screen readers on every phase change.
  // Contains only what this device is allowed to know (never the solution).
  const phaseAnnouncement = (() => {
    switch (view.phase) {
      case 'lobby':
        return `Lobby. ${view.players.length} investigators in the room.`;
      case 'briefing':
        return `${view.caseTitle}. Victim: ${view.victim}. Study the suspects.`;
      case 'search':
        return `Search. ${view.searchLeft ?? 0} tokens left. ${(view.clues ?? []).length} clues pinned.`;
      case 'alibis':
        return `Alibis. ${view.pressureLeft ?? 0} pressure left.`;
      case 'accusation':
        return `Verdict. ${view.attemptsLeft ?? 0} attempts left.`;
      case 'gameOver':
        return view.winner === 'solved'
          ? `Case solved with ${view.stars ?? 1} stars.`
          : 'The trail goes cold. The truth is revealed.';
    }
  })();

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {phaseAnnouncement}
      </p>
      <TopBar
        title="Mystery"
        phaseLabel={phaseLabel}
        muted={session.muted}
        onToggleMute={session.toggleMute}
      />
      <Toast message={session.error} onDismiss={session.dismissError} />
      <AnimatePresence initial={false}>
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
