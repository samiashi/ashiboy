import { motion } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, springGentle, staggerParent } from '@/anim';

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
    <motion.div
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
    </motion.div>
  );

  if (view.phase === 'dayReveal') {
    return (
      <div className="app">
        <motion.article
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
        </motion.article>

        <motion.div
          className="card center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.12 }}
        >
          {view.me.isHost ? (
            <motion.button
              className="btn btn-primary"
              onClick={() => send({ t: 'advance' })}
              whileTap={{ scale: 0.97 }}
            >
              Start the discussion
            </motion.button>
          ) : (
            <p className="muted">Waiting for {hostName}…</p>
          )}
        </motion.div>
        {investigationCard}
      </div>
    );
  }

  return (
    <div className="app">
      <motion.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <motion.h1 className="title-sm center" variants={fadeUp}>
          Discussion
        </motion.h1>
        <motion.p className="muted center" variants={fadeUp}>
          Talk it out. Who's acting suspicious? Who's defending whom?
        </motion.p>
        <ul className="player-list">
          {alive.map((p) => (
            <motion.li key={p.id} className="player-row" variants={fadeUp}>
              <span>
                <span className="avatar">{p.avatar}</span>
                {p.name}
                {p.id === view.me.id && <span className="muted"> (you)</span>}
              </span>
            </motion.li>
          ))}
        </ul>
        {view.me.isHost ? (
          <motion.button
            className="btn btn-primary"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Start the vote
          </motion.button>
        ) : (
          <motion.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to start the vote…
          </motion.p>
        )}
      </motion.div>
      {investigationCard}
    </div>
  );
}
