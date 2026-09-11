import { m } from 'motion/react';
import { ClientMessage, PlayerView, Team } from '@/games/codenames/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

const ROLE_PILL: Record<string, string> = {
  red: 'role-pill-red',
  blue: 'role-pill-blue',
};

function teamLabel(team: Team): string {
  return team === 'red' ? 'Red' : 'Blue';
}

export default function GameOver({ view, send }: Props) {
  const winner = view.winner ?? 'red';
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';

  return (
    <div className="app">
      <div className={`card center gameover-banner gameover-${winner}`}>
        <div className="rays" aria-hidden="true" />
        <m.h1
          className={`title winner-title winner-${winner}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        >
          {teamLabel(winner)} wins
        </m.h1>
        <m.p
          className="muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          All {teamLabel(winner).toLowerCase()} agents contacted. Case closed.
        </m.p>
      </div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Full key
        </m.h2>
        <ul className="player-list">
          {view.players.map((p) => (
            <m.li key={p.id} className="player-row" variants={fadeUp}>
              <span>
                <span className="avatar">{p.avatar}</span>
                {p.name}
                {p.id === view.me.id && <span className="muted"> (you)</span>}
              </span>
              <span className="row-end">
                {p.team && <span className={`pill ${ROLE_PILL[p.team]}`}>{p.team}</span>}
                {p.isSpymaster && <span className="pill">spy</span>}
              </span>
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
            Rematch — same teams
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to deal again…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
