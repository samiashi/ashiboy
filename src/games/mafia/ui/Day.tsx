import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, springGentle, staggerParent } from '@/anim';
import { playSound } from '@/games/mafia/sound';

function formatClock(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/**
 * Live countdown to the discussion deadline. Every device runs its own
 * ticker from the host-set deadline; the first expiry trigger wins (the
 * engine ignores the rest). Ticks softly through the final five seconds.
 */
function Countdown({
  endsAt,
  totalSeconds,
  isHost,
  onExpire,
  onExtend,
}: {
  endsAt: number;
  totalSeconds: number;
  isHost: boolean;
  onExpire(): void;
  onExtend(): void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const lastTick = useRef(Number.POSITIVE_INFINITY);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (remainingMs <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [remainingMs, onExpire]);

  useEffect(() => {
    if (remainingSec <= 5 && remainingSec > 0 && remainingSec < lastTick.current) {
      lastTick.current = remainingSec;
      playSound('tick');
    }
  }, [remainingSec]);

  const totalMs = Math.max(1, totalSeconds * 1000);
  const fraction = Math.min(1, remainingMs / totalMs);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const late = remainingSec <= 10;

  return (
    <m.div className={`countdown${late ? ' countdown-late' : ''}`} variants={fadeUp}>
      <div
        className="countdown-ring"
        role="timer"
        aria-label={`${formatClock(remainingSec)} left to discuss`}
      >
        <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r={radius} className="countdown-track" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="countdown-fill"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        </svg>
        <span className="countdown-time">{formatClock(remainingSec)}</span>
      </div>
      {isHost && (
        <button className="btn btn-ghost btn-mini" onClick={onExtend}>
          +1:00
        </button>
      )}
    </m.div>
  );
}

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Handles both 'dayReveal' (who died last night) and 'discussion' phases. */
export default function Day({ view, send }: Props) {
  const nameOf = (id?: string) => view.players.find((p) => p.id === id)?.name ?? '—';
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const diedId = view.lastNight?.diedId;
  const alive = view.players.filter((p) => p.alive);

  const investigationCard = view.investigation && (
    <m.div
      className="card investigation"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
    >
      <p className="muted">Your investigation:</p>
      <p>
        <strong>{nameOf(view.investigation.targetId)}</strong>{' '}
        {view.investigation.isMafia ? 'IS a member of the mafia.' : 'is NOT mafia.'}
      </p>
    </m.div>
  );

  if (view.phase === 'dayReveal') {
    return (
      <div className="app">
        <m.article
          className="gazette"
          initial={{ opacity: 0, y: 30, rotate: -2.5 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          transition={springGentle}
        >
          <div className="gazette-masthead">The Morning Gazette</div>
          <p className="gazette-dateline">Night {view.round} edition · Town of Ashiboy</p>
          <h1 className="gazette-headline">
            {diedId ? (
              <>
                {nameOf(diedId)} <span className="gazette-name">found dead!</span>
              </>
            ) : (
              'Quiet night in town'
            )}
          </h1>
          <p className="gazette-sub">
            {diedId
              ? 'The town mourns. The mafia walks among us.'
              : 'No incidents reported. Stay vigilant.'}
          </p>
        </m.article>

        <m.div
          className="card center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.12 }}
        >
          {view.me.isHost ? (
            <m.button
              className="btn btn-primary"
              onClick={() => send({ t: 'advance' })}
              whileTap={{ scale: 0.97 }}
            >
              Start the discussion
            </m.button>
          ) : (
            <p className="muted">Waiting for {hostName}…</p>
          )}
        </m.div>
        {investigationCard}
      </div>
    );
  }

  return (
    <div className="app">
      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h1 className="title-sm center" variants={fadeUp}>
          Discussion
        </m.h1>
        <m.p className="muted center" variants={fadeUp}>
          Talk it out. Who's acting suspicious? Who's defending whom?
        </m.p>
        {view.discussionEndsAt !== undefined && (
          <Countdown
            endsAt={view.discussionEndsAt}
            totalSeconds={view.discussionDurationSec ?? 0}
            isHost={view.me.isHost}
            onExpire={() => send({ t: 'advance' })}
            onExtend={() => send({ t: 'extendDiscussion' })}
          />
        )}
        <ul className="player-list">
          {alive.map((p) => (
            <m.li key={p.id} className="player-row" variants={fadeUp}>
              <span>
                <span className="avatar">{p.avatar}</span>
                {p.name}
                {p.id === view.me.id && <span className="muted"> (you)</span>}
              </span>
            </m.li>
          ))}
        </ul>
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Start the vote
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to start the vote…
          </m.p>
        )}
      </m.div>
      {investigationCard}
    </div>
  );
}
