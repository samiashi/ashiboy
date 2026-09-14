import { useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/games/hottake/engine/engine';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { formatClock } from '@/shared/format';
import { PresetRow } from '@/shared/components/PresetRow';
import { RoomCodeCard } from '@/shared/components/RoomCodeCard';
import { Stepper } from '@/shared/components/Stepper';

interface Props {
  view: PlayerView;
  roomCode: string;
  send(msg: ClientMessage): void;
}

const ANSWER_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '0:30', seconds: 30 },
  { label: '1:00', seconds: 60 },
  { label: '2:00', seconds: 120 },
  { label: '5:00', seconds: 300 },
];

const VOTE_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '0:15', seconds: 15 },
  { label: '0:30', seconds: 30 },
  { label: '1:00', seconds: 60 },
];

/** Why the game can't start yet (mirrors the engine's start validation). */
function blockers(view: PlayerView): string[] {
  if (view.players.length < MIN_PLAYERS) {
    const missing = MIN_PLAYERS - view.players.length;
    return [`Need ${missing} more player${missing === 1 ? '' : 's'}`];
  }
  return [];
}

export default function Lobby({ view, roomCode, send }: Props) {
  const isHost = view.me.isHost;
  const config = view.config!;
  const problems = useMemo(() => blockers(view), [view]);
  const inviteLink = useMemo(() => {
    const hashBase = location.hash.split('?')[0].replace(/^#/, '') || '/hottake';
    return `${location.origin}${location.pathname}#${hashBase}?join=${roomCode}`;
  }, [roomCode]);

  return (
    <div className="app">
      <RoomCodeCard roomCode={roomCode} inviteLink={inviteLink} />

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Writers ({view.players.length}/{MAX_PLAYERS})
        </m.h2>
        <ul className="player-list">
          <AnimatePresence initial={false}>
            {view.players.map((p) => (
              <m.li
                key={p.id}
                className={`player-row${p.connected ? '' : ' player-offline'}`}
                variants={fadeUp}
                exit={{ opacity: 0, x: -20 }}
              >
                <span>
                  <span className="avatar">{p.avatar}</span>
                  {p.name}
                  {p.id === view.me.id && <span className="muted"> (you)</span>}
                </span>
                <span className="row-end">
                  {p.isHost && <span className="pill">host</span>}
                  {isHost && p.id !== view.me.id && (
                    <button
                      className="btn btn-ghost btn-mini"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => send({ t: 'remove', targetId: p.id })}
                    >
                      Remove
                    </button>
                  )}
                </span>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Setup
        </m.h2>
        {isHost ? (
          <>
            <m.div variants={fadeUp}>
              <p className="muted picker-label">Prompts per game</p>
              <Stepper
                value={config.promptsPerGame}
                label="prompts per game"
                onMinus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, promptsPerGame: config.promptsPerGame - 1 },
                  })
                }
                onPlus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, promptsPerGame: config.promptsPerGame + 1 },
                  })
                }
                minusDisabled={config.promptsPerGame <= 1}
                plusDisabled={config.promptsPerGame >= 5}
              />
            </m.div>
            <m.p className="muted picker-label" variants={fadeUp}>
              Answer timer
            </m.p>
            <m.div variants={fadeUp}>
              <PresetRow
                ariaLabel="Answer timer"
                options={ANSWER_PRESETS.map((p) => ({ label: p.label, value: p.seconds }))}
                value={config.answerSeconds}
                onSelect={(answerSeconds) =>
                  send({ t: 'setConfig', config: { ...config, answerSeconds } })
                }
              />
            </m.div>
            <m.p className="muted picker-label" variants={fadeUp}>
              Vote timer
            </m.p>
            <m.div variants={fadeUp}>
              <PresetRow
                ariaLabel="Vote timer"
                options={VOTE_PRESETS.map((p) => ({ label: p.label, value: p.seconds }))}
                value={config.voteSeconds}
                onSelect={(voteSeconds) =>
                  send({ t: 'setConfig', config: { ...config, voteSeconds } })
                }
              />
            </m.div>
          </>
        ) : null}
        <m.p className="muted setup-summary" variants={fadeUp}>
          {config.promptsPerGame} prompt{config.promptsPerGame === 1 ? '' : 's'} · 100 pts a vote ·{' '}
          {config.answerSeconds > 0
            ? `${formatClock(config.answerSeconds)} to write`
            : 'untimed writing'}
        </m.p>
        {isHost ? (
          <m.button
            className="btn btn-primary"
            disabled={problems.length > 0}
            onClick={() => send({ t: 'start' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            {problems.length > 0 ? problems[0] : 'Deal the prompts'}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for the host to deal…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
