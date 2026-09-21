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
  const winner = view.winner;
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const assassinHit = (view.cards ?? []).some((c) => c.kind === 'assassin' && c.revealed);

  if (!winner) {
    return (
      <div className="app">
        <div className="card center">
          <h1 className="title-sm">Game over</h1>
          <p className="muted">The result didn&apos;t come through — ask the host to deal again.</p>
          {view.me.isHost && (
            <div className="gameover-actions">
              <button className="btn btn-primary" onClick={() => send({ t: 'playAgain' })}>
                Rematch — same teams
              </button>
              <button className="btn btn-ghost" onClick={() => send({ t: 'toLobby' })}>
                Change spymasters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          {assassinHit
            ? `The assassin was hit — ${teamLabel(winner).toLowerCase()} wins by default.`
            : `All ${teamLabel(winner).toLowerCase()} agents contacted. Case closed.`}
        </m.p>
      </div>

      {view.cards && view.cards.length > 0 && (
        <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
          <m.h2 className="section-title" variants={fadeUp}>
            Full key
          </m.h2>
          <div className="board">
            {view.cards.map((c, i) => (
              <div
                key={i}
                className={`word-card${c.revealed && c.kind ? ` word-covered-${c.kind}` : c.kind ? ` word-key-${c.kind}` : ''}`}
                aria-label={c.kind ? `${c.word}, ${c.kind}` : c.word}
              >
                {c.word}
              </div>
            ))}
          </div>
        </m.div>
      )}

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Teams
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
          <m.div
            className="gameover-actions"
            variants={staggerParent}
            initial="hidden"
            animate="show"
          >
            <m.button
              className="btn btn-primary"
              onClick={() => send({ t: 'playAgain' })}
              variants={popIn}
              whileTap={{ scale: 0.97 }}
            >
              Rematch — same teams
            </m.button>
            <m.button
              className="btn btn-ghost"
              onClick={() => send({ t: 'toLobby' })}
              variants={popIn}
              whileTap={{ scale: 0.97 }}
            >
              Change spymasters
            </m.button>
          </m.div>
        ) : (
          <>
            <m.p className="muted center" variants={fadeUp}>
              Waiting for {hostName} to deal again…
            </m.p>
            <m.p className="muted center gameover-hint" variants={fadeUp}>
              Want a new spymaster? The host can reopen the teams screen.
            </m.p>
          </>
        )}
      </m.div>
    </div>
  );
}
