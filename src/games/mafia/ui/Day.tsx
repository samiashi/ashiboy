import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, springGentle, staggerParent } from '@/anim';
import { playSound } from '@/games/mafia/sound';
import { CountdownRing } from '@/shared/components/CountdownRing';

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
          <m.div variants={fadeUp}>
            <CountdownRing
              endsAt={view.discussionEndsAt}
              totalSeconds={view.discussionDurationSec ?? 0}
              size={128}
              onExpire={() => send({ t: 'advance' })}
              onTick={() => playSound('tick')}
            />
            {view.me.isHost && (
              <div className="center" style={{ marginTop: 10 }}>
                <button
                  className="btn btn-ghost btn-mini"
                  onClick={() => send({ t: 'extendDiscussion' })}
                >
                  +1:00
                </button>
              </div>
            )}
          </m.div>
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
            {view.skipsVote ? `Continue to night ${view.round + 1}` : 'Start the vote'}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            {view.skipsVote
              ? `Waiting for ${hostName} to end the discussion…`
              : `Waiting for ${hostName} to start the vote…`}
          </m.p>
        )}
      </m.div>
      {investigationCard}
    </div>
  );
}
