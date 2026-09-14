import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

function nameOf(list: { id: string; name: string }[] | undefined, id: string): string {
  return list?.find((x) => x.id === id)?.name ?? id;
}

export default function GameOver({ view, send }: Props) {
  const solved = view.winner === 'solved';
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const solution = view.solution;

  return (
    <div className="app">
      <div className={`card center gameover-banner gameover-${solved ? 'solved' : 'cold'}`}>
        <div className="rays" aria-hidden="true" />
        <m.h1
          className={`title winner-title winner-${solved ? 'solved' : 'cold'}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        >
          {solved ? 'Case solved' : 'Trail goes cold'}
        </m.h1>
        <m.p
          className="muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {solved
            ? 'The team cracks it.'
            : 'No verdicts left. The file stays open… but here is what really happened.'}
        </m.p>
        {solved && view.stars && (
          <m.div
            className="star-row"
            aria-label={`${view.stars} out of 3 stars`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {[1, 2, 3].map((i) => (
              <m.span
                key={i}
                className={i <= view.stars! ? 'star-lit' : 'star-dim'}
                aria-hidden="true"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.45 + i * 0.16, type: 'spring', stiffness: 320, damping: 13 }}
              >
                ★
              </m.span>
            ))}
          </m.div>
        )}
      </div>

      {solution && (
        <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
          <m.h2 className="section-title" variants={fadeUp}>
            The truth
          </m.h2>
          <div className="truth-tags">
            <m.p className="truth-tag" variants={fadeUp}>
              <span className="muted">Killer</span>
              <strong>{nameOf(view.suspects, solution.suspectId)}</strong>
            </m.p>
            <m.p className="truth-tag" variants={fadeUp}>
              <span className="muted">Weapon</span>
              <strong>{nameOf(view.weapons, solution.weaponId)}</strong>
            </m.p>
            <m.p className="truth-tag" variants={fadeUp}>
              <span className="muted">Scene</span>
              <strong>{nameOf(view.locations, solution.locationId)}</strong>
            </m.p>
          </div>
        </m.div>
      )}

      {(view.attempts ?? []).length > 0 && (
        <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
          <m.h2 className="section-title" variants={fadeUp}>
            How the verdicts went
          </m.h2>
          {(view.attempts ?? []).map((a, i) => (
            <m.p key={i} className="muted" variants={fadeUp}>
              {a.playerName} named {nameOf(view.suspects, a.suspectId)} ·{' '}
              {nameOf(view.weapons, a.weaponId)} · {nameOf(view.locations, a.locationId)} —{' '}
              {a.correct ? 'correct!' : 'missed.'}
            </m.p>
          ))}
        </m.div>
      )}

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Investigators
        </m.h2>
        <ul className="player-list">
          {view.players.map((p) => (
            <m.li key={p.id} className="player-row" variants={fadeUp}>
              <span>
                <span className="avatar">{p.avatar}</span>
                {p.name}
                {p.id === view.me.id && <span className="muted"> (you)</span>}
              </span>
              <span className="row-end">{p.isHost && <span className="pill">host</span>}</span>
            </m.li>
          ))}
        </ul>
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'playAgain' })}
            variants={popIn}
            whileTap={{ scale: 0.97 }}
          >
            Open a new case
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to open a new case…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
