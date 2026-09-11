import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import QRCode from 'react-qr-code';
import { suggestConfig } from '@/games/mafia/engine/engine';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';

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

function formatClock(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

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
  const [copied, setCopied] = useState(false);

  const inviteLink = `${location.origin}${location.pathname}#/mafia?join=${roomCode}`;

  const setDiscussion = (seconds: number) =>
    send({ t: 'setConfig', config: { ...config, discussionSeconds: seconds } });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (non-secure context) — the code is visible anyway
    }
  };

  const setMafia = (delta: number) =>
    send({
      t: 'setConfig',
      config: { ...config, mafiaCount: Math.min(maxMafia, Math.max(1, mafia + delta)) },
    });

  return (
    <div className="app">
      <m.div className="card card-luxe center" variants={popIn} initial="hidden" animate="show">
        <p className="eyebrow">Room code — share it with everyone</p>
        <p className="big-code">{roomCode}</p>
        <div className="qr-box">
          <QRCode value={inviteLink} size={148} bgColor="#f3e9d0" fgColor="#241d12" />
        </div>
        <button className="btn btn-ghost" onClick={copyLink}>
          {copied ? 'Copied to clipboard!' : 'Copy invite link'}
        </button>
      </m.div>

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
                exit={{ opacity: 0, x: -20 }}
                layout
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
              <span>Mafia</span>
              <div className="stepper">
                <m.button
                  className="btn btn-small"
                  onClick={() => setMafia(-1)}
                  disabled={mafia <= 1}
                  whileTap={{ scale: 0.9 }}
                >
                  −
                </m.button>
                <span className="stepper-value">{mafia}</span>
                <m.button
                  className="btn btn-small"
                  onClick={() => setMafia(1)}
                  disabled={mafia >= maxMafia}
                  whileTap={{ scale: 0.9 }}
                >
                  +
                </m.button>
              </div>
            </m.div>
            <m.label className="check-row" variants={fadeUp}>
              <input
                type="checkbox"
                checked={config.hasDetective}
                onChange={(e) =>
                  send({ t: 'setConfig', config: { ...config, hasDetective: e.target.checked } })
                }
              />
              Detective
            </m.label>
            <m.label className="check-row" variants={fadeUp}>
              <input
                type="checkbox"
                checked={config.hasDoctor}
                onChange={(e) =>
                  send({ t: 'setConfig', config: { ...config, hasDoctor: e.target.checked } })
                }
              />
              Doctor
            </m.label>
            <m.label className="check-row" variants={fadeUp}>
              <input
                type="checkbox"
                checked={config.skipFirstVote}
                onChange={(e) =>
                  send({ t: 'setConfig', config: { ...config, skipFirstVote: e.target.checked } })
                }
              />
              Skip the Day 1 vote
            </m.label>
            <m.p className="muted picker-label" variants={fadeUp}>
              Discussion timer
            </m.p>
            <m.div className="preset-row" variants={fadeUp}>
              {DISCUSSION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={`pill-btn${config.discussionSeconds === preset.seconds ? ' pill-btn-selected' : ''}`}
                  onClick={() => setDiscussion(preset.seconds)}
                >
                  {preset.label}
                </button>
              ))}
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
