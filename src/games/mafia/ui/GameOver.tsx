import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';
import { ROLE_INFO } from '@/games/mafia/ui/roles';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

const ROLE_PILL: Record<string, string> = {
  mafia: 'role-pill-mafia',
  detective: 'role-pill-detective',
  doctor: 'role-pill-doctor',
  villager: 'role-pill-villager',
};

export default function GameOver({ view, send }: Props) {
  const mafiaWon = view.winner === 'mafia';
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';

  return (
    <div className="app">
      <div
        className={`card center gameover-banner ${mafiaWon ? 'gameover-mafia' : 'gameover-town'}`}
      >
        <div className="rays" aria-hidden="true" />
        <m.h1
          className="title winner-title"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        >
          {mafiaWon ? 'The Mafia wins' : 'The Town wins'}
        </m.h1>
        <m.p
          className="muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {mafiaWon
            ? 'The mafia has taken over the town.'
            : 'Every last mafioso has been brought to justice.'}
        </m.p>
      </div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Full reveal
        </m.h2>
        <ul className="player-list">
          {view.players.map((p) => {
            const role = view.allRoles?.[p.id];
            return (
              <m.li key={p.id} className="player-row" variants={fadeUp}>
                <span>
                  <span className="avatar">{p.avatar}</span>
                  {p.name}
                  {p.id === view.me.id && <span className="muted"> (you)</span>}
                </span>
                {role && (
                  <span className={`pill ${ROLE_PILL[role]}`}>
                    <span className={ROLE_INFO[role].cssClass}>{ROLE_INFO[role].label}</span>
                  </span>
                )}
              </m.li>
            );
          })}
        </ul>
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'playAgain' })}
            variants={popIn}
            whileTap={{ scale: 0.97 }}
          >
            Play again with the same group
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to start a new game…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
