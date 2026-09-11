import { motion } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, popIn, springGentle, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

export default function Voting({ view, send }: Props) {
  const playerOf = (id?: string | null) =>
    id == null ? null : view.players.find((p) => p.id === id);
  const nameOf = (id?: string | null) => (id == null ? 'abstain' : (playerOf(id)?.name ?? '—'));
  const alive = view.players.filter((p) => p.alive);
  const candidates = alive.filter((p) => p.id !== view.me.id);
  const votes = view.votes ?? {};
  const votedCount = alive.filter((p) => p.id in votes).length;
  const missing = alive.filter((p) => p.connected && !(p.id in votes)).length;

  // Live tally per candidate (excludes abstentions), sorted by votes.
  const counts = new Map<string, number>();
  for (const t of Object.values(votes)) {
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.length > 0 ? ranked[0][1] : 0;

  return (
    <div className="app">
      <motion.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <motion.h1 className="title-sm center" variants={fadeUp}>
          Vote
        </motion.h1>
        {view.me.alive ? (
          <>
            <motion.p className="muted center" variants={fadeUp}>
              Who should be eliminated? Votes are public.
            </motion.p>
            <motion.div className="grid" variants={staggerParent}>
              {candidates.map((p) => (
                <motion.button
                  key={p.id}
                  className={`chip${view.myVote === p.id ? ' chip-selected' : ''}`}
                  onClick={() => send({ t: 'vote', targetId: p.id })}
                  variants={popIn}
                  whileTap={{ scale: 0.94 }}
                >
                  <span className="avatar">{p.avatar}</span> {p.name}
                </motion.button>
              ))}
              <motion.button
                className={`chip chip-abstain${view.myVote === null ? ' chip-selected' : ''}`}
                onClick={() => send({ t: 'vote', targetId: null })}
                variants={popIn}
                whileTap={{ scale: 0.94 }}
              >
                Abstain
              </motion.button>
            </motion.div>
          </>
        ) : (
          <motion.p className="muted center" variants={fadeUp}>
            You were eliminated — watching the vote.
          </motion.p>
        )}
      </motion.div>

      {view.investigation && (
        <div className="card investigation">
          <p className="muted">Your investigation:</p>
          <p>
            <strong>{nameOf(view.investigation.targetId)}</strong>{' '}
            {view.investigation.isMafia ? 'IS a member of the mafia.' : 'is NOT mafia.'}
          </p>
        </div>
      )}

      <motion.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <motion.h2 className="section-title" variants={fadeUp}>
          Ballot ({votedCount}/{alive.length})
        </motion.h2>
        <ul className="player-list">
          {alive.map((p) => (
            <motion.li key={p.id} className="player-row" variants={fadeUp}>
              <span>
                <span className="avatar">{p.avatar}</span>
                {p.name}
              </span>
              <span className="muted">{p.id in votes ? `→ ${nameOf(votes[p.id])}` : '…'}</span>
            </motion.li>
          ))}
        </ul>
        {view.me.isHost && missing > 0 && (
          <motion.button
            className="btn btn-ghost btn-small"
            onClick={() => send({ t: 'closeVote' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Stalled? Close the vote now ({missing} missing)
          </motion.button>
        )}
        {ranked.length > 0 && (
          <motion.div className="tally" variants={fadeUp}>
            {ranked.map(([id, count]) => {
              const target = playerOf(id);
              return (
                <div className="tally-row" key={id}>
                  <div className="tally-label">
                    <span>
                      <span className="avatar">{target?.avatar}</span>
                      {target?.name}
                    </span>
                    <span className="tally-count">{count}</span>
                  </div>
                  <div className="tally-track">
                    <motion.div
                      className="tally-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${top > 0 ? (count / top) * 100 : 0}%` }}
                      transition={springGentle}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
