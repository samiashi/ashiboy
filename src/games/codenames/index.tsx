import { AnimatePresence, m } from 'motion/react';
import type { GameProps } from '@/games/registry';
import { GameClient, ROOM_GONE_MESSAGE } from '@/games/codenames/net/client';
import { GameHost, makeRoomCode } from '@/games/codenames/net/host';
import { loadProfile, saveProfile } from '@/shared/identity';
import { clearSession, loadSession } from '@/games/codenames/net/persistence';
import { isMuted, setMuted, useCodenamesSounds } from '@/games/codenames/sound';
import { useWakeLock } from '@/shared/useWakeLock';
import { TopBar } from '@/shared/components/TopBar';
import { Toast } from '@/shared/components/Toast';
import { useGameSession } from '@/shared/useGameSession';
import { ClientMessage, PlayerView } from '@/games/codenames/engine/types';
import Home from '@/games/codenames/ui/Home';
import Lobby from '@/games/codenames/ui/Lobby';
import Table from '@/games/codenames/ui/Table';
import GameOver from '@/games/codenames/ui/GameOver';
import '@/games/codenames/codenames.css';

export default function CodenamesGame({ params }: GameProps) {
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
  useCodenamesSounds(view);
  // Hold the lock only during active play — lobby idles and the podium can rest.
  useWakeLock(view !== null && view.phase !== 'lobby' && view.phase !== 'gameOver');

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
    case 'clue':
    case 'guessing':
      screen = <Table view={view} send={send} />;
      break;
    case 'gameOver':
      screen = <GameOver view={view} send={send} />;
      break;
  }

  const turnLabel =
    view.phase === 'lobby'
      ? ''
      : view.phase === 'gameOver'
        ? ` · ${view.winner === 'red' ? 'Red' : 'Blue'} wins`
        : ` · ${view.turn?.team === 'red' ? 'Red' : 'Blue'} to play`;

  const announcement = (() => {
    switch (view.phase) {
      case 'lobby':
        return `Lobby. ${view.players.length} players in the room.`;
      case 'clue':
        if (view.me.team !== view.turn?.team) return `Waiting on ${view.turn?.team} to play.`;
        return view.me.isSpymaster
          ? 'Your turn to give a clue.'
          : 'Your spymaster is thinking of a clue.';
      case 'guessing': {
        const clue = view.turn?.clue;
        const clueText = clue
          ? `${clue.word} ${clue.number === 'unlimited' ? 'unlimited' : clue.number}`
          : '';
        return view.me.team === view.turn?.team
          ? `Your turn to guess. The clue is ${clueText}.`
          : `The other team is guessing. Their clue is ${clueText}.`;
      }
      case 'gameOver':
        return view.winner === 'red' ? 'Red wins.' : 'Blue wins.';
    }
  })();

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <TopBar
        title="Codenames"
        phaseLabel={turnLabel}
        muted={session.muted}
        onToggleMute={session.toggleMute}
        isHost={view.me.isHost}
      />
      <Toast message={session.error} onDismiss={session.dismissError} />
      <AnimatePresence initial={false}>
        <m.div
          // Stable across guesses — remount only on phase/team/clue changes so
          // correct guesses update the board in place instead of replaying the
          // whole enter/exit + stagger sequence.
          key={
            view.phase === 'gameOver'
              ? 'gameOver'
              : `${view.phase}-${view.turn?.team}-${view.turn?.clue?.word ?? 'noclue'}`
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
