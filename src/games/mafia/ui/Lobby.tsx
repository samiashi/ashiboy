import { useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { suggestConfig } from '@/games/mafia/engine/engine';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { formatClock } from '@/shared/format';
import { CheckRow } from '@/shared/components/CheckRow';
import { PresetRow } from '@/shared/components/PresetRow';
import { RoomCodeCard } from '@/shared/components/RoomCodeCard';
import { Stepper } from '@/shared/components/Stepper';

interface Props {
  view: PlayerView;
  roomCode: string;
  send(msg: ClientMessage): void;
}

const DISCUSSION_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '1:00', seconds: 60 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
  { label: '5:00', seconds: 300 },
];

export default function Lobby({ view, roomCode, send }: Props) {
  const isHost = view.me.isHost;
  const n = view.players.length;
  const config = view.config!;
  const maxMafia = Math.max(1, n - 2);
  const mafia = Math.min(config.mafiaCount, maxMafia);
  const town = n - mafia;
  const specials = (config.hasDetective ? 1 : 0) + (config.hasDoctor ? 1 : 0);
  const villagers = Math.max(0, town - Math.min(specials, town));
  const canStart = n >= 3;

  // Derive the game path from the current hash so a slug rename in
  // registry.ts can't silently break invites/QRs.
  const inviteLink = useMemo(() => {
    const hashBase = location.hash.split('?')[0].replace(/^#/, '') || '/mafia';
    return `${location.origin}${location.pathname}#${hashBase}?join=${roomCode}`;
  }, [roomCode]);

  const setDiscussion = (seconds: number) =>
    send({ t: 'setConfig', config: { ...config, discussionSeconds: seconds } });

  const setMafia = (delta: number) =>
    send({
      t: 'setConfig',
      config: { ...config, mafiaCount: Math.min(maxMafia, Math.max(1, mafia + delta)) },
    });

  return (
    <div className="app">
      <RoomCodeCard roomCode={roomCode} inviteLink={inviteLink} />

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Players ({n})
        </m.h2>
        <ul className="player-list">
          <AnimatePresence initial={false}>
            {view.players.map((p) => (
              <m.li
                key={p.id}
                className={`player-row${p.connected ? '' : ' player-offline'}`}
                variants={fadeUp}
                // Transform/opacity only — no `layout` FLIP measurement per row.
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
            <m.div className="stepper-row" variants={fadeUp}>
              <span id="mafia-count-label">Mafia</span>
              <Stepper
                value={mafia}
                label="mafia count"
                onMinus={() => setMafia(-1)}
                onPlus={() => setMafia(1)}
                minusDisabled={mafia <= 1}
                plusDisabled={mafia >= maxMafia}
              />
            </m.div>
            <m.div variants={fadeUp}>
              <CheckRow
                checked={config.hasDetective}
                onChange={(v) => send({ t: 'setConfig', config: { ...config, hasDetective: v } })}
              >
                Detective
              </CheckRow>
            </m.div>
            <m.div variants={fadeUp}>
              <CheckRow
                checked={config.hasDoctor}
                onChange={(v) => send({ t: 'setConfig', config: { ...config, hasDoctor: v } })}
              >
                Doctor
              </CheckRow>
            </m.div>
            <m.div variants={fadeUp}>
              <CheckRow
                checked={config.skipFirstVote}
                onChange={(v) => send({ t: 'setConfig', config: { ...config, skipFirstVote: v } })}
              >
                Skip the Day 1 vote
              </CheckRow>
            </m.div>
            <m.p className="muted picker-label" variants={fadeUp}>
              Discussion timer
            </m.p>
            <m.div variants={fadeUp}>
              <PresetRow
                ariaLabel="Discussion timer"
                options={DISCUSSION_PRESETS.map((p) => ({ label: p.label, value: p.seconds }))}
                value={config.discussionSeconds}
                onSelect={setDiscussion}
              />
            </m.div>
          </>
        ) : null}
        <m.p className="muted setup-summary" variants={fadeUp}>
          {mafia} mafia
          {config.hasDetective && specials <= town ? ', 1 detective' : ''}
          {config.hasDoctor && specials <= town ? ', 1 doctor' : ''}
          {villagers > 0 ? `, ${villagers} villager${villagers === 1 ? '' : 's'}` : ''} ·{' '}
          {config.discussionSeconds > 0
            ? `${formatClock(config.discussionSeconds)} discussion`
            : 'untimed discussion'}{' '}
          {config.skipFirstVote ? ' · no vote on day 1' : ''} · suggested for {n}:{' '}
          {suggestConfig(n).mafiaCount} mafia
        </m.p>
        {isHost ? (
          <m.button
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => send({ t: 'start' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            {canStart
              ? 'Deal roles & start'
              : `Need at least ${3 - n} more player${3 - n === 1 ? '' : 's'}`}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for the host to start
            <span className="dots" aria-hidden="true">
              …
            </span>
          </m.p>
        )}
      </m.div>
    </div>
  );
}
