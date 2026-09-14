import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { MIN_PLAYERS } from '@/games/mystery/engine/engine';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
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

const TIMER_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '1:00', seconds: 60 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
  { label: '5:00', seconds: 300 },
];

/** Why the case can't open yet (mirrors the engine's start validation). */
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
  const cases = view.cases ?? [];
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '');
  const problems = useMemo(() => blockers(view), [view]);
  const inviteLink = useMemo(() => {
    const hashBase = location.hash.split('?')[0].replace(/^#/, '') || '/mystery';
    return `${location.origin}${location.pathname}#${hashBase}?join=${roomCode}`;
  }, [roomCode]);
  const activeCaseId = cases.some((c) => c.id === caseId) ? caseId : (cases[0]?.id ?? '');

  return (
    <div className="app">
      <RoomCodeCard roomCode={roomCode} inviteLink={inviteLink} />

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Investigators ({view.players.length})
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
          The case file
        </m.h2>
        {isHost ? (
          <m.div variants={fadeUp}>
            <PresetRow<string>
              ariaLabel="Case file"
              options={cases.map((c) => ({ label: c.title, value: c.id }))}
              value={activeCaseId}
              onSelect={setCaseId}
            />
            {cases
              .filter((c) => c.id === activeCaseId)
              .map((c) => (
                <p key={c.id} className="muted">
                  Victim: {c.victim}
                </p>
              ))}
          </m.div>
        ) : (
          <m.p className="muted" variants={fadeUp}>
            The host is picking a case…
          </m.p>
        )}
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Setup
        </m.h2>
        {isHost ? (
          <>
            <m.div variants={fadeUp}>
              <p className="muted picker-label">Search tokens</p>
              <Stepper
                value={config.searchTokens}
                label="search tokens"
                onMinus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, searchTokens: config.searchTokens - 1 },
                  })
                }
                onPlus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, searchTokens: config.searchTokens + 1 },
                  })
                }
                minusDisabled={config.searchTokens <= 1}
                plusDisabled={config.searchTokens >= 12}
              />
            </m.div>
            <m.div variants={fadeUp}>
              <p className="muted picker-label">Pressure tokens</p>
              <Stepper
                value={config.pressureTokens}
                label="pressure tokens"
                onMinus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, pressureTokens: config.pressureTokens - 1 },
                  })
                }
                onPlus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, pressureTokens: config.pressureTokens + 1 },
                  })
                }
                minusDisabled={config.pressureTokens <= 1}
                plusDisabled={config.pressureTokens >= 6}
              />
            </m.div>
            <m.div variants={fadeUp}>
              <p className="muted picker-label">Verdict attempts</p>
              <Stepper
                value={config.accusationAttempts}
                label="verdict attempts"
                onMinus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, accusationAttempts: config.accusationAttempts - 1 },
                  })
                }
                onPlus={() =>
                  send({
                    t: 'setConfig',
                    config: { ...config, accusationAttempts: config.accusationAttempts + 1 },
                  })
                }
                minusDisabled={config.accusationAttempts <= 1}
                plusDisabled={config.accusationAttempts >= 3}
              />
            </m.div>
            <m.p className="muted picker-label" variants={fadeUp}>
              Search timer
            </m.p>
            <m.div variants={fadeUp}>
              <PresetRow
                ariaLabel="Search timer"
                options={TIMER_PRESETS.map((p) => ({ label: p.label, value: p.seconds }))}
                value={config.searchSeconds}
                onSelect={(searchSeconds) =>
                  send({ t: 'setConfig', config: { ...config, searchSeconds } })
                }
              />
            </m.div>
          </>
        ) : null}
        <m.p className="muted setup-summary" variants={fadeUp}>
          {config.searchTokens} searches · {config.pressureTokens} presses ·{' '}
          {config.accusationAttempts} verdicts ·{' '}
          {config.searchSeconds > 0
            ? `${formatClock(config.searchSeconds)} search`
            : 'untimed search'}
        </m.p>
        {isHost ? (
          <m.button
            className="btn btn-primary"
            disabled={problems.length > 0 || activeCaseId === ''}
            onClick={() => send({ t: 'start', caseId: activeCaseId })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            {problems.length > 0 ? problems[0] : 'Open the case file'}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for the host to open the case…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
